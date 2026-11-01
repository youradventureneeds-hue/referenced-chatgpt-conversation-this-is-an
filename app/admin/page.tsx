import { IntakeQueue } from "@/components/intake-queue";
import "./intake.css";
import {cookies} from "next/headers";
import {ADMIN_COOKIE,adminConfigured,validAdminSession} from "@/lib/admin-access";
import {AdminSignIn} from "@/components/admin-sign-in";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function AdminPage() {
 const signedIn=validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
 if(!signedIn)return <main className="section"><p className="eyebrow">ADMINISTRATION</p><h1>Recruitment review</h1>{adminConfigured()?<AdminSignIn/>:<p>Administrator access is not available yet. Please contact the site owner.</p>}</main>;
 const [organizations,published,pending]=await Promise.all([prisma.organization.count(),prisma.job.count({where:{status:"PUBLISHED",reviewedByAdmin:true}}),prisma.opportunityIntake.count({where:{status:"NEEDS_REVIEW"}})]);
 return <main className="section"><p className="eyebrow">ADMINISTRATION</p><h1>Recruitment review</h1><div className="stats"><div><strong>{organizations}</strong><span>Organizations</span></div><div><strong>{published}</strong><span>Published jobs</span></div><div><strong>{pending}</strong><span>Opportunities to review</span></div></div><p><a className="button" href="/admin/instagram">Manage Instagram sources and scans →</a></p><IntakeQueue/><article className="card"><h2>Verify before publishing</h2><p>Check the employer, vacancy, location, eligibility, dates, and application instructions. Instagram and submitted leads require review before they appear on the job board.</p></article></main>;
}
