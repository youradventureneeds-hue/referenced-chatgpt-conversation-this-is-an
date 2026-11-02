import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {CandidateJobActions} from "@/components/candidate-job-actions";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const job = await prisma.job.findUnique({
    where: {
      slug: slug,
    },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
          country: true,
          region: true,
          website: true,
          description: true,
          verified: true,
        },
      },
    },
  });

  // Trigger Next.js 404 screen if no matching published job is found
  if (!job || job.status !== "PUBLISHED" || !job.reviewedByAdmin) {
    notFound();
  }

  const importedSource = ["OFFICIAL_CAREERS_AUTO","INSTAGRAM","WEBSITE","EMPLOYER_SUBMISSION"].includes(job.sourceChannel||"")
    ? await prisma.opportunityIntake.findUnique({
        where: { approvedJobId: job.id },
        select: { sourceUrl: true, extraction: true },
      })
    : null;
  const sourceUrl = importedSource?.sourceUrl && /^https?:\/\//i.test(importedSource.sourceUrl)
    ? importedSource.sourceUrl : null;
  const sourceMetadata = importedSource?.extraction as { applicationUrl?: string; scraper?: { lastSeenAt?: string }; instagram?: {collectedAt?:string}; verification?:{checkedAt?:string}; compensation?:{period?:string} } | undefined;
  const lastChecked = sourceMetadata?.verification?.checkedAt||sourceMetadata?.scraper?.lastSeenAt||sourceMetadata?.instagram?.collectedAt;
  const applicationUrl=sourceMetadata?.applicationUrl&&/^https?:\/\//i.test(sourceMetadata.applicationUrl)?sourceMetadata.applicationUrl:sourceUrl;

  const formattedSalary =
    job.salaryMin && job.salaryMax
      ? `${job.salaryMin.toLocaleString()}${job.salaryMin===job.salaryMax?"":` - ${job.salaryMax.toLocaleString()}`} ${job.currency}${sourceMetadata?.compensation?.period==="MONTH"?" / month":""}`
      : "Stipend / Package details on request";

  return (
    <main className="container" style={{ padding: "4rem 1.5rem", maxWidth: "860px", margin: "0 auto" }}>
      <nav style={{ marginBottom: "2rem" }}>
        <Link href="/jobs" className="text-link">
          ← Back to all opportunities
        </Link>
      </nav>

      <header style={{ marginBottom: "2rem", borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
          <span className="eyebrow">
            {job.organization.verified ? "✓ Verified Organization" : "Organization"}
          </span>
          <span>·</span>
          <Link href={`/organizations/${job.organization.slug}`} className="text-link">{job.organization.name}</Link>
        </div>

        <h1 style={{ fontSize: "2.5rem", lineHeight: 1.15, marginBottom: "1rem" }}>{job.title}</h1>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "#666" }}>
          <span>📍 {job.region ? `${job.region}, ${job.country}` : job.country}</span>
          <span>💼 {job.workType === "UNSPECIFIED" ? "Work type not specified" : job.workType.replace("_", " ")}</span>
          <span>💰 {formattedSalary}</span>
        </div>
      </header>

      <section className="candidate-job-detail-grid" style={{ display: "grid", gap: "2rem", gridTemplateColumns: "2fr 1fr" }}>
        <div>
          <h2>About the Opportunity</h2>
          <p style={{ lineHeight: 1.7, marginTop: "1rem", whiteSpace: "pre-line" }}>
            {sourceUrl ? job.description.split("\n\nOriginal vacancy:")[0] : job.description}
          </p>
          {sourceUrl && <p className="muted">{job.sourceChannel==="INSTAGRAM"?(sourceMetadata?.verification?.checkedAt?"Recruitment details reviewed from Instagram and checked against the employer’s careers page.":"Recruitment details reviewed from Instagram."):job.sourceChannel==="EMPLOYER_SUBMISSION"?"Submitted by an employer and approved by the site owner.":"Checked against the employer’s official careers page."}
            {lastChecked && <> Last checked {new Date(lastChecked).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })}.</>}
            {" "}<a className="text-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">{job.sourceChannel==="INSTAGRAM"?"View Instagram source ↗":"Read the full vacancy ↗"}</a>
          </p>}

          <h3 style={{ marginTop: "2rem" }}>Visa & Work Eligibility</h3>
          <p style={{ lineHeight: 1.6, color: "#444" }}>
            {importedSource && !job.visaSponsorship
              ? "Work authorization and sponsorship were not confirmed. Check the employer’s original listing."
              : job.visaSponsorship
              ? `✓ Visa sponsorship available: ${job.visaEligibilityNote || "Check program requirements."}`
              : `✕ No sponsorship: ${job.visaEligibilityNote || "Candidates must hold valid work authorization."}`}
          </p>
        </div>

        <aside style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", height: "fit-content" }}>
          <h3>Organization Overview</h3>
          <p style={{ fontSize: "0.95rem", color: "#555", margin: "0.75rem 0 1.25rem" }}>
            {job.organization.description}
          </p>
          <p><Link href={`/organizations/${job.organization.slug}#current-openings`} className="text-link">View organization and current openings ↗</Link></p>

          {job.organization.website && (
            <a
              href={job.organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
              style={{ display: "inline-block", marginBottom: "1.5rem" }}
            >
              Visit website ↗
            </a>
          )}

          {applicationUrl ? <a className="button" href={applicationUrl} target="_blank" rel="noopener noreferrer"
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem 1rem" }}>{job.sourceChannel==="INSTAGRAM"&&!sourceMetadata?.applicationUrl?"View recruitment source ↗":"Apply on employer’s website ↗"}</a> : <p>See the job description for application instructions, or contact the organization through its website.</p>}
          <CandidateJobActions jobId={job.id} slug={job.slug}/>
        </aside>
      </section>
    </main>
  );
}
