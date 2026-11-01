# The Great Indian Outdoors

An MVP scaffold for global outdoor careers and gap-year opportunities. See [ARCHITECTURE.md](ARCHITECTURE.md) for the product, data and API design.

## Included

- Polished marketing home page and responsive job board
- Job and organization detail pages
- Visa/sponsorship search metadata
- Candidate/employer account entry points
- Admin dashboard preview and API routes
- Opportunity intake, extraction, duplicate checking and human-review queue
- PostgreSQL Prisma schema and starter seed

## Run it

Copy `.env.example` to `.env`, install dependencies, create the database schema, then run `npm run dev`.

## Excel careers importer

Requires Node.js 22+ and installed dependencies (`pnpm install`). By default it reads
`data/Outdoor_Education_Jobs_USA_Expanded.xlsx`. The first sheet must contain `Organization`
and `Recruitment Page`. `Location` maps to the organization's region; add a `Country`
column when the location does not identify a US state or the UK. An optional `Website`
column sets the organization's website. Category and contact email remain in the workbook
and JSON report; they are not fields in the current database schema.

```sh
# Validate all rows without accessing websites or the database
pnpm scrape:excel --offline

# Preview five live recruitment pages, without database changes
pnpm scrape:excel --limit 5

# Import all rows using DATABASE_URL from the environment or project .env
pnpm scrape:excel --write

# Run checks without network or database access
pnpm test:scraper
```

Use `--file path/to/file.xlsx` for another workbook and `--report path/to/report.json`
for a custom report destination. The default report is `work/excel-import-report.json`.
Preview is the default; only `--write` updates the database. Organizations are matched by
slug or existing name so repeat imports do not create duplicate organizations.
Imports preserve existing descriptions, verification status, and logos. Existing job
titles are preserved when extraction fails or finds no titles. Review the JSON report
for errors and warnings; it is overwritten on each run unless a different path is given.

Extraction prefers unexpired `JobPosting` JSON-LD, then likely role titles in static HTML
headings, links, and list items. Fallback titles need review: they may not be current jobs.
JavaScript-only portals and blocked websites may require site-specific adapters.
Up to three organizations are processed concurrently; shared pages are fetched once
and requests to the same host are serialized. Requests time out after 20 seconds.
For moved pages (404/410), the importer checks the
official homepage for a replacement careers link. When no titles are found, it checks up
to three linked careers pages or supported hiring portals. Titles populate organization profiles, not published
`Job` records. Job-board counts still reflect separately reviewed and published jobs.

## Organization About paragraphs

The curated descriptions and research URLs are in `data/organization-about.json`.
Every description is one paragraph of exactly 60 whitespace-separated words.
`pnpm db:about` validates and previews the dataset; `pnpm db:about --write` updates
only descriptions in the database, preserving other organization information.
The update checks organization names and slugs, backs up previous descriptions in
`work/`, and writes all descriptions in a single transaction. Historical closures
and information that could not be verified are identified in the descriptions.

## Weekly job openings

`pnpm jobs:sync` previews official vacancy collection; `pnpm jobs:sync --write`
synchronizes validated openings into published jobs and retains uncertain records
in the intake review queue. Run `pnpm test:jobs` for the collection and lifecycle checks.
The weekly GitHub Actions workflow is prepared in `.github/workflows/weekly-jobs.yml`.
It requires activation in GitHub and a `DATABASE_URL` repository secret before it runs.
See [the operating guide](docs/weekly-job-import.md) for publication rules, source
coverage, closure handling, activation, and the Monday 08:00 India-time schedule.

## Website Instagram controls

Manage collection, employer sources, connection updates, and scan history at `/admin/instagram`. Review and publish leads at `/admin`. See [the administrator guide](docs/instagram-admin.md). The cloud worker checks due work every 15 minutes; the scan interval defaults to six hours with India sources.
