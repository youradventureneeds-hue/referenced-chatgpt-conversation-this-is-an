import {prisma} from '@/lib/prisma';
import {currentCandidate,findCandidateJob,candidateSnapshot,candidateJobLink} from '@/lib/candidate-server';
import {candidateJobId,candidateRecordId} from '@/lib/candidate-validation';
import {employerJson,sameEmployerOrigin,employerBody} from '@/lib/employer-server';
import {consumeEmployerLimit} from '@/lib/employer-auth.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);const rows=await prisma.savedJob.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},take:500,include:{job:{select:{slug:true,status:true,reviewedByAdmin:true}}}});return employerJson({savedJobs:rows.map(({job,userId,...row})=>({...row,jobUrl:candidateJobLink(job)}))});}
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 try{const parsed=candidateJobId.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:'Choose a job to save.'},400);const job=await findCandidateJob(parsed.data.jobId);if(!job)return employerJson({error:'This vacancy is no longer available.'},404);
 if(!await consumeEmployerLimit(prisma,'candidate-save',user.id,120,3600000))return employerJson({error:'Too many saves. Try again later.'},429);
 const existing=await prisma.savedJob.findUnique({where:{userId_jobId:{userId:user.id,jobId:job.id}},select:{id:true}});if(existing)return employerJson({id:existing.id,saved:true});
 if(await prisma.savedJob.count({where:{userId:user.id}})>=500)return employerJson({error:'Remove a saved job before adding more. Your list can hold 500 jobs.'},400);
 const saved=await prisma.savedJob.upsert({where:{userId_jobId:{userId:user.id,jobId:job.id}},create:{userId:user.id,...candidateSnapshot(job)},update:{},select:{id:true}});return employerJson({id:saved.id,saved:true},201);
 }catch{return employerJson({error:'Could not save this job. Please try again.'},400);}
}
export async function DELETE(request:Request){if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);const parsed=candidateRecordId.safeParse(await request.json().catch(()=>null));if(!parsed.success)return employerJson({error:'Choose a saved job.'},400);const result=await prisma.savedJob.deleteMany({where:{id:parsed.data.id,userId:user.id}});return result.count?employerJson({removed:true}):employerJson({error:'Saved job not found.'},404);}
