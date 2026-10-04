# The Great Indian Outdoors MVP architecture

## Product boundary

The Great Indian Outdoors is a global marketplace for outdoor careers and gap-year programs. Candidates discover roles by location, work type and visa path; employers create trusted organization profiles and manage applications; administrators moderate supply and safety.

## Stack

- **Web:** Next.js App Router + TypeScript, server-rendered discovery pages.
- **API:** Route handlers under `/api`, with Zod validation at the edge.
- **Data:** PostgreSQL with Prisma. The schema is in `prisma/schema.prisma`; the current UI uses small demo records in `lib/data.ts` until `DATABASE_URL` is configured.
- **Authentication:** Add an auth provider (Auth.js or Clerk) with email/password and OAuth. Its user ID maps directly to `User.id`; enforce role checks server-side.
- **Files/search:** Store resumes and organization logos in S3-compatible object storage. Add PostgreSQL full-text search first, then Algolia/Meilisearch when scale warrants it.

## Main entities and permissions

| Role | Core capabilities |
| --- | --- |
| Candidate | Profile, citizenship/visa metadata, saved jobs, applications |
| Employer | Organization membership, create/edit jobs, view applications |
| Admin | Verify organizations, moderate listings, dashboards and reports |

Jobs belong to organizations; applications join candidates to jobs. Visa fields are explicit on each job (`sponsorshipAvailable`, eligible citizenships and notes), avoiding a misleading one-size-fits-all eligibility calculation.

## API surface

| Endpoint | Method | MVP purpose |
| --- | --- | --- |
| `/api/jobs?q=&country=&type=&visa=` | GET | Search published jobs |
| `/api/organizations` | GET | Browse directory |
| `/api/auth/register` | POST | Validate account registration payload |
| `/api/admin/stats` | GET | Admin dashboard summary |

Next endpoints after authentication: `POST /api/jobs`, `PATCH /api/jobs/:id`, `POST /api/jobs/:id/applications`, `GET /api/me/applications`, and organization claim/verification routes. Each mutating route must verify session + role + organization membership.

## Operating flow

1. Employer registers, creates or claims an organization, and submits a job.
2. Admin verifies the organization/listing where required; the job is published.
3. Candidate searches based on skills, geography, season and visa metadata, then applies.
4. Employer moves applications through the status pipeline; candidates see their status in their dashboard.

## Opportunity-intelligence automation

The collection pipeline accepts content from Instagram, YouTube, websites, newsletters, job boards, creator submissions and employer submissions:

`Source → intake record → AI extraction → fingerprint duplicate check → eligibility extraction → human review → published job`

`IntakeSource` stores the publisher/channel; `IntakeItem` retains the original text, extracted structured content, source URL, hash fingerprint, review decision and notes. The `/api/intake` endpoint demonstrates this flow with an extract-and-review adapter. It never publishes a role automatically.

For production, scheduled source connectors should write raw material to `IntakeItem`. Replace `extractOpportunity()` in `lib/intake.ts` with an AI structured-output call validated against a Zod schema. Reviewers approve or reject from `/admin`; an approval transaction should create a `Job`, retain the source link, and mark the intake item approved. Source fetching must respect each platform's API, terms, permissions and rate limits—never scrape accounts or private newsletters without authorization.

## Local setup

1. Copy `.env.example` to `.env` and supply a PostgreSQL connection string.
2. Run `npm install`, then `npm run db:generate` and `npm run db:migrate`.
3. Optionally run `npm run db:seed`, then `npm run dev`.

The application runs in demo-data mode for read paths before the persistence repositories are wired in. Registration intentionally validates but does not persist until the chosen auth/session provider is configured.
