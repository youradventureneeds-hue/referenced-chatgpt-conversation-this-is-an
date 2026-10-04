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
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <nav style={{ marginBottom: "2rem" }}>
        <Link href="/organizations" style={{ color: "#0066cc", textDecoration: "none", fontWeight: 500 }}>
          ← Back to all organizations
        </Link>
      </nav>

      {/* Header Banner Section */}
      <section
        style={{
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          paddingBottom: "2.5rem",
          marginBottom: "3rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.8rem",
              background: "#e6f4ea",
              color: "#137333",
              padding: "0.25rem 0.65rem",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            ✓ Verified Outdoor Partner
          </span>
          <span style={{ color: "#666" }}>•</span>
          <span style={{ color: "#666" }}>📍 {org.region}, {org.country}</span>
        </div>

        <h1 style={{ fontSize: "2.75rem", fontWeight: 700, margin: "0.5rem 0 1rem", lineHeight: 1.15 }}>
          {org.name}
        </h1>

        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "#111",
              color: "#fff",
              padding: "0.6rem 1.25rem",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          >
            Visit Official Website ↗
          </a>
        )}
      </section>

      {/* Profile Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "3.5rem" }}>
        {/* Main Column: Story & Ethos */}
        <div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Organizational Overview & Mission</h2>
          <div
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.8,
              color: "#2c3e50",
              whiteSpace: "pre-line",
            }}
          >
            {org.description}
          </div>
        </div>

        {/* Sidebar: Open Positions & Footprint */}
        <aside>
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Operational Footprint</h3>
            <p style={{ margin: "0.25rem 0", color: "#4b5563" }}>
              <strong>Base:</strong> {org.region}
            </p>
            <p style={{ margin: "0.25rem 0", color: "#4b5563" }}>
              <strong>Country:</strong> {org.country}
            </p>
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
              Open Placements ({org.jobs.length})
            </h3>
            {org.jobs.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>No active openings right now.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {org.jobs.map((job) => (
                  <li key={job.id} style={{ marginBottom: "0.75rem" }}>
                    <Link
                      href={`/jobs/${job.slug}`}
                      style={{
                        color: "#0066cc",
                        textDecoration: "none",
                        fontWeight: 500,
                        fontSize: "0.95rem",
                      }}
                    >
                      {job.title} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}