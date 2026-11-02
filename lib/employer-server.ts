import {prisma} from '@/lib/prisma';
import {employerCookie,employerForToken,consumeEmployerLimit,EMPLOYER_COOKIE,SESSION_SECONDS} from '@/lib/employer-auth.mjs';
import {NextResponse} from 'next/server';
export const employerJson=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export const sameEmployerOrigin=(request:Request)=>request.headers.get('origin')===new URL(request.url).origin;
export const currentEmployer=(request:Request)=>employerForToken(prisma,employerCookie(request));
export function sessionResponse(body:unknown,token:string,status=200){const response=employerJson(body,status);response.cookies.set(EMPLOYER_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:SESSION_SECONDS});return response;}
export async function authLimit(request:Request,email:string,scope:string){const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const [network,account]=await Promise.all([consumeEmployerLimit(prisma,scope+'-ip',ip,scope==='register'?10:30,3600000),consumeEmployerLimit(prisma,scope+'-email',email,scope==='register'?5:10,15*60000)]);return network&&account;}
export async function employerBody(request:Request){const text=await request.text();if(text.length>30000)throw Error('Request too large');return JSON.parse(text);}
