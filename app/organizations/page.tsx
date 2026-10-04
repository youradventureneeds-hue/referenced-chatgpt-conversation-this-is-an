import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          jobs: {
            where: { status: "PUBLISHED", reviewedByAdmin: true },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="container" style={{ padding: "4rem 1.5rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <p className="eyebrow">DIRECTORY</p>
        <h1>Outdoor Organizations</h1>
        <p className="muted">
          Browse verified programmes, expedition operators, and wilderness schools.
        </p>
      </header>

      <div className="grid">
        {organizations.map((org) => (
          <article key={org.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span className="eyebrow">
                {org.verified ? "✓ Verified Partner" : "Organization"}
              </span>
              <span>{org.country}</span>
            </div>
            <h3>
              <Link href={`/organizations/${org.slug}`} className="text-link">
                {org.name}
              </Link>
            </h3>
            <p className="muted" style={{ margin: "0.5rem 0 1rem" }}>
              {org.description}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="tags">
                <span>{org._count.jobs} open roles</span>
              </div>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Visit Website ↗
                </a>
              )}
            </div>
            {organizations.map((org) => (
  <Link 
    key={org.id} 
    href={`/organizations/${org.slug}`} 
    style={{ textDecoration: "none", color: "inherit" }}
  >
    <article style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "2rem", height: "100%", background: "#fff" }}>
      {/* Card content here */}
    </article>
  </Link>
))}
          </article>
        ))}
      </div>
    </main>
  );
}
