import {inferJobCategory} from './job-categories.mjs';
import { assess, identity, IMPORT_CHANNEL } from './job-scraper.mjs';

function summary(org,job) {
  return job.title+' at '+org.name+'. Location: '+(job.region?job.region+', ':'')+job.country+'. Work type: '+(job.workType==='UNSPECIFIED'?'not specified':job.workType.replaceAll('_',' ').toLowerCase())+'. Visit the official vacancy page for the employer’s responsibilities, requirements, compensation, and application instructions.\n\nOriginal vacancy: '+job.url;
}

export async function persistCandidate(prisma,org,candidate,{now=new Date()}={}) {
  const assessment=assess(candidate,now);
  const fingerprint='weekly:'+identity(org.id,candidate.sourceKey);
  const existing=await prisma.opportunityIntake.findUnique({where:{fingerprint}});
  // An explicit rejection or manual archive must survive future automated runs.
  if(existing?.status==='REJECTED')return {action:'rejected',fingerprint};
  const extraction={category:inferJobCategory(candidate.title),categoryManual:false,title:candidate.title,organization:org.name,organizationId:org.id,country:candidate.country||null,
    location:candidate.region||null,jobType:candidate.workType||null,summary:candidate.description.slice(0,600),
    confidence:assessment.publishable?0.95:0.5,issues:assessment.issues,
    scraper:{version:1,sourceKey:candidate.sourceKey,sourceUrl:candidate.url,expiresAt:candidate.expiresAt||null,lastSeenAt:now.toISOString(),missingRuns:0,evidence:candidate.evidence}};
  const intakeData={sourceType:'WEBSITE',sourceUrl:candidate.url,rawText:(candidate.title+'\n'+org.name+'\n'+candidate.description.slice(0,600)),extraction};
  if(!assessment.publishable){
    if(assessment.expired&&existing?.approvedJobId){
      const job=await prisma.job.findUnique({where:{id:existing.approvedJobId}});
      if(job?.sourceChannel===IMPORT_CHANNEL)await prisma.job.update({where:{id:job.id},data:{status:'ARCHIVED'}});
      extraction.scraper.archivedByScraper=true;
    }
    await prisma.opportunityIntake.upsert({where:{fingerprint},create:{...intakeData,fingerprint,status:'NEEDS_REVIEW'},update:{...intakeData,...(!existing?.approvedJobId?{status:'NEEDS_REVIEW'}:{})}});
    return {action:assessment.expired?'expired':'needs_review',fingerprint,issues:assessment.issues};
  }
  return prisma.$transaction(async tx=>{
    let job=existing?.approvedJobId?await tx.job.findUnique({where:{id:existing.approvedJobId}}):null;
    if(job?.sourceChannel!==IMPORT_CHANNEL && job)return {action:'manual_record_preserved',fingerprint};
    if(job?.status==='ARCHIVED' && existing.extraction?.scraper?.missingRuns===0 && !existing.extraction?.scraper?.archivedByScraper)return {action:'manual_archive_preserved',fingerprint};
    if(!job){
      const duplicate=await tx.job.findFirst({where:{organizationId:org.id,title:{equals:candidate.title,mode:'insensitive'},OR:[{sourceChannel:null},{sourceChannel:{not:IMPORT_CHANNEL}}]}});
      if(duplicate)return {action:'duplicate_manual_job',fingerprint};
    }
    const key=identity(org.id,candidate.sourceKey);
    const slug=candidate.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)+'-'+key.slice(0,16);
    const data={category:job?.categoryManual?job.category:inferJobCategory(candidate.title),title:candidate.title,description:summary(org,candidate),country:candidate.country,region:candidate.region||null,
      workType:candidate.workType,status:'PUBLISHED',sourceChannel:IMPORT_CHANNEL,
      // Administrator-authorized automated approval of validated official-source records.
      reviewedByAdmin:true,visaSponsorship:false,visaEligibilityNote:'Not specified by the employer. Confirm eligibility on the official vacancy page.',
      currency:({ 'United States':'USD','United Kingdom':'GBP',India:'INR',Canada:'CAD',Germany:'EUR' })[candidate.country]||'USD'};
    const saved=job?await tx.job.update({where:{id:job.id},data}):await tx.job.create({data:{...data,slug,organizationId:org.id}});
    extraction.category=saved.category;extraction.categoryManual=saved.categoryManual===true;
    await tx.opportunityIntake.upsert({where:{fingerprint},create:{...intakeData,fingerprint,status:'APPROVED',approvedJobId:saved.id,reviewedAt:now,reviewNotes:'Automatically approved by the authorized official-source validation policy.'},update:{...intakeData,status:'APPROVED',approvedJobId:saved.id,reviewedAt:now}});
    return {action:job?'updated':'created',fingerprint,jobId:saved.id};
  });
}

export async function reconcileMissing(prisma,org,result,{now=new Date()}={}) {
  // Absence only means closure for an explicitly complete, healthy official feed.
  if(result.status!=='ok'||!result.complete||!result.feedKey)return 0;
  const current=new Set(result.jobs.map(j=>j.sourceKey));
  const intakes=await prisma.opportunityIntake.findMany({where:{fingerprint:{startsWith:'weekly:'},status:'APPROVED'}});
  let archived=0;
  for(const intake of intakes){
    const meta=intake.extraction?.scraper;
    if(intake.extraction?.organizationId!==org.id||!meta?.sourceKey?.startsWith(result.feedKey+':')||current.has(meta.sourceKey)||!intake.approvedJobId)continue;
    const job=await prisma.job.findUnique({where:{id:intake.approvedJobId}});
    if(!job||job.sourceChannel!==IMPORT_CHANNEL||job.status==='ARCHIVED')continue;
    // Retrying the same run/day must not count as another weekly absence.
    if(meta.lastMissingAt && now-new Date(meta.lastMissingAt)<6*86400000)continue;
    const missingRuns=(meta.missingRuns||0)+1;
    await prisma.$transaction(async tx=>{
      if(missingRuns>=2){await tx.job.update({where:{id:job.id},data:{status:'ARCHIVED'}});archived++;}
      await tx.opportunityIntake.update({where:{id:intake.id},data:{extraction:{...intake.extraction,scraper:{...meta,missingRuns,lastMissingAt:now.toISOString(),archivedByScraper:missingRuns>=2}}}});
    });
  }
  return archived;
}
