import {isJobCategory,inferJobCategory} from '@/lib/job-categories.mjs';
import {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import type {ExtractedOpportunity} from '@/lib/intake';
import {z} from 'zod';
import {adminDenied} from '@/lib/admin-access';
import {employerUrl} from '@/lib/employer-validation';
const reviewSchema=z.object({category:z.string().refine(v=>v==='AUTO'||isJobCategory(v)).optional(),status:z.enum(['APPROVED','REJECTED','NEEDS_REVIEW']),reviewNotes:z.string().max(1000).optional(),verified:z.boolean().optional(),createOrganization:z.boolean().optional(),title:z.string().trim().max(180).optional(),organization:z.string().trim().max(200).optional(),country:z.string().trim().max(120).optional(),summary:z.string().trim().max(15000).optional(),jobType:z.enum(['UNSPECIFIED','FULL_TIME','PART_TIME','SEASONAL','INTERNSHIP','VOLUNTEER','GAP_YEAR']).optional(),applicationUrl:employerUrl.optional()});
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=adminDenied(request);if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
 const body=reviewSchema.safeParse(await request.json().catch(()=>null));if(!body.success)return Response.json({error:'Invalid review update.'},{status:400});
 const {id}=await params,intake=await prisma.opportunityIntake.findUnique({where:{id}});if(!intake)return Response.json({error:'Intake item not found.'},{status:404});
 if(intake.approvedJobId)return Response.json({error:'This opportunity has already been published.'},{status:409});
 if(body.data.status!=='APPROVED'){const changed=await prisma.opportunityIntake.updateMany({where:{id,approvedJobId:null,status:'NEEDS_REVIEW'},data:{status:body.data.status,reviewNotes:body.data.reviewNotes,reviewedAt:new Date()}});if(!changed.count)return Response.json({error:'This submission was already reviewed. Refresh the queue.'},{status:409});return Response.json({data:await prisma.opportunityIntake.findUnique({where:{id}})});}
 if(!body.data.verified)return Response.json({error:'Confirm that the employer and vacancy details have been verified.'},{status:400});
 const extraction=intake.extraction as unknown as ExtractedOpportunity;
 const organizationName=body.data.organization||extraction.organization;
 const organization=await prisma.organization.findFirst({where:{name:{equals:organizationName,mode:'insensitive'}}});
 const employer=intake.sourceType==='EMPLOYER_SUBMISSION'&&intake.employerUserId?extraction.employer:null;
 if(!organization&&(!body.data.createOrganization||!employer))return Response.json({error:'Choose an existing organization or confirm creation of the verified employer’s new page.'},{status:400});
 if(!organization&&(!employerUrl.safeParse(employer?.organizationWebsite).success||employer?.organizationDescription?.trim().split(/\s+/).length!==60||!employer?.organizationCountry))return Response.json({error:'The new organization needs its official website, country, and a 60-word overview.'},{status:400});
 const title=body.data.title||extraction.title;if(!title||title.length<4||/^Recruitment post from|^Instagram story/i.test(title))return Response.json({error:'Enter the verified job title.'},{status:400});
 const summary=body.data.summary||extraction.summary||intake.rawText;if(summary.length<30)return Response.json({error:'Provide a verified summary of at least 30 characters.'},{status:400});
 if(extraction.instagram?.expiresAt&&new Date(extraction.instagram.expiresAt)<new Date()&&!body.data.applicationUrl)return Response.json({error:'This story expired. Provide a current verified application URL.'},{status:409});
 const jobSlug=`${slugify(title)||'outdoor-role'}-${intake.id.slice(-8)}`,country=body.data.country||extraction.country||'Not specified',workType=body.data.jobType||extraction.jobType||'UNSPECIFIED';
 const requestedCategory=body.data.category;const categoryManual=requestedCategory?requestedCategory!=='AUTO':Boolean(extraction.categoryManual);const category=isJobCategory(requestedCategory)?requestedCategory:requestedCategory!=='AUTO'&&extraction.categoryManual&&isJobCategory(extraction.category)?extraction.category:inferJobCategory(title);
 try{const result=await prisma.$transaction(async(tx:Prisma.TransactionClient)=>{
  const claimed=await tx.opportunityIntake.updateMany({where:{id,status:'NEEDS_REVIEW',approvedJobId:null},data:{status:'APPROVED'}});if(!claimed.count)throw Error('ALREADY_REVIEWED');
  const org=organization||await tx.organization.create({data:{name:organizationName,slug:(slugify(organizationName)||'organization')+'-'+intake.id.slice(-8),website:employer!.organizationWebsite,country:employer!.organizationCountry,description:employer!.organizationDescription,careersUrl:body.data.applicationUrl||extraction.applicationUrl||null,verified:false}});
  const job=await tx.job.create({data:{organizationId:org.id,category,categoryManual,title,slug:jobSlug,description:summary,workType:workType as Prisma.JobCreateInput['workType'],status:'PUBLISHED',country,region:extraction.location,visaSponsorship:false,visaEligibilityNote:extraction.eligibility||'Eligibility and sponsorship must be checked with the employer.',sourceChannel:intake.sourceType,reviewedByAdmin:true}});
  return tx.opportunityIntake.update({where:{id},data:{status:'APPROVED',extraction:{...extraction,category,categoryManual,title,organization:org.name,organizationId:org.id,organizationSlug:org.slug,country,jobType:workType,summary,applicationUrl:body.data.applicationUrl||extraction.applicationUrl||null},reviewNotes:body.data.reviewNotes,reviewedAt:new Date(),approvedJobId:job.id}});
 },{timeout:15000});return Response.json({data:result,meta:{publishedJobSlug:jobSlug}});
 }catch(e){if((e as Error).message==='ALREADY_REVIEWED')return Response.json({error:'This submission was already reviewed. Refresh the queue.'},{status:409});return Response.json({error:'Could not publish this submission. Please try again.'},{status:400});}
}
