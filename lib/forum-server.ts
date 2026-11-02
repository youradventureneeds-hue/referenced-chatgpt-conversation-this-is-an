import {prisma} from '@/lib/prisma';
import {accountCookie,candidateForToken,employerForToken,consumeEmployerLimit} from '@/lib/employer-auth.mjs';
import {authorizedAdmin} from '@/lib/admin-access';
import {createForum,ForumError} from '@/lib/forum.mjs';
import {z} from 'zod';
export const forum=createForum({db:prisma});
export const forumJson=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function forumFailure(e:unknown){if(e instanceof ForumError)return forumJson({error:e.message},e.status);if(e instanceof z.ZodError)return forumJson({error:e.issues[0]?.message||'Check your discussion details.'},400);if((e as {code?:string})?.code==='P2002')return forumJson({error:'This handle or submission already exists. Refresh before trying again.'},409);if((e as {code?:string})?.code==='P2025')return forumJson({error:'Discussion item not found.'},404);return forumJson({error:'The forum could not complete that request. Please try again.'},503);}
export async function forumUser(request:Request){return await candidateForToken(prisma,accountCookie(request,'CANDIDATE'))||await employerForToken(prisma,accountCookie(request,'EMPLOYER'));}
export async function forumViewer(request:Request){const user=await forumUser(request);const member=user?await prisma.forumMember.findUnique({where:{userId:user.id},select:{id:true,handle:true,suspendedAt:true}}):null;return {signedIn:Boolean(user),member:member?{id:member.id,handle:member.handle,suspended:Boolean(member.suspendedAt)}:null,isModerator:authorizedAdmin(request)};}
export async function forumActor(request:Request,scope:string,limit=30,windowMs=3600000,allowSuspended=false){
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new ForumError('Invalid request origin.',403);
 const user=await forumUser(request);if(!user)throw new ForumError('Sign in with a candidate or employer account to participate.',401);
 const member=await prisma.forumMember.findUnique({where:{userId:user.id},select:{id:true,suspendedAt:true}});if(member?.suspendedAt&&!allowSuspended)throw new ForumError('This forum account is suspended. Contact the site owner for help.',403);
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const [account,network]=await Promise.all([consumeEmployerLimit(prisma,'forum-'+scope,user.id,limit,windowMs),consumeEmployerLimit(prisma,'forum-network',ip,2000,3600000)]);if(!account||!network)throw new ForumError('You are posting too quickly. Please try again later.',429);
 return {userId:user.id,memberId:member?.id||null};
}
export async function forumBody(request:Request){const text=await request.text();if(text.length>20000)throw new ForumError('Your message is too long.');try{return JSON.parse(text);}catch{throw new ForumError('Check the discussion form and try again.');}}
export const forumId=z.string().min(1).max(100);
export const forumCategory=z.enum(['IDEAS','CAREERS','SKILLS','FIELD','GENERAL']);
export const topicInput=z.object({title:z.string().trim().min(8,'Give your discussion a title of at least 8 characters.').max(140),body:z.string().trim().min(10,'Add a little context to your discussion.').max(8000),category:forumCategory});
export const topicCreate=topicInput.extend({clientKey:z.string().uuid()});
export const replyInput=z.object({body:z.string().trim().min(2).max(4000)});
export const replyCreate=replyInput.extend({clientKey:z.string().uuid()});
export const listInput=z.object({page:z.coerce.number().int().min(1).max(1000).default(1),category:forumCategory.optional(),q:z.string().trim().max(100).default('')});
let cachedVersion=0,versionCheckedAt=0;
export async function forumVersion(){const stamp=Date.now();if(stamp-versionCheckedAt<1000)return cachedVersion;cachedVersion=await forum.version();versionCheckedAt=stamp;return cachedVersion;}
