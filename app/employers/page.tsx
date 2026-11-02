import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {EMPLOYER_COOKIE,employerForToken} from '@/lib/employer-auth.mjs';
import {accountReturnPath} from '@/lib/candidate-links.mjs';
import {EmployerAuth} from '@/components/employer-auth';
import '@/components/employer.css';
export const dynamic='force-dynamic';
export default async function EmployersPage({searchParams}:{searchParams:Promise<{mode?:string;next?:string}>}){
 const {mode,next}=await searchParams,home=accountReturnPath(next,'/dashboard');
 const user=await employerForToken(prisma,(await cookies()).get(EMPLOYER_COOKIE)?.value);if(user&&mode!=='recover')redirect(home);

 return <main className="section employer-section"><div className="employer-layout"><section><p className="eyebrow">FOR EMPLOYERS</p><h1>Find your next outdoor team.</h1><p className="lead">Reach people who want to teach, guide, and lead adventures.</p><ol className="employer-steps"><li><strong>Create your employer account.</strong><span>One place for your vacancies and review status.</span></li><li><strong>Tell us about the role.</strong><span>Choose your organization or introduce a new one. Add the location, requirements, and application link.</span></li><li><strong>We check it, then publish.</strong><span>The site owner reviews each vacancy. Approved jobs appear in the directory and on the organization’s page.</span></li></ol><p className="muted">For camps, outdoor education providers, adventure operators, and organizations hiring outdoor professionals worldwide.</p></section><EmployerAuth nextPath={home} initialMode={mode==='login'?'login':mode==='recover'?'recover':'register'}/></div></main>;
}
