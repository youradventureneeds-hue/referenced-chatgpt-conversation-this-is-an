# Employer accounts and job submissions

Employers register or sign in at `/employers`. Signed-in employers land at `/dashboard`, where they submit vacancies and view their own review status, reviewer feedback, and links to approved listings. Sessions last seven days and are revoked on sign-out or password recovery.

Registration provides a private recovery code once. Employers should save it in their password manager. The Recover account form accepts their email, that code, and a new password. Recovery replaces the code and revokes existing sessions. Passwords use salted scrypt hashes; recovery codes and opaque session tokens are stored as SHA-256 digests. There is no email-delivery dependency or automatic verification email. The reviewer must verify the submitter's email and employer affiliation.

## Approval workflow

Every submission creates a private `EMPLOYER_SUBMISSION` intake record with status `NEEDS_REVIEW`, bound to the authenticated employer. User-supplied owner IDs, review status, or account roles cannot override these values. Submissions grant no organization membership or access to existing jobs. Employers can submit for a listed organization or propose an unlisted employer with its website, country, and a 60-word overview. Neither a new organization nor its job is made public before approval.

At `/admin`, check the contact, organization website, affiliation, vacancy, location, qualifications, and application instructions. Correct the job details as needed and tick the verification checkbox. For an unlisted employer, explicitly confirm creating its organization page. Approval atomically creates the job and, if necessary, organization; simultaneous approvals cannot publish duplicates. A new organization starts without a verification badge. The careers or application page is recommended rather than required. Employers can leave it blank and describe how to apply in the job description. Missing links remain absent; private account contact details are not copied into public listings. A supplied URL must still use HTTP or HTTPS. Published jobs link to the supplied official application URL when present and to their organization page.

Rejection can include feedback visible to the submitting employer. Review actions cannot silently change an already published intake record; use a separate listing-management process if a published vacancy must be withdrawn. Employers can refresh their dashboard to see decisions; automatic review emails are not configured.

## Deployment and validation

Apply `prisma/migrations/20261102090000_employer_portal/migration.sql` before deploying the generated Prisma client. It adds nullable credential fields, an optional intake owner relation, employer sessions, and persistent rate limits. Existing organizations, jobs, admin access, and scraper settings are retained. No new third-party auth credentials are needed.

All mutations require same-origin requests. Account actions are rate-limited by network and account identifier; job submissions are limited to ten per account per day. The dashboard and API authorize every request and return only the signed-in employer's submissions. Session cookies are HttpOnly, Secure in production, and SameSite Strict. Serve the site over HTTPS; if hosting behind a different proxy, configure trusted IP handling for rate limiting.

Run `pnpm test:employers` for password, recovery, and session checks. For the full integration suite, generate schema SQL with `pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output work/employer-check-schema.sql`, then set `EMPLOYER_ALLOW_ISOLATED_DB_TEST=1` and run `pnpm test:employers:integration`. The database credential needs permission to create schemas. The suite creates a random `employer_check_*` schema, tests the actual route handlers and database transactions, and removes only its own schema afterward. It does not add public listings or real employer accounts. Node 22.15 or later is required for the test loader.
