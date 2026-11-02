CREATE TABLE IF NOT EXISTS "saved_jobs" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "jobId" TEXT REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "jobTitle" TEXT NOT NULL, "organizationName" TEXT NOT NULL, "jobCountry" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_userId_jobId_key" ON "saved_jobs"("userId","jobId");
CREATE INDEX IF NOT EXISTS "saved_jobs_userId_createdAt_idx" ON "saved_jobs"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "saved_jobs_jobId_idx" ON "saved_jobs"("jobId");
CREATE TABLE IF NOT EXISTS "candidate_applications" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "jobId" TEXT REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "jobTitle" TEXT NOT NULL, "organizationName" TEXT NOT NULL, "jobCountry" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PLANNED', "appliedAt" TIMESTAMP(3), "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_applications_userId_jobId_key" ON "candidate_applications"("userId","jobId");
CREATE INDEX IF NOT EXISTS "candidate_applications_userId_createdAt_idx" ON "candidate_applications"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "candidate_applications_jobId_idx" ON "candidate_applications"("jobId");
