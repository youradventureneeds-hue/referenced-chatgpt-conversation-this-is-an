CREATE TABLE IF NOT EXISTS "instagram_settings" (
 "id" TEXT PRIMARY KEY DEFAULT 'main', "username" TEXT NOT NULL DEFAULT '', "accountId" TEXT NOT NULL DEFAULT '',
 "apiVersion" TEXT NOT NULL DEFAULT 'v26.0', "tokenCiphertext" TEXT, "tokenExpiresAt" TIMESTAMP(3),
 "enabled" BOOLEAN NOT NULL DEFAULT false, "country" TEXT NOT NULL DEFAULT 'India', "intervalHours" INTEGER NOT NULL DEFAULT 6,
 "nextRunAt" TIMESTAMP(3), "lastHeartbeatAt" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3), "lastError" TEXT,
 "leaseId" TEXT, "leaseUntil" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "instagram_sources" (
 "id" TEXT PRIMARY KEY, "username" TEXT NOT NULL, "employerName" TEXT NOT NULL, "country" TEXT NOT NULL,
 "organizationId" TEXT REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "evidenceUrl" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true, "lastCheckedAt" TIMESTAMP(3), "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "instagram_sources_username_key" ON "instagram_sources"("username");
CREATE TABLE IF NOT EXISTS "instagram_runs" (
 "id" TEXT PRIMARY KEY, "trigger" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED',
 "sourceSnapshot" JSONB NOT NULL DEFAULT '[]', "nextIndex" INTEGER NOT NULL DEFAULT 0,
 "accounts" INTEGER NOT NULL DEFAULT 0, "media" INTEGER NOT NULL DEFAULT 0, "leads" INTEGER NOT NULL DEFAULT 0,
 "queued" INTEGER NOT NULL DEFAULT 0, "duplicates" INTEGER NOT NULL DEFAULT 0, "errors" INTEGER NOT NULL DEFAULT 0,
 "details" JSONB NOT NULL DEFAULT '[]', "errorSummary" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "instagram_runs_status_createdAt_idx" ON "instagram_runs"("status","createdAt");
