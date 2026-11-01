import fs from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {createInstagramPlatform,encryptInstagramToken} from '../lib/instagram-platform.mjs';
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:15000})});
const encryptionKey=process.env.INSTAGRAM_ENCRYPTION_KEY;
if(!encryptionKey||Buffer.from(encryptionKey,'base64url').length!==32)throw Error('Configure INSTAGRAM_ENCRYPTION_KEY');
const platform=createInstagramPlatform({db,encryptionKey});
try{
 if(process.argv.includes('--initialize')){
  const existing=await platform.settings();
  // Only bootstrap once. Later website connection updates take priority.
  if(!existing.tokenCiphertext&&process.env.INSTAGRAM_ACCESS_TOKEN)await db.instagramSettings.update({where:{id:'main'},data:{username:process.env.INSTAGRAM_USERNAME,accountId:process.env.INSTAGRAM_ACCOUNT_ID,apiVersion:process.env.INSTAGRAM_API_VERSION,tokenCiphertext:encryptInstagramToken(process.env.INSTAGRAM_ACCESS_TOKEN,encryptionKey)}});
  const organizations=await db.organization.findMany({select:{id:true,name:true,slug:true,country:true,website:true}});
  const global=JSON.parse(fs.readFileSync(new URL('../data/instagram-sources.json',import.meta.url),'utf8')).organizations;
  const india=JSON.parse(fs.readFileSync(new URL('../data/india-instagram-sources.json',import.meta.url),'utf8'));
  const records=new Map();
  for(const source of global){const org=organizations.find(o=>o.slug===source.organizationSlug);records.set(source.username,{username:source.username,employerName:org?.name||source.username,country:org?.country||'Not specified',organizationId:org?.id||null,evidenceUrl:source.evidenceUrls?.[0]||org?.website||null,enabled:source.enabled!==false});}
  for(const source of india){const org=organizations.find(o=>o.name.toLowerCase()===source.name.toLowerCase()||o.website&&source.evidenceUrl&&new URL(o.website).hostname.replace(/^www\./,'')===new URL(source.evidenceUrl).hostname.replace(/^www\./,''));records.set(source.username,{username:source.username,employerName:source.name,country:'India',organizationId:org?.id||null,evidenceUrl:source.evidenceUrl,enabled:true});}
  for(const record of records.values())await db.instagramSource.upsert({where:{username:record.username},create:record,update:{}});
  console.log(JSON.stringify({initialized:true,sources:records.size}));
 }
 if(process.argv.includes('--enable'))await db.instagramSettings.update({where:{id:'main'},data:{enabled:true,nextRunAt:new Date()}});
 for(let n=0;n<6;n++){const result=await platform.tick();console.log(JSON.stringify({idle:result.idle,busy:result.busy,error:result.error,run:result.run?{id:result.run.id,status:result.run.status,accounts:result.run.accounts,media:result.run.media,queued:result.run.queued,duplicates:result.run.duplicates,errors:result.run.errors}:null}));if(result.error||result.stopped||result.run?.status==='FAILED')process.exitCode=1;if(result.idle||result.busy||result.error||result.stopped||result.run&&!['RUNNING','QUEUED'].includes(result.run.status))break;}
}finally{await db.$disconnect();}
