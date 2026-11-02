ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "categoryManual" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "jobs_category_status_reviewedByAdmin_idx" ON "jobs"("category", "status", "reviewedByAdmin");
