import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
const write=process.argv.includes('--write');
const data=JSON.parse(fs.readFileSync(new URL('../data/india-reviewed-jobs.json',import.meta.url),'utf8'));
for(const org of data.organizations){if(org.description&&(org.description.trim().split(/\s+/).length!==60||/[\r\n]/.test(org.description)))throw Error('Organization overview must be one 60-word paragraph: '+org.slug);}
for(const job of data.jobs){if(!data.organizations.some(o=>o.slug===job.organizationSlug)||job.description.length<100)throw Error('Incomplete reviewed job');for(const url of [job.sourceUrl,job.applicationUrl]){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid publication URL');}if(job.deadline&&new Date(job.deadline+'T23:59:59Z')<new Date())throw Error('Vacancy deadline has passed: '+job.title);}
for(const name of ['.env','.env.local'])if(fs.existsSync(name))process.loadEnvFile(name);
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const now=new Date();
const report={mode:write?'write':'preview',checkedAt:now.toISOString(),organizations:[],jobs:[]};
const identity=o=>({OR:[{slug:o.slug},{name:{equals:o.name,mode:'insensitive'}}]});
try{
 const existingOrgs=await db.organization.findMany({where:{OR:data.organizations.flatMap(o=>identity(o).OR)},include:{jobs:{select:{id:true,title:true,slug:true,status:true,sourceChannel:true}}}});
 for(const org of data.organizations){const matches=existingOrgs.filter(o=>o.slug===org.slug||o.name.toLowerCase()===org.name.toLowerCase());if(matches.length>1)throw Error('Ambiguous existing organization: '+org.name);report.organizations.push({name:org.name,slug:matches[0]?.slug||org.slug,action:matches.length?'update-careers-link':'create',overviewWords:org.description?.split(/\s+/).length||null});}
 for(const job of data.jobs){const org=existingOrgs.find(o=>o.slug===job.organizationSlug);const duplicate=org?.jobs.find(j=>j.title.toLowerCase()===job.title.toLowerCase());report.jobs.push({title:job.title,organizationSlug:job.organizationSlug,slug:duplicate?.slug||job.organizationSlug+'-'+job.key,action:duplicate?'update':'create',applicationUrl:job.applicationUrl,sourceUrl:job.sourceUrl});}
 fs.mkdirSync(new URL('../work/',import.meta.url),{recursive:true});
 fs.writeFileSync(new URL('../work/india-publication-before.json',import.meta.url),JSON.stringify(existingOrgs,null,2));
 if(write)await db.$transaction(async tx=>{
  const organizations=new Map();
  for(const org of data.organizations){let saved=await tx.organization.findFirst({where:identity(org)});const fields={website:org.website,careersUrl:org.careersUrl,...(org.logoSource?{logoUrl:'/organization-logos/'+org.slug+'.png'}:{})};if(saved){saved=await tx.organization.update({where:{id:saved.id},data:fields});}else{if(!org.description)throw Error('New organization needs an overview');saved=await tx.organization.create({data:{...fields,name:org.name,slug:org.slug,country:org.country,region:org.region,description:org.description,verified:false}});}organizations.set(org.slug,saved);}
  for(const [index,job]of data.jobs.entries()){
   const org=organizations.get(job.organizationSlug);const slug=report.jobs[index].slug;
   const bySlug=await tx.job.findUnique({where:{slug}});if(bySlug&&bySlug.organizationId!==org.id)throw Error('Job slug belongs to another employer');
   const existing=bySlug||await tx.job.findFirst({where:{organizationId:org.id,title:{equals:job.title,mode:'insensitive'}}});
   const fields={organizationId:org.id,title:job.title,slug:existing?.slug||slug,description:job.description,workType:job.workType,status:'PUBLISHED',country:'India',region:job.region,salaryMin:job.salaryMin??null,salaryMax:job.salaryMax??null,currency:job.currency||'INR',isUnpaid:false,visaSponsorship:false,visaEligibilityNote:'Work authorization and sponsorship were not confirmed. Check with the employer.',sourceChannel:job.sourceType,reviewedByAdmin:true};
   const saved=existing?await tx.job.update({where:{id:existing.id},data:fields}):await tx.job.create({data:fields});
   const priorIntake=await tx.opportunityIntake.findUnique({where:{approvedJobId:saved.id}});
   const fingerprint=priorIntake?.fingerprint||'reviewed-india:'+createHash('sha256').update(org.id+'\n'+job.key).digest('hex');
   const extraction={title:job.title,organization:org.name,organizationId:org.id,organizationSlug:org.slug,country:'India',location:job.region,jobType:job.workType,summary:job.description,applicationUrl:job.applicationUrl,confidence:1,issues:[],deadline:job.deadline||null,compensation:{period:job.salaryPeriod||null},verification:{officialUrl:job.applicationUrl,checkedAt:now.toISOString(),publicationAuthorization:'Site owner explicitly requested publication of these researched jobs'},...(job.sourceType==='INSTAGRAM'?{instagram:{collectedAt:now.toISOString(),permalink:job.sourceUrl}}:{})};
   const intake={sourceType:job.sourceType,sourceUrl:job.sourceUrl,rawText:job.description,extraction,status:'APPROVED',approvedJobId:saved.id,reviewedAt:now,reviewNotes:'Researched Instagram recruitment and current official careers evidence. Publication requested by the site owner. Paid courses, unverified office roles and volunteering excluded.'};
   await tx.opportunityIntake.upsert({where:{fingerprint},create:{...intake,fingerprint},update:intake});
   report.jobs[index].id=saved.id;report.jobs[index].slug=saved.slug;
  }
 },{timeout:30000});
 report.totalOrganizations=await db.organization.count();report.totalPublishedJobs=await db.job.count({where:{status:'PUBLISHED',reviewedByAdmin:true}});
 if(write){report.verified=[];for(const org of data.organizations){const saved=await db.organization.findFirst({where:identity(org),include:{jobs:{where:{status:'PUBLISHED',reviewedByAdmin:true},select:{title:true,slug:true}}}});const expected=data.jobs.filter(j=>j.organizationSlug===org.slug);if(!saved||expected.some(j=>!saved.jobs.some(s=>s.title===j.title)))throw Error('Publication verification failed: '+org.name);report.verified.push({name:saved.name,slug:saved.slug,openJobs:saved.jobs.length,overviewWords:saved.description?.trim().split(/\s+/).length});}}
 fs.writeFileSync(new URL('../work/india-job-publication.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await db.$disconnect();}
