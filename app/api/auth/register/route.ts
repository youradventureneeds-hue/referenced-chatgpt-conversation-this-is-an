import {randomBytes} from 'node:crypto';
import {prisma} from '@/lib/prisma';
import {employerRegistration} from '@/lib/employer-validation';
import {hashPassword,secretHash,issueSession} from '@/lib/employer-auth.mjs';
import {employerJson,sameEmployerOrigin,sessionResponse,authLimit,employerBody} from '@/lib/employer-server';
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{const parsed=employerRegistration.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:parsed.error.issues[0]?.message||'Check your registration details.'},400);
 const input=parsed.data;if(!await authLimit(request,input.email,'register'))return employerJson({error:'Too many attempts. Please try again later.'},429);
 const passwordHash=await hashPassword(input.password),recoveryCode=randomBytes(32).toString('base64url');
 const result=await prisma.$transaction(async tx=>{const user=await tx.user.create({data:{name:input.name,email:input.email,passwordHash,recoveryHash:secretHash(recoveryCode),role:input.role,...(input.role==='CANDIDATE'?{candidateProfile:{create:{skills:[],certifications:[]}}}:{})},select:{id:true,name:true,email:true,role:true}});const token=await issueSession(tx,user.id);return {user,token};},{timeout:15000});
 return sessionResponse({user:result.user,recoveryCode},result.token,201,input.role);
 }catch(e){if((e as {code?:string}).code==='P2002')return employerJson({error:'An account could not be created with this email. Try signing in or recovering your account.'},409);return employerJson({error:'Could not create your account. Please try again.'},400);}
}
