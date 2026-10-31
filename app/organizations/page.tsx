import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { organizationIdentity } from "@/lib/organization-identity";
import { OrganizationLogo } from "@/components/organization-logo";
export const dynamic = "force-dynamic";
export default async function OrganizationsPage({ searchParams }: { searchParams?: Promise<{ q?: string; country?: string }> }) {
  const params = await searchParams;
  const query = params?.q?.trim().slice(0, 120) || "";
  const country = params?.country?.trim() || "";
  const organizations = await prisma.organization.findMany({
    where: {
      ...(country ? { country } : {}),
      ...(query ? { OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
        { region: { contains: query, mode: "insensitive" as const } },
      ] } : {}),
    },
    include: { _count: { select: { jobs: { where: { status: "PUBLISHED", reviewedByAdmin: true } } } } },
    orderBy: { name: "asc" },
  });
  const countries = await prisma.organization.findMany({ select: { country: true }, distinct: ["country"], orderBy: { country: "asc" } });
  return <main className="section organization-directory">
    <header style={{ marginBottom: "2.5rem" }}>
      <p className="eyebrow">DIRECTORY</p><h1>Outdoor Organizations</h1>
      <p className="muted">Explore {organizations.length} outdoor programmes, expedition operators, and wilderness schools.</p>
    </header>
    <form className="filters" action="/organizations">
      <input name="q" defaultValue={query} placeholder="Search organizations, roles, or regions" aria-label="Search organizations" />
      <select name="country" defaultValue={country} aria-label="Filter by country">
        <option value="">All countries and regions</option>
        {countries.map(item => <option key={item.country} value={item.country}>{item.country}</option>)}
      </select>
      <button type="submit">Find organizations</button>
      {(query || country) && <Link href="/organizations" className="text-link">Clear filters</Link>}
    </form>
    {organizations.length === 0 && <p>No organizations match these filters.</p>}
    <div className="grid">{organizations.map(org => {
      const identity = organizationIdentity(org);
      return <article key={org.id} className="card organization-card">
        <div className="organization-card-meta"><span className="eyebrow">{org.verified ? "✓ Verified Partner" : "Organization"}</span><span>{org.country}</span></div>
        <Link href={`/organizations/${org.slug}`} className="organization-card-heading">
          <OrganizationLogo name={org.name} src={identity.logo} darkBackground={identity.darkBackground} /><h3>{org.name}</h3>
        </Link>
        <p className="muted organization-description">{org.description}</p>
        <div className="organization-card-footer">
          <Link href={`/organizations/${org.slug}#current-openings`} className="text-link">{org._count.jobs} open {org._count.jobs === 1 ? "role" : "roles"}</Link>
          {identity.website && <a href={identity.website} target="_blank" rel="noopener noreferrer" className="text-link" aria-label={`Visit ${org.name} website`}>Website ↗</a>}
        </div>
      </article>;
    })}</div>
  </main>;
}
