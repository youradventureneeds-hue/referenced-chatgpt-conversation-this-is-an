import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/job-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rawJobs = await prisma.job.findMany({
    where: {
      status: "PUBLISHED",
      reviewedByAdmin: true,
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
    <main>
      <section className="hero">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <p className="eyebrow">THE GREAT INDIAN OUTDOORS</p>
        <h1>
          Discover Indian Outdoors
          <br />
          Away from your desk.
        </h1>
        <p>
          Find meaningful outdoor careers, conservation work and gap-year
          opportunities—with the confidence to go further.
        </p>
        <form action="/jobs" className="search">
          <input
            name="q"
            placeholder="Search guide, instructor, conservation…"
          />
          <button>
            Explore opportunities <span>↗</span>
          </button>
        </form>
        <div className="hero-stats">
          <div>
            <strong>50+</strong>
            <span>field roles</span>
          </div>
          <div>
            <strong>12</strong>
            <span>regions to explore</span>
          </div>
          <div>
            <strong>1 place</strong>
            <span>to begin</span>
          </div>
        </div>
      </section>

      <section className="section discover">
        <div className="section-title">
          <div>
            <p className="eyebrow">FRESH OPPORTUNITIES</p>
            <h2>Make the next season count.</h2>
          </div>
          <Link href="/jobs">
            See all jobs <span>→</span>
          </Link>
        </div>
        <div className="grid">
          {jobs.length === 0 ? (
            <p className="text-muted">No published opportunities found.</p>
          ) : (
            jobs.map((job) => (
              // @ts-expect-error adapter mapped for UI props
              <JobCard key={job.id} job={job} />
            ))
          )}
        </div>
      </section>

      <section className="pathways">
        <div>
          <p className="eyebrow">A CLEARER PATH OUTSIDE</p>
          <h2>
            Whether you’re just starting out or building your next expedition.
          </h2>
        </div>
        <div className="pathway-grid">
          <article>
            <span>01</span>
            <h3>Discover</h3>
            <p>Search roles by place, season, work type and visa route.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Get ready</h3>
            <p>
              Build a profile that makes your field skills and availability
              clear.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Go further</h3>
            <p>
              Apply to trusted organizations shaping outdoor work worldwide.
            </p>
          </article>
        </div>
      </section>

      <section className="split">
        <div>
          <p className="eyebrow">FOR CANDIDATES</p>
          <h2>Travel-ready roles, without the guesswork.</h2>
          <p>
            Filter opportunities by visa pathway, season, location and work
            type. Keep your profile ready for the roles that fit.
          </p>
          <Link className="text-link" href="/jobs">
            Find your next role →
          </Link>
        </div>
        <div className="employer-panel">
          <p className="eyebrow">FOR EMPLOYERS</p>
          <h2>Hire people made for the field.</h2>
          <p>
            Publish jobs, manage applicants and build a trusted profile for your
            programme or organization.
          </p>
          <Link className="button" href="/dashboard">
            Start hiring <span>↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}