import {jobCategoryLabel} from '@/lib/job-categories.mjs';
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { organizationIdentity } from "@/lib/organization-identity";
import { OrganizationLogo } from "@/components/organization-logo";

export const dynamic = "force-dynamic";

export default async function OrganizationShowcasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      jobs: {
        where: { status: "PUBLISHED", reviewedByAdmin: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          workType: true,
          category: true,
          country: true,
          region: true,
        },
      },
    },
  });

  if (!org) {
    notFound();
  }
  const identity = organizationIdentity(org);

  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      
      {/* 1. Header Section */}
      <header style={{ marginBottom: "3rem", borderBottom: "1px solid #eaeaea", paddingBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
          {org.verified && (
            <span style={{ background: "#e6f4ea", color: "#137333", padding: "0.25rem 0.75rem", borderRadius: "16px", fontSize: "0.875rem", fontWeight: "bold" }}>
              ✓ Verified Outdoor Partner
            </span>
          )}
          <span style={{ color: "#666", fontSize: "0.875rem" }}>
            📍 {org.region || org.country}
          </span>
        </div>
        
        <div className="organization-profile-heading">
          <OrganizationLogo name={org.name} src={identity.logo} darkBackground={identity.darkBackground} large />
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "800", margin: "0", color: "#1a1a1a" }}>
          {org.name}
        </h1>
        </div>
        
        {identity.website && (
          <a href={identity.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#1a1a1a", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "8px", textDecoration: "none", fontWeight: "500", overflowWrap: "anywhere" }}>
            Visit Official Website ↗
            <span style={{ display: "block", fontSize: "0.8rem", opacity: 0.85 }}>{new URL(identity.website).hostname.replace(/^www\./, "")}</span>
          </a>
        )}
      </header>

      {/* 2. Main Content Grid */}
          <div className="organization-profile-grid">
        
        {/* Left Column: Deep Details */}
        <section>
          <h2 style={{ fontSize: "1.5rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            Organizational Overview & Mission
          </h2>
          <p style={{ lineHeight: "1.8", color: "#4a4a4a", fontSize: "1.1rem", marginBottom: "2rem" }}>
            {org.description || "Detailed overview coming soon."}
          </p>

          <h2 style={{ fontSize: "1.5rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            Core Expeditions & Programs
          </h2>
          <p style={{ lineHeight: "1.8", color: "#4a4a4a" }}>
            {org.description || "Information on expeditions and courses will be listed here."}
          </p>

          {/* CURRENT OPENINGS - NOW SAFELY IN THE WIDE LEFT COLUMN */}
          <h2 id="current-openings" style={{ fontSize: "1.5rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "0.5rem", marginBottom: "1.5rem", marginTop: "3rem" }}>
            Current Openings & Careers
          </h2>
          {org.jobs.length > 0 ? (
            <div className="organization-openings">
              <p className="muted">{org.jobs.length} current {org.jobs.length === 1 ? "opening" : "openings"}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem" }}>
                {org.jobs.map(job => (
                  <li key={job.id} style={{ border: "1px solid #e9ecef", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem" }}>
                    <Link href={`/jobs/${job.slug}`} className="text-link">{job.title} ↗</Link>
                    <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                      {[job.region, job.country].filter(Boolean).join(", ")} · {jobCategoryLabel(job.category)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ lineHeight: "1.8", color: "#4a4a4a" }}>
              No current openings.
            </p>
          )}
          {org.careersUrl && (
            <a href={org.careersUrl} target="_blank" rel="noopener noreferrer" className="text-link">
              Visit the official careers page ↗
            </a>
          )}
        </section>

        {/* Right Column: Fast Facts & Contact */}
        <aside style={{ background: "#f9fafb", padding: "2rem", borderRadius: "12px", height: "fit-content" }}>
          <h3 style={{ fontSize: "1.25rem", marginTop: "0", marginBottom: "1.5rem" }}>
            Operational Footprint
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <strong style={{ display: "block", color: "#666", fontSize: "0.875rem" }}>Base of Operations</strong>
              <span>{org.region || "Not specified"}</span>
            </div>
            <div>
              <strong style={{ display: "block", color: "#666", fontSize: "0.875rem" }}>Country</strong>
              <span>{org.country}</span>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}
