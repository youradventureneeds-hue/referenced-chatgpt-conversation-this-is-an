import {prisma} from '@/lib/prisma';
import {employerLogin} from '@/lib/employer-validation';
import {verifyPassword,issueSession} from '@/lib/employer-auth.mjs';
import {employerJson,sameEmployerOrigin,sessionResponse,authLimit,employerBody} from '@/lib/employer-server';
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{const parsed=employerLogin.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:'Enter your email and password.'},400);const input=parsed.data;
 if(!await authLimit(request,input.email,'login'))return employerJson({error:'Too many attempts. Please try again later.'},429);
 const user=await prisma.user.findUnique({where:{email:input.email},select:{id:true,name:true,email:true,role:true,passwordHash:true}});
 const valid=await verifyPassword(input.password,user?.passwordHash);if(!valid||user?.role!==input.role)return employerJson({error:'Email or password is incorrect.'},401);
 const token=await issueSession(prisma,user.id);return sessionResponse({user:{id:user.id,name:user.name,email:user.email,role:user.role}},token,200,input.role);
 }catch{return employerJson({error:'Could not sign in. Please try again.'},400);}
}
