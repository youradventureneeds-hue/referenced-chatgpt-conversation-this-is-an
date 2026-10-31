import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{write:{type:'boolean',default:false},report:{type:'string'}}});
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/global-organizations.json'),'utf8'));
const logos=JSON.parse(fs.readFileSync(path.join(root,'data/organization-logos.json'),'utf8'));
const normalize=s=>s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
for(const row of rows){
 if(!row.name||!row.slug||!row.country||!row.sourceUrls?.length||row.description.trim().split(/\s+/).length!==60||/[\r\n]/.test(row.description))throw Error('Incomplete organization: '+row.name);
 for(const url of [row.website,row.careersUrl,...row.sourceUrls].filter(Boolean)){const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid public URL: '+row.name);}
}
if(new Set(rows.map(r=>r.slug)).size!==rows.length)throw Error('Duplicate slugs in source');
for(const file of ['.env','.env.local']){const p=path.join(root,file);if(fs.existsSync(p))process.loadEnvFile(p);}
const {PrismaClient}=await import('@prisma/client');const {PrismaPg}=await import('@prisma/adapter-pg');
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{
 const existing=await prisma.organization.findMany({select:{name:true,slug:true}});
 const fresh=rows.filter(row=>!existing.some(e=>e.slug===row.slug||normalize(e.name)===normalize(row.name)));
 const skipped=rows.filter(r=>!fresh.includes(r)).map(r=>r.name);
 if(values.write&&fresh.length){
  await prisma.organization.createMany({data:fresh.map(row=>({name:row.name,slug:row.slug,description:row.description,country:row.country,region:row.region,website:row.website,careersUrl:row.careersUrl,logoUrl:logos[row.slug]?.src||null,verified:false})),skipDuplicates:true});
 }
 const saved=values.write?await prisma.organization.findMany({where:{slug:{in:rows.map(r=>r.slug)}},select:{slug:true,name:true,description:true,website:true,careersUrl:true,logoUrl:true}}):[];
 if(values.write)for(const row of fresh){const item=saved.find(r=>r.slug===row.slug);if(!item||item.description!==row.description||item.website!==row.website)throw Error('Import verification failed: '+row.name);}
 const report={mode:values.write?'write':'preview',newOrganizations:fresh.length,alreadyPresent:skipped,wordsPerParagraph:60,totalAfter:values.write?await prisma.organization.count():existing.length+fresh.length,countries:[...new Set(rows.map(r=>r.country))].sort(),verified:values.write,organizations:rows.map(r=>({name:r.name,slug:r.slug,country:r.country,website:r.website,careersUrl:r.careersUrl,sourceUrls:r.sourceUrls,evidenceType:r.evidenceType,logo:logos[r.slug]?.src||null})),completedAt:new Date().toISOString()};
 const target=path.resolve(values.report||path.join(root,'work/global-import-report.json'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2));
 console.log(JSON.stringify({mode:report.mode,newOrganizations:report.newOrganizations,alreadyPresent:skipped.length,totalAfter:report.totalAfter,countryGroups:report.countries.length,verified:report.verified}));
}finally{await prisma.$disconnect();}
