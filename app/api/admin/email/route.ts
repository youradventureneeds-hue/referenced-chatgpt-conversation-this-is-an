import {prisma} from '@/lib/prisma';
import {adminDenied} from '@/lib/admin-access';
import {employerBody,employerJson,sameEmployerOrigin} from '@/lib/employer-server';
import {consumeEmployerLimit} from '@/lib/employer-auth.mjs';
import {ACCOUNT_SENDER,encryptMailPassword,gmailTransport} from '@/lib/account-mail.mjs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){const denied=adminDenied(request);if(denied)return denied;const config=await prisma.accountEmailSettings.findUnique({where:{id:'main'},select:{sender:true,verifiedAt:true}});return employerJson({connected:Boolean(config),sender:ACCOUNT_SENDER,verifiedAt:config?.verifiedAt||null});}
export async function POST(request:Request){
 const denied=adminDenied(request);if(denied)return denied;if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{if(!await consumeEmployerLimit(prisma,'email-connect','main',5,3600000))return employerJson({error:'Too many connection attempts. Try again later.'},429);
 const body=await employerBody(request);const password=typeof body.password==='string'?body.password.replace(/\s/g,''):'';
 if(!/^[a-zA-Z]{16}$/.test(password))return employerJson({error:'Enter the 16-character Google app password, not your normal Gmail password.'},400);
 const ciphertext=encryptMailPassword(password);const transport=gmailTransport(ACCOUNT_SENDER,password);
 try{await transport.verify();const result=await transport.sendMail({from:{name:'The Great Indian Outdoors',address:ACCOUNT_SENDER},to:ACCOUNT_SENDER,subject:'Website password-reset email connected',text:'Your website has successfully connected Gmail for candidate password-reset emails. Candidate reset links expire after 30 minutes and can be used once. If you did not connect this service, revoke the Outdoor website email app password in your Google account.',disableFileAccess:true,disableUrlAccess:true});if(!result.accepted?.length)throw Error('Not accepted');}finally{transport.close();}
 const verifiedAt=new Date();await prisma.accountEmailSettings.upsert({where:{id:'main'},create:{sender:ACCOUNT_SENDER,passwordCiphertext:ciphertext,verifiedAt},update:{sender:ACCOUNT_SENDER,passwordCiphertext:ciphertext,verifiedAt}});
 return employerJson({saved:true,sender:ACCOUNT_SENDER,verifiedAt});
 }catch{return employerJson({error:'Gmail could not verify and send the test email. Check the account, 2-Step Verification, and app password, then try again.'},400);}
}
