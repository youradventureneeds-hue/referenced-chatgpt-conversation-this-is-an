import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          workType: true,
          country: true,
          region: true,
        },
      },
    },
  });

  if (!org) {
    notFound();
  }

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
        
        <h1 style={{ fontSize: "3rem", fontWeight: "800", margin: "0 0 1rem 0", color: "#1a1a1a" }}>
          {org.name}
        </h1>
        
        {org.website && (
          <a href={org.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#1a1a1a", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "8px", textDecoration: "none", fontWeight: "500" }}>
            Visit Official Website ↗
          </a>
        )}
      </header>

      {/* 2. Main Content Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "3rem" }}>
        
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
          <h2 style={{ fontSize: "1.5rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "0.5rem", marginBottom: "1.5rem", marginTop: "3rem" }}>
            Current Openings & Careers
          </h2>
          
          {org.openJobs && org.openJobs !== "No explicit job listings found on page." ? (
            <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <div style={{ lineHeight: "1.8", color: "#4a4a4a", margin: 0 }}>
                {org.openJobs.split(' | ').map((job, idx) => (
                   <span key={idx} style={{ display: 'block', marginBottom: '0.5rem' }}>• {job}</span>
                ))}
              </div>
              {org.careersUrl && (
                <a href={org.careersUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "1rem", color: "#1a1a1a", textDecoration: "none", fontWeight: "600" }}>
                  Apply on Official Careers Page ↗
                </a>
              )}
            </div>
          ) : (
            <p style={{ lineHeight: "1.8", color: "#4a4a4a" }}>
              No automated listings found right now.
              {org.careersUrl && (
                <a href={org.careersUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1a1a1a", textDecoration: "underline", marginLeft: "0.5rem", fontWeight: "500" }}>
                  Check their careers portal manually ↗
                </a>
              )}
            </p>
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