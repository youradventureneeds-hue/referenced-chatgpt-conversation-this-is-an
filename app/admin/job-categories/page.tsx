import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminConfigured,validAdminSession} from '@/lib/admin-access';
import {AdminSignIn} from '@/components/admin-sign-in';
import {JobCategoryAdmin} from '@/components/job-category-admin';
import '@/components/employer.css';
export const dynamic='force-dynamic';
export default async function JobCategoriesPage(){const signedIn=validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);return <main className="section employer-section"><p className="eyebrow">ADMINISTRATION</p><h1>Job categories</h1>{signedIn?<JobCategoryAdmin/>:adminConfigured()?<AdminSignIn/>:<p>Administrator access is not configured.</p>}</main>;}
