import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {employerEmail} from '@/lib/employer-validation';
import {secretHash} from '@/lib/employer-auth.mjs';
import {authLimit,employerBody,employerJson,sameEmployerOrigin} from '@/lib/employer-server';
import {emailAvailable,sendAccountReset} from '@/lib/account-mail.mjs';
export const maxDuration=60;
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{const input=z.object({email:employerEmail}).safeParse(await employerBody(request));if(!input.success)return employerJson({error:'Enter a valid email address.'},400);
 if(!await authLimit(request,input.data.email,'password-email'))return employerJson({error:'Too many requests. Try again later.'},429);
 if(!await emailAvailable(prisma))return employerJson({error:'Password-reset email is temporarily unavailable. Please try again later.'},503);
 const user=await prisma.user.findUnique({where:{email:input.data.email},select:{id:true,role:true}});
 if(user?.role==='CANDIDATE'){
  const token=randomBytes(32).toString('base64url');
  await prisma.passwordReset.deleteMany({where:{userId:user.id,OR:[{expiresAt:{lte:new Date()}},{usedAt:{not:null}}]}});
  const reset=await prisma.passwordReset.create({data:{userId:user.id,tokenHash:secretHash(token),expiresAt:new Date(Date.now()+30*60000)}});
  try{await sendAccountReset(prisma,input.data.email,token);}catch{await prisma.passwordReset.deleteMany({where:{id:reset.id}});console.error('Candidate password-reset email delivery failed. Check the email service.');}
 }
 return employerJson({sent:true,message:'If a candidate account exists for that email, a password-reset link will arrive shortly. Check your spam folder too.'});
 }catch{return employerJson({error:'Could not request a password reset. Please try again.'},400);}
}
