ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recoveryHash" TEXT;
ALTER TABLE "opportunity_intakes" ADD COLUMN IF NOT EXISTS "employerUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "opportunity_intakes_employerUserId_createdAt_idx" ON "opportunity_intakes"("employerUserId","createdAt");
CREATE TABLE IF NOT EXISTS "employer_sessions" (
 "tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "employer_sessions_userId_idx" ON "employer_sessions"("userId");
CREATE INDEX IF NOT EXISTS "employer_sessions_expiresAt_idx" ON "employer_sessions"("expiresAt");
CREATE TABLE IF NOT EXISTS "employer_rate_limits" ("key" TEXT PRIMARY KEY,"count" INTEGER NOT NULL DEFAULT 0,"resetAt" TIMESTAMP(3) NOT NULL);
