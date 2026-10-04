import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/job-card";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; country?: string; type?: string; visa?: string }>;
}) {
  const params = await searchParams;
  const q = params?.q?.toLowerCase();
  const country = params?.country;
  const type = params?.type;
  const visaOnly = params?.visa === "true" || params?.visa === "on";

  const rawJobs = await prisma.job.findMany({
    where: {
      status: "PUBLISHED",
      reviewedByAdmin: true,
      ...(country && country !== "all" ? { country: { equals: country, mode: "insensitive" } } : {}),
      ...(type && type !== "all" ? { workType: type as any } : {}),
      ...(visaOnly ? { visaSponsorship: true } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { region: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
          country: true,
          region: true,
          logoUrl: true,
          verified: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const jobs = rawJobs.map((job) => ({
    id: job.id,
    title: job.title,
    slug: job.slug,
    summary: job.description,
    jobType: job.workType,
    sponsorshipAvailable: job.visaSponsorship,
    location: job.region ? `${job.region}, ${job.country}` : job.country,
    organization: {
      name: job.organization.name,
      slug: job.organization.slug,
      verified: job.organization.verified,
      logoUrl: job.organization.logoUrl,
    },
  }));

  return (
    <main className="container" style={{ padding: "4rem 1.5rem" }}>
      <p className="eyebrow">GLOBAL JOB BOARD</p>
      <h1>Outdoor opportunities</h1>

      {/* Filter Bar */}
      <form method="GET" action="/jobs" className="filters" style={{ display: "flex", gap: "1rem", margin: "2rem 0", flexWrap: "wrap" }}>
        <input
          name="q"
          defaultValue={params?.q || ""}
          placeholder="Search roles or organization"
          className="input"
        />
        <select name="country" defaultValue={params?.country || "all"}>
          <option value="all">Any country</option>
          <option value="India">India</option>
          <option value="Germany">Germany</option>
        </select>
        <select name="type" defaultValue={params?.type || "all"}>
          <option value="all">Any role type</option>
          <option value="SEASONAL">Seasonal</option>
          <option value="GAP_YEAR">Gap Year</option>
          <option value="FULL_TIME">Full Time</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" name="visa" defaultChecked={visaOnly} />
          Visa options
        </label>
        <button type="submit" className="button">Apply filters</button>
      </form>

      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        {jobs.length} {jobs.length === 1 ? "opportunity" : "opportunities"} found
      </p>

      <div className="grid">
        {jobs.length === 0 ? (
          <p className="text-muted">No published opportunities match your criteria.</p>
        ) : (
          jobs.map((job) => (
            // @ts-expect-error mapped for UI card props
            <JobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </main>
  );
}