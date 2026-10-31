import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const root=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{write:{type:'boolean',default:false},report:{type:'string'}}});
const paragraphs=JSON.parse(fs.readFileSync(path.join(root,'data/organization-about.json'),'utf8'));
for(const row of paragraphs){
 if(!row.slug||!row.description||row.description.trim().split(/\s+/).length!==60||/[\r\n]/.test(row.description)){
  throw new Error('Each organization needs a slug and one 60-word paragraph: '+row.name);
 }
}
if(new Set(paragraphs.map(row=>row.slug)).size!==paragraphs.length)throw new Error('Duplicate organization slugs');
if(!values.write){
 console.log(JSON.stringify({mode:'preview',organizations:paragraphs.length,wordsPerParagraph:60,unverified:paragraphs.filter(r=>r.researchStatus==='unverified').map(r=>r.name),historical:paragraphs.filter(r=>r.researchStatus==='historical').map(r=>r.name)}));
}else{
 for(const file of ['.env','.env.local']){const envPath=path.join(root,file);if(fs.existsSync(envPath))process.loadEnvFile(envPath);}
 const {PrismaClient}=await import('@prisma/client');
 const {PrismaPg}=await import('@prisma/adapter-pg');
 const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
 try{
  const previous=await prisma.organization.findMany({where:{slug:{in:paragraphs.map(r=>r.slug)}},select:{id:true,name:true,slug:true,description:true}});
  const existing=new Map(previous.map(r=>[r.slug,r]));
  for(const row of paragraphs){if(existing.get(row.slug)?.name!==row.name)throw new Error('Missing or renamed organization: '+row.name);}
  const backupDir=path.join(root,'work');fs.mkdirSync(backupDir,{recursive:true});
  fs.writeFileSync(path.join(backupDir,'about-before-'+Date.now()+'.json'),JSON.stringify(previous,null,2));
  await prisma.$transaction(async tx=>{
   for(const [i,row] of paragraphs.entries()){
    await tx.organization.update({where:{slug:row.slug},data:{description:row.description}});
    if((i+1)%20===0)console.log('Updated '+(i+1)+'/'+paragraphs.length);
   }
  },{maxWait:10000,timeout:120000});
  const saved=await prisma.organization.findMany({where:{slug:{in:paragraphs.map(r=>r.slug)}},select:{name:true,slug:true,description:true}});
  for(const row of saved){if(row.description!==paragraphs.find(r=>r.slug===row.slug).description)throw new Error('Verification failed: '+row.name);}
  const summary={updated:saved.length,wordsPerParagraph:60,paragraphsPerOrganization:1,verified:true};
  const report=path.resolve(values.report||path.join(root,'work/about-update-report.json'));
  fs.mkdirSync(path.dirname(report),{recursive:true});
  fs.writeFileSync(report,JSON.stringify({summary,organizations:paragraphs,verifiedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify(summary));
 }finally{await prisma.$disconnect();}
}
