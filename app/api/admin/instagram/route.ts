import {prisma} from '@/lib/prisma';
import {adminDenied} from '@/lib/admin-access';
import {createInstagramPlatform,instagramConnectionStatus,instagramSafeError} from '@/lib/instagram-platform.mjs';
import {z} from 'zod';
export const dynamic='force-dynamic';
export const maxDuration=60;
const platform=()=>createInstagramPlatform({db:prisma,encryptionKey:process.env.INSTAGRAM_ENCRYPTION_KEY});
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const url=z.string().url().max(1000).refine(v=>/^https?:\/\//.test(v),'Use an HTTP or HTTPS URL');
export async function GET(request:Request){
 const denied=adminDenied(request);if(denied)return denied;
 const s=await platform().settings();
 const [sources,runs,organizations]=await Promise.all([prisma.instagramSource.findMany({orderBy:{username:'asc'}}),prisma.instagramRun.findMany({orderBy:{createdAt:'desc'},take:10}),prisma.organization.findMany({select:{id:true,name:true,country:true},orderBy:{name:'asc'}})]);
 // Explicit fields only: encrypted credentials and lease secrets never leave the server.
 return json({settings:{username:s.username,accountId:s.accountId,apiVersion:s.apiVersion,enabled:s.enabled,country:s.country,intervalHours:s.intervalHours,nextRunAt:s.nextRunAt,lastHeartbeatAt:s.lastHeartbeatAt,lastSuccessAt:s.lastSuccessAt,lastError:s.lastError,...instagramConnectionStatus(s)},sources,runs,organizations});
}
export async function POST(request:Request){
 const denied=adminDenied(request);if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Same-origin request required'},403);
 if(Number(request.headers.get('content-length')||0)>20000)return json({error:'Request too large'},413);
 try{
 const body=await request.json();const p=platform();await p.settings();
 if(body.action==='connect'){
  const input=z.object({username:z.string().max(30),accountId:z.string().regex(/^\d+$/),apiVersion:z.string().regex(/^v\d{1,3}\.\d{1,2}$/),token:z.string().min(30).max(4096),resume:z.boolean().optional()}).parse(body);
  return json(await p.connect(input));
 }
 if(body.action==='settings'){
  const input=z.object({enabled:z.boolean(),country:z.enum(['India','ALL']),intervalHours:z.union([z.literal(6),z.literal(12),z.literal(24)])}).parse(body);
  const s=await p.settings();const c=instagramConnectionStatus(s);if(input.enabled&&(!c.connected||c.expired))return json({error:'Update the Instagram connection before enabling scans'},400);
  await prisma.instagramSettings.update({where:{id:'main'},data:{...input,nextRunAt:new Date()}});return json({saved:true});
 }
 if(body.action==='source'){
  const input=z.object({username:z.string().regex(/^@?[a-zA-Z0-9._]{1,30}$/).transform(v=>v.replace(/^@/,'').toLowerCase()),employerName:z.string().trim().min(2).max(150),country:z.string().trim().min(2).max(80),organizationId:z.string().max(100).nullable(),evidenceUrl:url,enabled:z.boolean()}).parse(body);
  if(input.organizationId&&!await prisma.organization.findUnique({where:{id:input.organizationId}}))return json({error:'Organization not found'},400);
  await prisma.instagramSource.upsert({where:{username:input.username},create:input,update:input});return json({saved:true});
 }
 if(body.action==='toggleSource'){
  const input=z.object({id:z.string().max(100),enabled:z.boolean()}).parse(body);await prisma.instagramSource.update({where:{id:input.id},data:{enabled:input.enabled}});return json({saved:true});
 }
 if(body.action==='organization'){
  const input=z.object({name:z.string().trim().min(2).max(150),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),country:z.string().trim().min(2).max(80),website:url,careersUrl:url,logoUrl:url.optional().or(z.literal('')),description:z.string().trim().refine(v=>v.split(/\s+/).length===60,'Write a 60-word overview')}).parse(body);
  const organization=await prisma.organization.create({data:{...input,logoUrl:input.logoUrl||null,verified:false}});return json({id:organization.id});
 }
 if(body.action==='run')return json({run:await p.enqueue()});
 if(body.action==='process'){const {id}=z.object({id:z.string().max(100)}).parse(body);return json(await p.processBatch(id,1));}
 return json({error:'Unknown action'},400);
 }catch(e){if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check the form fields'},400);if((e as {code?:string}).code==='P2002')return json({error:'That organization address already exists. Choose a different slug.'},409);return json({error:instagramSafeError(e)},400);}
}
