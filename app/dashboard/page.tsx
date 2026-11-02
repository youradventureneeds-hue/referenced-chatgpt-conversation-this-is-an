import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {EMPLOYER_COOKIE,employerForToken} from '@/lib/employer-auth.mjs';
import {EmployerDashboard} from '@/components/employer-dashboard';
import '@/components/employer.css';
export const dynamic='force-dynamic';
export default async function Dashboard(){const user=await employerForToken(prisma,(await cookies()).get(EMPLOYER_COOKIE)?.value);if(!user)redirect('/employers?mode=login');const organizations=await prisma.organization.findMany({select:{id:true,name:true,website:true,country:true,description:true},orderBy:{name:'asc'}});return <main className="section employer-section"><EmployerDashboard user={user} organizations={organizations}/></main>;}
