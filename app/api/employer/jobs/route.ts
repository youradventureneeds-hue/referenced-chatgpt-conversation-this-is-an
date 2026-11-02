import {createHash} from 'node:crypto';
import {prisma} from '@/lib/prisma';
import {employerJob} from '@/lib/employer-validation';
import {consumeEmployerLimit} from '@/lib/employer-auth.mjs';
import {currentEmployer,employerJson,sameEmployerOrigin,employerBody} from '@/lib/employer-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const user=await currentEmployer(request);if(!user)return employerJson({error:'Employer sign-in required.'},401);
 const rows=await prisma.opportunityIntake.findMany({where:{employerUserId:user.id,sourceType:'EMPLOYER_SUBMISSION'},orderBy:{createdAt:'desc'},take:100,select:{id:true,status:true,extraction:true,reviewNotes:true,createdAt:true,approvedJobId:true}});
 const jobs=await prisma.job.findMany({where:{id:{in:rows.map(v=>v.approvedJobId).filter((v):v is string=>Boolean(v))}},select:{id:true,slug:true,status:true}});
 return employerJson({submissions:rows.map(v=>({...v,jobUrl:v.status==='APPROVED'&&jobs.find(j=>j.id===v.approvedJobId&&j.status==='PUBLISHED')?'/jobs/'+jobs.find(j=>j.id===v.approvedJobId)!.slug:null}))});
}
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 const user=await currentEmployer(request);if(!user)return employerJson({error:'Employer sign-in required.'},401);
 try{const parsed=employerJob.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:parsed.error.issues[0]?.message||'Check the job details.'},400);const input=parsed.data;
 const org=input.organizationId?await prisma.organization.findUnique({where:{id:input.organizationId},select:{id:true,name:true,slug:true,website:true,country:true,description:true}}):null;
 if(input.organizationId&&!org)return employerJson({error:'Select an organization from the list again.'},400);
 if(!org&&(!input.organizationDescription||input.organizationDescription.split(/\s+/).length!==60))return employerJson({error:'Provide a 60-word overview for the new organization.'},400);
 if(!await consumeEmployerLimit(prisma,'job-submit',user.id,10,86400000))return employerJson({error:'You have reached the daily submission limit. Please try again tomorrow.'},429);
 const organization=org?.name||input.organizationName;
 const key='employer:'+createHash('sha256').update(JSON.stringify([user.id,organization.toLowerCase(),input.title.toLowerCase(),input.country.toLowerCase(),input.location||'',input.jobType,input.summary,input.applicationUrl])).digest('hex');
 const existing=await prisma.opportunityIntake.findUnique({where:{fingerprint:key},select:{id:true,status:true}});if(existing)return employerJson({submission:existing,duplicate:true});
 const extraction={title:input.title,organization,organizationId:org?.id||null,organizationSlug:org?.slug||null,country:input.country,location:input.location||'',jobType:input.jobType,summary:input.summary,applicationUrl:input.applicationUrl,eligibility:input.eligibility||'',confidence:0.8,issues:['Employer identity and vacancy require administrator verification.'],employer:{contactName:user.name,email:user.email,emailVerified:false,organizationWebsite:org?.website||input.organizationWebsite,organizationCountry:org?.country||input.organizationCountry,organizationDescription:org?.description||input.organizationDescription||''}};
 const item=await prisma.opportunityIntake.create({data:{employerUserId:user.id,submittedByEmail:user.email,sourceType:'EMPLOYER_SUBMISSION',sourceUrl:input.applicationUrl,fingerprint:key,rawText:input.summary,extraction,status:'NEEDS_REVIEW'},select:{id:true,status:true}});
 return employerJson({submission:item},201);
 }catch(e){if((e as {code?:string}).code==='P2002')return employerJson({error:'This job was already submitted. Refresh your submissions to see its status.'},409);return employerJson({error:'Could not submit this job. Please try again.'},400);}
}
