import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {employerPassword} from '@/lib/employer-validation';
import {hashPassword,secretHash} from '@/lib/employer-auth.mjs';
import {authLimit,employerBody,employerJson,sameEmployerOrigin} from '@/lib/employer-server';
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{const parsed=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),password:employerPassword}).safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:'Use a valid reset link and a password of at least 12 characters.'},400);const input=parsed.data;
 if(!await authLimit(request,secretHash(input.token),'password-reset'))return employerJson({error:'Too many attempts. Try again later.'},429);
 const reset=await prisma.passwordReset.findUnique({where:{tokenHash:secretHash(input.token)},include:{user:{select:{id:true,role:true,passwordHash:true}}}});
 if(!reset||reset.usedAt||reset.expiresAt<=new Date()||reset.user.role!=='CANDIDATE')return employerJson({error:'This reset link has expired or was already used. Request a new email.'},400);
 const passwordHash=await hashPassword(input.password);
 await prisma.$transaction(async tx=>{
  const claimed=await tx.passwordReset.updateMany({where:{id:reset.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(claimed.count!==1)throw Error('Invalid reset');
  const changed=await tx.user.updateMany({where:{id:reset.userId,role:'CANDIDATE',passwordHash:reset.user.passwordHash},data:{passwordHash,recoveryHash:null}});if(changed.count!==1)throw Error('Invalid reset');
  await tx.employerSession.deleteMany({where:{userId:reset.userId}});await tx.passwordReset.deleteMany({where:{userId:reset.userId}});
 },{timeout:15000});return employerJson({reset:true});
 }catch{return employerJson({error:'This reset link could not be used. Request a new password-reset email.'},400);}
}
