# Weekly job importer

The importer reads the live organization directory, follows official careers links,
and collects individual `JobPosting` records, verified HTML vacancy pages with
application links, and public Greenhouse/Lever feeds.
It does not turn keyword matches, training courses, or navigation links into jobs.
Historical organizations and unverified sources are disabled in `data/job-sources.json`.
The curated About paragraphs are never changed by this job importer.

Transient HTTP 408/429/500/502/503/504 and network failures receive up to two
retries with backoff. Forbidden requests are not retried. Verified JazzHR boards
are followed through individual application links; shared YMCA boards are scoped
to the named camp. Verified Paylocity boards can opt into `render: true` in the
source registry. Chromium renders those public pages only after robots and HTTP
checks succeed. It does not solve CAPTCHAs or override access blocks.

For local browser-enabled sources, install Chromium with
`pnpm exec playwright install chromium`. The cloud workflow installs Chromium and
its Linux dependencies automatically.

## Organization identity assets

`data/organization-websites.json` fills the missing official website links from
the researched directory sources. `data/organization-logos.json` records image
provenance, local asset paths, and display backgrounds. Brand logos and website
icons are stored under `public/organization-logos` to avoid runtime hotlinking.
Some icons are cached website favicons rather than full wordmarks. Images were
visually reviewed to remove accreditation and sponsor marks. North Star Camps
(unverified identity) and the closed YMCA Camp Flaming Arrow use initials because
an appropriate logo was not verified. No logo was invented for those records.

## Commands

```sh
pnpm jobs:sync                         # preview all sources
pnpm jobs:sync --org teton-science-schools
pnpm jobs:sync --write                 # synchronize the website database
pnpm test:jobs
```

`DATABASE_URL` is required. A local `.env` is loaded if present. By default reports
are written to `work/weekly-jobs-report.json`; use `--report` for another path.

## Publication and closure rules

An automatic publication needs a real vacancy record with a title, substantive
description, official source link, and matching employer. Missing locations are
displayed as `Not specified`; missing work types use the `UNSPECIFIED` enum value.
Unknown work types are not guessed from references to other staff.
Sources shared by several camps require the specific camp to be mentioned.
Ambiguous, incomplete, future-dated, or old records go to `OpportunityIntake` with
`NEEDS_REVIEW`; explicit rejections and manually managed jobs are preserved.
Validated official records are automatically approved under the website owner's
authorization, with `sourceChannel=OFFICIAL_CAREERS_AUTO`. Source evidence,
original links, last-seen timestamps, and stable identity keys remain in intake.

An explicit passed deadline archives an imported job. Absence archives a job only
after two complete, healthy official-feed snapshots separated by at least six days.
HTTP errors, robots exclusions, partial HTML crawls, and blocked pages never count
as proof of closure. Existing manually entered jobs are never archived by this task.
Concurrent cloud runs are serialized by the workflow concurrency group.

## Activate the cloud schedule

The workflow is `.github/workflows/weekly-jobs.yml`. It requests a run every Monday
at 02:30 UTC (08:00 Asia/Kolkata), independent of the laptop. GitHub may delay a
scheduled run; the workflow must exist on the repository's default branch.

1. Publish the reviewed source changes to the GitHub repository connected to this website.
2. Add `DATABASE_URL` as an encrypted repository Actions secret. Use a PostgreSQL
   connection that can read organizations and synchronize jobs and opportunity intakes.
   Never commit `.env`, database passwords, or secret values to Git.
3. Enable GitHub Actions and run **Weekly official job openings** manually with
   `preview_only=true`. Review the downloaded source report.
4. Run with `preview_only=false` for the first synchronization. Weekly scheduled runs
   then use write mode automatically. Each run retains its report for 30 days.

The existing database must match `prisma/schema.prisma`, including the
`opportunity_intakes` table. The write workflow applies the additive migration that
adds `UNSPECIFIED` to `WorkType`. No job columns are removed or replaced.
Deploy the accompanying website changes to show original vacancy/application links,
last-checked dates, and unknown sponsorship wording correctly.

## Coverage limits

Some sites block automated requests, serve vacancies only through browser scripts,
publish PDF-only listings, or use unsupported hiring systems. These are reported for
source-specific adapters. The collector respects robots exclusions, uses bounded
requests, caps response sizes, caches shared pages, and spaces requests to each host.
It never attempts to bypass access controls or CAPTCHAs.
