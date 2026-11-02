import {prisma} from '@/lib/prisma';
import {EMPLOYER_COOKIE,employerCookie,secretHash} from '@/lib/employer-auth.mjs';
import {employerJson,sameEmployerOrigin} from '@/lib/employer-server';
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 const token=employerCookie(request);if(token)await prisma.employerSession.deleteMany({where:{tokenHash:secretHash(token)}});
 const response=employerJson({ok:true});response.cookies.set(EMPLOYER_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});return response;
}
