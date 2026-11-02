import {prisma} from '@/lib/prisma';
import {currentCandidate,findCandidateJob,candidateSnapshot,candidateJobLink} from '@/lib/candidate-server';
import {candidateApplicationCreate,candidateApplicationUpdate,candidateRecordId} from '@/lib/candidate-validation';
import {employerJson,sameEmployerOrigin,employerBody} from '@/lib/employer-server';
import {consumeEmployerLimit} from '@/lib/employer-auth.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);const rows=await prisma.candidateApplication.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},take:500,include:{job:{select:{slug:true,status:true,reviewedByAdmin:true}}}});return employerJson({applications:rows.map(({job,userId,...row})=>({...row,jobUrl:candidateJobLink(job),candidateReported:true}))});}
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 try{const parsed=candidateApplicationCreate.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:'Check the application details.'},400);const input=parsed.data;
 if(input.status==='APPLIED'&&!input.confirmedExternalSubmission)return employerJson({error:'Confirm you have applied through the employer’s application process.'},400);
 const job=await findCandidateJob(input.jobId);if(!job)return employerJson({error:'This vacancy is no longer available.'},404);
 if(!await consumeEmployerLimit(prisma,'candidate-tracker',user.id,100,3600000))return employerJson({error:'Too many updates. Try again later.'},429);
 const existing=await prisma.candidateApplication.findUnique({where:{userId_jobId:{userId:user.id,jobId:job.id}},select:{id:true,status:true}});if(existing)return employerJson({application:existing,existing:true});
 if(await prisma.candidateApplication.count({where:{userId:user.id}})>=500)return employerJson({error:'Your tracker can hold 500 records. Remove an old record before adding more.'},400);
 const record=await prisma.candidateApplication.upsert({where:{userId_jobId:{userId:user.id,jobId:job.id}},create:{userId:user.id,...candidateSnapshot(job),status:input.status,appliedAt:input.status==='APPLIED'?new Date():null},update:{},select:{id:true,status:true}});return employerJson({application:record,candidateReported:true},201);
 }catch{return employerJson({error:'Could not record this application. Please try again.'},400);}
}
export async function PATCH(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 try{const parsed=candidateApplicationUpdate.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:parsed.error.issues[0]?.message||'Check the tracker details.'},400);const input=parsed.data;
 if(input.status==='APPLIED'&&!input.confirmedExternalSubmission)return employerJson({error:'Confirm you have completed the employer’s application process.'},400);
 if(!await consumeEmployerLimit(prisma,'candidate-tracker',user.id,100,3600000))return employerJson({error:'Too many updates. Try again later.'},429);
 const owned=await prisma.candidateApplication.findFirst({where:{id:input.id,userId:user.id},select:{appliedAt:true}});if(!owned)return employerJson({error:'Application record not found.'},404);
 const updated=await prisma.candidateApplication.updateMany({where:{id:input.id,userId:user.id},data:{status:input.status,notes:input.notes,appliedAt:input.status==='APPLIED'&&!owned.appliedAt?new Date():owned.appliedAt}});return updated.count?employerJson({saved:true,candidateReported:true}):employerJson({error:'Application record not found.'},404);
 }catch{return employerJson({error:'Could not update your tracker. Please try again.'},400);}
}
export async function DELETE(request:Request){if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);const parsed=candidateRecordId.safeParse(await request.json().catch(()=>null));if(!parsed.success)return employerJson({error:'Choose an application record.'},400);const removed=await prisma.candidateApplication.deleteMany({where:{id:parsed.data.id,userId:user.id}});return removed.count?employerJson({removed:true}):employerJson({error:'Application record not found.'},404);}
