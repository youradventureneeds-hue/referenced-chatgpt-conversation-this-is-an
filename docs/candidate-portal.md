# Candidate accounts and private workspaces

Job seekers register or sign in at `/candidates` and manage their workspace at `/candidate/dashboard`. The header's My account link leads to `/account`, which opens a signed-in user's workspace or offers candidate and employer entry points. A user email belongs to one account type; an existing account is not silently converted between candidate and employer roles.

Candidates can maintain a private name, headline, location, biography, skills, certifications, and HTTPS CV link. The site does not upload or download CV files. Profiles and CV links are not made public or automatically shared with employers. Nationality is not collected in this flow.

## Saved jobs and application tracking

Every published, approved job detail page has Save this job and Track this application controls. A candidate can bookmark a vacancy and start tracking it as Planning to apply. Applied externally requires an explicit confirmation that the candidate completed the employer's application process. Actual applications continue through the vacancy's application link or the employer's instructions.

The tracker supports private candidate-reported statuses and notes: planning, applied externally, interview, offer received, not selected, and withdrawn. It does not send an application, attach a CV, notify an employer, or receive hiring decisions. Records live separately from the legacy employer-facing Application model so a bookmark or tracker update cannot be mistaken for a delivered application.

Saved jobs and tracked applications preserve the original public title, organization, and country. A removed or unpublished vacancy loses its active link without exposing later private draft changes. If a job is deleted, its optional foreign key becomes null and the candidate retains their own snapshot. Removing a bookmark does not remove its tracker record. Each list holds up to 500 entries.

## Authentication and privacy

Candidate and employer accounts share the password hashing, opaque database-session, recovery-code, and persistent rate-limit implementation. Candidate and employer session cookies are separate, and every protected request checks the account's current database role. Copying one role's cookie to the other cookie name does not grant access. No self-service account type can register as ADMIN. Signup defaults to employer for compatibility with the existing employer form; candidate forms explicitly send CANDIDATE.

Candidate sessions last seven days. Recovery codes are shown once, stored as digests, replaced after recovery, and invalidate that user's old sessions. Password recovery does not change account role. Recovery and sign-out affect the relevant account; candidate actions do not authorize employer APIs or private admin review. Email verification and automated email notifications are not configured.

All profile changes, bookmarks, and tracker mutations require same-origin authenticated requests. Writes bind the user ID from the session rather than trusting form fields. Candidates cannot read or modify another person's data. After sign-in from a job, only a validated local `/jobs/<slug>` path is allowed as the return destination. Employers and administrators receive no candidate-profile browsing feature in this release. Account-removal requests use the published support contact.

## Deployment and tests

Apply `prisma/migrations/20261102100000_candidate_portal/migration.sql` before deploying the generated client. It adds the saved_jobs and candidate_applications tables, using existing user, job, and candidate profile tables. Existing public listings and employer submissions are retained. No new provider or deployment secrets are required.

Run `pnpm test:candidates` for candidate session, cookie, and return-path checks. The existing `pnpm test:employers:integration` suite now exercises both portals against an isolated test schema, including cross-role access, ownership checks, private profile data, duplicate saves, external-application confirmation, unavailable vacancies, deletion-safe snapshots, recovery, and the employer approval flow. See the employer guide for generating the schema SQL and opting into the isolated database tests. The GitHub portal-check workflow runs these tests against its own disposable PostgreSQL service and builds the website.
