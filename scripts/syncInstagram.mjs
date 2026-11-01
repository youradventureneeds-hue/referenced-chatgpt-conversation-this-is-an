import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';
import {createInstagramClient,instagramLead} from '../lib/instagram-collector.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{write:{type:'boolean',default:false},username:{type:'string'},limit:{type:'string',default:'25'},report:{type:'string'}}});
for(const name of ['.env','.env.local']){const p=path.join(root,name);if(fs.existsSync(p))process.loadEnvFile(p);}
const token=process.env.INSTAGRAM_ACCESS_TOKEN,accountId=process.env.INSTAGRAM_ACCOUNT_ID,version=process.env.INSTAGRAM_API_VERSION;
const config=JSON.parse(fs.readFileSync(path.join(root,'data/instagram-sources.json'),'utf8'));
const stateFile=path.join(root,'work/instagram-cursor.json');
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{cursor:0};
const limit=Number(values.limit);if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Limit must be between 1 and 100');
const report={startedAt:new Date().toISOString(),mode:values.write?'write':'preview',active:false,summary:{accounts:0,media:0,leads:0,queued:0,duplicates:0,errors:0},sources:[]};
let prisma;
const redact=value=>{let text=String(value);for(const secret of [token,process.env.ADMIN_REVIEW_KEY,process.env.DATABASE_URL].filter(s=>s?.length>10))text=text.replaceAll(secret,'[redacted]');return text.replace(/postgres(?:ql)?:\/\/\S+/g,'[database URL]');};
try{
 if(!token||!accountId||!version||!process.env.INSTAGRAM_USERNAME){report.setupRequired=['INSTAGRAM_ACCESS_TOKEN','INSTAGRAM_ACCOUNT_ID','INSTAGRAM_API_VERSION','INSTAGRAM_USERNAME'].filter(name=>!process.env[name]);throw Error('Instagram is not activated. Complete Meta authorization and configure the required secrets.');}
 if(values.write){
  const key=process.env.ADMIN_REVIEW_KEY;if(!key||key.length<32)throw Error('Configure the private administrator review key before saving Instagram leads');
  const base=process.env.APP_PUBLIC_URL||'https://indiabeyondbounds-india-beyond-bounds.vercel.app';
  if(new URL(base).protocol!=='https:')throw Error('The private review endpoint must use HTTPS');
  const email=process.env.PUBLIC_SUPPORT_EMAIL;if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Configure the public privacy and deletion contact email before importing');
  const privacy=await fetch(new URL('/privacy',base));if(!privacy.ok||!(await privacy.text()).includes(email))throw Error('Publish the privacy contact before importing Instagram content');
  const anonymous=await fetch(new URL('/api/intake',base));if(![401,403].includes(anonymous.status))throw Error('The website review endpoint must require administrator sign-in before importing');await anonymous.body?.cancel();
  const authenticated=await fetch(new URL('/api/intake',base),{headers:{Authorization:'Bearer '+key}});if(!authenticated.ok)throw Error('The administrator review key does not match the website configuration');await authenticated.body?.cancel();
  const {PrismaClient}=await import('@prisma/client');const {PrismaPg}=await import('@prisma/adapter-pg');prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
 }
 const client=createInstagramClient({accessToken:token,accountId,version,pages:1});
 const excluded=new Set((process.env.INSTAGRAM_EXCLUDED_USERNAMES||'').split(',').map(s=>s.trim().replace(/^@/,'').toLowerCase()).filter(Boolean));
 const managed=config.managed.filter(s=>s.enabled!==false).map(s=>({...s,username:s.usernameEnv?process.env[s.usernameEnv]:s.username})).filter(s=>!excluded.has(String(s.username).toLowerCase()));
 if(!managed.length)throw Error('Configure the managed Instagram account before running discovery');
 await client.identity(managed[0].username);
 let organizations=config.organizations.filter(s=>s.enabled!==false&&!excluded.has(s.username.toLowerCase()));
 if(values.username)organizations=organizations.filter(s=>s.username.toLowerCase()===values.username.replace(/^@/,'').toLowerCase());
 const start=values.username?0:(state.cursor||0)%Math.max(1,organizations.length);
 const chosen=Array.from({length:Math.min(limit,organizations.length)},(_,i)=>organizations[(start+i)%organizations.length]);
 const sources=[...managed.map(s=>({...s,kind:'managed'})),...chosen.map(s=>({...s,kind:'discovery'}))];
 for(const source of sources){
  const record={username:source.username,kind:source.kind,status:'ok',media:0,leads:0};report.summary.accounts++;
  try{
   const result=source.kind==='managed'?await client.managed(source):await client.discover(source);
   if(result.storyError){record.storyError=result.storyError;report.summary.errors++;}
   const org=prisma&&source.organizationSlug?await prisma.organization.findUnique({where:{slug:source.organizationSlug}}):null;
   record.media=result.media.length;report.summary.media+=result.media.length;
   for(const media of result.media){const lead=instagramLead(media,org);if(!lead)continue;record.leads++;report.summary.leads++;
    if(values.write){const existing=await prisma.opportunityIntake.findUnique({where:{fingerprint:lead.fingerprint}});if(existing){report.summary.duplicates++;continue;}await prisma.opportunityIntake.create({data:lead});report.summary.queued++;}
   }
  }catch(error){record.status='error';record.error=redact(error.message);report.summary.errors++;if(error.status===429||[4,17,32,613].includes(error.code)){report.rateLimited=true;report.sources.push(record);break;}}
  report.sources.push(record);
 }
 report.active=report.summary.media>0||report.summary.errors===0;
 if(!report.active)process.exitCode=1;
 if(values.write&&!report.rateLimited&&organizations.length){fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify({cursor:(start+chosen.length)%organizations.length,updatedAt:new Date().toISOString()}));}
}catch(error){report.error=redact(error.message);process.exitCode=2;}
finally{if(prisma)await prisma.$disconnect();report.completedAt=new Date().toISOString();const p=path.resolve(values.report||path.join(root,'work/instagram-report.json'));fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(report,null,2));console.log(JSON.stringify({active:report.active,mode:report.mode,summary:report.summary,setupRequired:report.setupRequired,error:report.error}));}
