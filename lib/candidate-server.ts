import {prisma} from '@/lib/prisma';
import {accountCookie,candidateForToken} from '@/lib/employer-auth.mjs';
export const currentCandidate=(request:Request)=>candidateForToken(prisma,accountCookie(request,'CANDIDATE'));
export const publicCandidateJob={id:true,title:true,slug:true,country:true,status:true,reviewedByAdmin:true,organization:{select:{name:true}}} as const;
export async function findCandidateJob(id:string){return prisma.job.findFirst({where:{id,status:'PUBLISHED',reviewedByAdmin:true},select:publicCandidateJob});}
export const candidateSnapshot=(job:{id:string;title:string;country:string;organization:{name:string}})=>({jobId:job.id,jobTitle:job.title,organizationName:job.organization.name,jobCountry:job.country});
export function candidateJobLink(job:{slug:string;status:string;reviewedByAdmin:boolean}|null){return job?.status==='PUBLISHED'&&job.reviewedByAdmin?'/jobs/'+job.slug:null;}
