import {prisma} from '@/lib/prisma';
import {accountCookieName,accountCookie,secretHash} from '@/lib/employer-auth.mjs';
import {employerJson,sameEmployerOrigin} from '@/lib/employer-server';
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 const body=await request.json().catch(()=>null);if(body?.role&& !['CANDIDATE','EMPLOYER'].includes(body.role))return employerJson({error:'Invalid account type.'},400);
 const role=body?.role==='CANDIDATE'?'CANDIDATE':'EMPLOYER',token=accountCookie(request,role);if(token)await prisma.employerSession.deleteMany({where:{tokenHash:secretHash(token),user:{role}}});
 const response=employerJson({ok:true});response.cookies.set(accountCookieName(role),'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});return response;
}
