import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {prisma} from '@/lib/prisma';
import {CANDIDATE_COOKIE,candidateForToken} from '@/lib/employer-auth.mjs';
import {candidateReturnPath} from '@/lib/candidate-links.mjs';
import {AccountAuth} from '@/components/account-auth';
import '@/components/employer.css';
export const dynamic='force-dynamic';
export default async function CandidatesPage({searchParams}:{searchParams:Promise<{mode?:string;next?:string}>}){
 const {mode,next}=await searchParams,home=candidateReturnPath(next);const user=await candidateForToken(prisma,(await cookies()).get(CANDIDATE_COOKIE)?.value);if(user&&mode!=='recover')redirect(home);
 return <main className="section employer-section"><div className="employer-layout"><section><p className="eyebrow">FOR JOB SEEKERS</p><h1>Build a life outdoors.</h1><p className="lead">Find your next role as an educator, guide, instructor, or camp counsellor.</p><ol className="employer-steps"><li><strong>Make the search yours.</strong><span>Keep a private profile with your experience, skills, certifications, and CV link.</span></li><li><strong>Keep good opportunities close.</strong><span>Save jobs from the directory and return to them from your candidate workspace.</span></li><li><strong>Apply with the employer. Track it here.</strong><span>Follow the vacancy’s application instructions, then record progress and private notes in your tracker.</span></li></ol><p className="muted">Browsing and applying through employer links do not require an account. Your candidate profile is private and is not sent to employers automatically.</p><Link className="text-link" href="/jobs">Explore outdoor jobs →</Link></section><AccountAuth accountType="CANDIDATE" nextPath={home} initialMode={mode==='login'?'login':mode==='recover'?'recover':'register'}/></div></main>;
}
