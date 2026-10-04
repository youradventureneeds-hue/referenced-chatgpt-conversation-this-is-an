import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
  if (!job || job.status !== "PUBLISHED") {
    notFound();
  }

  const formattedSalary =
    job.salaryMin && job.salaryMax
      ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${job.currency}`
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
          <span>{job.organization.name}</span>
        </div>

        <h1 style={{ fontSize: "2.5rem", lineHeight: 1.15, marginBottom: "1rem" }}>{job.title}</h1>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "#666" }}>
          <span>📍 {job.region ? `${job.region}, ${job.country}` : job.country}</span>
          <span>💼 {job.workType.replace("_", " ")}</span>
          <span>💰 {formattedSalary}</span>
        </div>
      </header>

      <section style={{ display: "grid", gap: "2rem", gridTemplateColumns: "2fr 1fr" }}>
        <div>
          <h2>About the Opportunity</h2>
          <p style={{ lineHeight: 1.7, marginTop: "1rem", whiteSpace: "pre-line" }}>
            {job.description}
          </p>

          <h3 style={{ marginTop: "2rem" }}>Visa & Work Eligibility</h3>
          <p style={{ lineHeight: 1.6, color: "#444" }}>
            {job.visaSponsorship
              ? `✓ Visa sponsorship available: ${job.visaEligibilityNote || "Check program requirements."}`
              : `✕ No sponsorship: ${job.visaEligibilityNote || "Candidates must hold valid work authorization."}`}
          </p>
        </div>

        <aside style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", height: "fit-content" }}>
          <h3>Organization Overview</h3>
          <p style={{ fontSize: "0.95rem", color: "#555", margin: "0.75rem 0 1.25rem" }}>
            {job.organization.description}
          </p>

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

          <button
            className="button"
            style={{ width: "100%", textAlign: "center", padding: "0.75rem 1rem" }}
          >
            Apply for position
          </button>
        </aside>
      </section>
    </main>
  );
}