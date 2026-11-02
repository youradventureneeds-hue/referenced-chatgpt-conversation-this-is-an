import {randomBytes} from 'node:crypto';
import {prisma} from '@/lib/prisma';
import {employerRecovery} from '@/lib/employer-validation';
import {recoveryMatches,hashPassword,secretHash,issueSession} from '@/lib/employer-auth.mjs';
import {employerJson,sameEmployerOrigin,sessionResponse,authLimit,employerBody} from '@/lib/employer-server';
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{const parsed=employerRecovery.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:parsed.error.issues[0]?.message||'Check your recovery details.'},400);const input=parsed.data;
 if(!await authLimit(request,input.email,'recover'))return employerJson({error:'Too many attempts. Please try again later.'},429);
 const user=await prisma.user.findUnique({where:{email:input.email},select:{id:true,role:true,recoveryHash:true}});if(!user||user.role!==input.role||!recoveryMatches(input.recoveryCode,user.recoveryHash))return employerJson({error:'Email or recovery code is incorrect.'},401);
 const passwordHash=await hashPassword(input.password),recoveryCode=randomBytes(32).toString('base64url');
 const token=await prisma.$transaction(async tx=>{const changed=await tx.user.updateMany({where:{id:user.id,recoveryHash:user.recoveryHash},data:{passwordHash,recoveryHash:secretHash(recoveryCode)}});if(changed.count!==1)throw Error('Recovery code already used');await tx.employerSession.deleteMany({where:{userId:user.id}});return issueSession(tx,user.id);},{timeout:15000});
 return sessionResponse({recoveryCode},token,200,input.role);
 }catch{return employerJson({error:'Could not recover the account. Please try again.'},400);}
}
