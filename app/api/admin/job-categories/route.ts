import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {adminDenied} from '@/lib/admin-access';
import {employerBody,employerJson,sameEmployerOrigin} from '@/lib/employer-server';
import {isJobCategory,inferJobCategory,JOB_CATEGORIES} from '@/lib/job-categories.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const denied=adminDenied(request);if(denied)return denied;const jobs=await prisma.job.findMany({where:{status:'PUBLISHED',reviewedByAdmin:true},select:{id:true,title:true,slug:true,country:true,category:true,categoryManual:true,organization:{select:{name:true}}},orderBy:{title:'asc'},take:2000});return employerJson({jobs,categories:JOB_CATEGORIES});}
export async function POST(request:Request){
 const denied=adminDenied(request);if(denied)return denied;if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 try{const parsed=z.object({id:z.string().min(1).max(100),category:z.string().refine(v=>v==='AUTO'||isJobCategory(v))}).safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:'Choose a valid job category.'},400);
 const job=await prisma.job.findFirst({where:{id:parsed.data.id,status:'PUBLISHED',reviewedByAdmin:true},select:{id:true,title:true}});if(!job)return employerJson({error:'Published job not found.'},404);
 const manual=parsed.data.category!=='AUTO',category=manual?parsed.data.category:inferJobCategory(job.title);
 const changed=await prisma.job.updateMany({where:{id:job.id,status:'PUBLISHED',reviewedByAdmin:true},data:{category,categoryManual:manual}});if(!changed.count)return employerJson({error:'This job is no longer published. Refresh the list.'},409);
 return employerJson({saved:true,category,categoryManual:manual});
 }catch{return employerJson({error:'Could not save the category. Try again.'},400);}
}
