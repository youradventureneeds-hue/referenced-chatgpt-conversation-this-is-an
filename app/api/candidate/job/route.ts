import {prisma} from '@/lib/prisma';
import {currentCandidate,findCandidateJob} from '@/lib/candidate-server';
import {candidateJobId} from '@/lib/candidate-validation';
import {employerJson} from '@/lib/employer-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);const parsed=candidateJobId.safeParse({jobId:new URL(request.url).searchParams.get('jobId')});if(!parsed.success)return employerJson({error:'Choose a job.'},400);const job=await findCandidateJob(parsed.data.jobId);if(!job)return employerJson({error:'Vacancy not found.'},404);const [saved,application]=await Promise.all([prisma.savedJob.findUnique({where:{userId_jobId:{userId:user.id,jobId:job.id}},select:{id:true}}),prisma.candidateApplication.findUnique({where:{userId_jobId:{userId:user.id,jobId:job.id}},select:{id:true,status:true}})]);return employerJson({saved,application});}
