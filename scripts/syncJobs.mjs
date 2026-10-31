import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createClient,crawlOrganization,assess,IMPORT_CHANNEL} from '../lib/job-scraper.mjs';
import {persistCandidate,reconcileMissing} from '../lib/job-sync.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{write:{type:'boolean',default:false},org:{type:'string'},catalog:{type:'string'},limit:{type:'string'},report:{type:'string'}}});
const catalog=values.catalog?JSON.parse(fs.readFileSync(path.resolve(root,values.catalog),'utf8')):null;
if(catalog&&(!Array.isArray(catalog)||catalog.some(r=>typeof r.slug!=='string')))throw Error('Catalog must be an organization array with slugs');
const limit=values.limit===undefined?undefined:Number(values.limit);
if(limit!==undefined&&(!Number.isInteger(limit)||limit<1))throw new Error('--limit must be a positive integer');
for(const name of ['.env','.env.local']){const file=path.join(root,name);if(fs.existsSync(file))process.loadEnvFile(file);}
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must be configured');
const {PrismaClient}=await import('@prisma/client');
const {PrismaPg}=await import('@prisma/adapter-pg');
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const report={startedAt:new Date().toISOString(),mode:values.write?'write':'preview',summary:{organizations:0,sourceErrors:0,skipped:0,candidates:0,validated:0,created:0,updated:0,needs_review:0,expired:0,archived:0},sources:[]};
const reportPath=path.resolve(values.report||path.join(root,'work/weekly-jobs-report.json'));
try{
 const organizations=await prisma.organization.findMany({where:{AND:[...(values.org?[{slug:values.org}]:[]),...(catalog?[{slug:{in:catalog.map(r=>r.slug)}}]:[])]},orderBy:{name:'asc'},...(limit?{take:limit}:{})});
 if(!organizations.length)throw new Error('No organizations matched');
 report.summary.organizations=organizations.length;
 const overrides=JSON.parse(fs.readFileSync(path.join(root,'data/job-sources.json'),'utf8'));
 const client=createClient();
 const queue=organizations.entries();
 await Promise.all(Array.from({length:3},async()=>{
  for(const [index,org] of queue){
   const source={organization:org.name,slug:org.slug,url:overrides[org.slug]?.url||org.careersUrl||org.website,jobs:[]};
   try{
    const result=await crawlOrganization(org,overrides[org.slug]||{},client);
    Object.assign(source,{status:result.status,warnings:result.warnings||[],reason:result.reason,completeFeed:result.complete,pages:result.pages});
    if(result.status==='skipped')report.summary.skipped++;
    for(const candidate of result.jobs){
     const assessment=assess(candidate);
     report.summary.candidates++;
     if(assessment.publishable)report.summary.validated++;
     const outcome=values.write?await persistCandidate(prisma,org,candidate):{action:assessment.publishable?'would_publish':'needs_review',issues:assessment.issues};
     if(Object.hasOwn(report.summary,outcome.action))report.summary[outcome.action]++;
     source.jobs.push({title:candidate.title,url:candidate.url,country:candidate.country,workType:candidate.workType,...outcome});
    }
    if(values.write){
     report.summary.archived+=await reconcileMissing(prisma,org,result);
     // Only verified published records replace the earlier loose title scraper's output.
     const active=await prisma.job.findMany({where:{organizationId:org.id,status:'PUBLISHED',sourceChannel:IMPORT_CHANNEL},select:{title:true}});
     if(active.length)await prisma.organization.update({where:{id:org.id},data:{openJobs:active.map(j=>j.title).join(' | ')}});
    }
   }catch(error){source.status='error';source.error=String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[database URL]');report.summary.sourceErrors++;}
   report.sources[index]=source;
   console.log('['+(index+1)+'/'+organizations.length+'] '+org.name+': '+source.status+', '+source.jobs.length+' structured jobs');
  }
 }));
 // Explicit source deadlines remain valid even if a later crawl is unavailable.
 if(values.write){
  const intakes=await prisma.opportunityIntake.findMany({where:{fingerprint:{startsWith:'weekly:'},approvedJobId:{not:null},status:'APPROVED'}});
  for(const item of intakes){
   const meta=item.extraction?.scraper;
   if(meta?.expiresAt&&new Date(meta.expiresAt)<new Date()){
    const result=await prisma.job.updateMany({where:{id:item.approvedJobId,sourceChannel:IMPORT_CHANNEL,status:'PUBLISHED'},data:{status:'ARCHIVED'}});
    report.summary.archived+=result.count;
    if(result.count)await prisma.opportunityIntake.update({where:{id:item.id},data:{extraction:{...item.extraction,scraper:{...meta,archivedByScraper:true,archiveReason:'deadline'}}}});
   }
  }
 }
 // A broad source outage must make the cloud run visibly fail, without hiding good records.
 if(report.summary.sourceErrors>Math.max(3,organizations.length*0.5))process.exitCode=1;
}catch(error){report.fatalError=String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[database URL]');process.exitCode=1;}
finally{
 await prisma.$disconnect();report.completedAt=new Date().toISOString();
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.summary));if(report.fatalError)console.error(report.fatalError);console.log('Report: '+reportPath);
}
