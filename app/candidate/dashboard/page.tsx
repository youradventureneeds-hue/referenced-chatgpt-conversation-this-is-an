import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {CANDIDATE_COOKIE,candidateForToken} from '@/lib/employer-auth.mjs';
import {CandidateDashboard} from '@/components/candidate-dashboard';
import '@/components/employer.css';
import '@/components/candidate.css';
export const dynamic='force-dynamic';
export default async function CandidatePage(){const user=await candidateForToken(prisma,(await cookies()).get(CANDIDATE_COOKIE)?.value);if(!user)redirect('/candidates?mode=login');return <main className="section employer-section"><CandidateDashboard/></main>;}
