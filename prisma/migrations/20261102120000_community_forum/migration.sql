CREATE TABLE IF NOT EXISTS "forum_members" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "handle" TEXT NOT NULL, "suspendedAt" TIMESTAMP(3), "lastActivityAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "forum_members_userId_key" ON "forum_members"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "forum_members_handle_key" ON "forum_members"("handle");
CREATE TABLE IF NOT EXISTS "forum_topics" (
 "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "category" TEXT NOT NULL,
 "authorId" TEXT REFERENCES "forum_members"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "visibility" TEXT NOT NULL DEFAULT 'VISIBLE', "locked" BOOLEAN NOT NULL DEFAULT false, "pinned" BOOLEAN NOT NULL DEFAULT false,
 "removedAt" TIMESTAMP(3), "dedupeKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "forum_topics_dedupeKey_key" ON "forum_topics"("dedupeKey");
CREATE INDEX IF NOT EXISTS "forum_topics_visibility_pinned_lastActivityAt_idx" ON "forum_topics"("visibility","pinned","lastActivityAt");
CREATE INDEX IF NOT EXISTS "forum_topics_authorId_idx" ON "forum_topics"("authorId");
CREATE TABLE IF NOT EXISTS "forum_replies" (
 "id" TEXT PRIMARY KEY, "topicId" TEXT NOT NULL REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "authorId" TEXT REFERENCES "forum_members"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "body" TEXT NOT NULL, "visibility" TEXT NOT NULL DEFAULT 'VISIBLE', "removedAt" TIMESTAMP(3), "dedupeKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "forum_replies_dedupeKey_key" ON "forum_replies"("dedupeKey");
CREATE INDEX IF NOT EXISTS "forum_replies_topicId_visibility_createdAt_id_idx" ON "forum_replies"("topicId","visibility","createdAt","id");
CREATE INDEX IF NOT EXISTS "forum_replies_authorId_idx" ON "forum_replies"("authorId");
CREATE TABLE IF NOT EXISTS "forum_reports" (
 "id" TEXT PRIMARY KEY, "reporterUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "topicId" TEXT NOT NULL REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "replyId" TEXT REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "dedupeKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "forum_reports_dedupeKey_key" ON "forum_reports"("dedupeKey");
CREATE INDEX IF NOT EXISTS "forum_reports_status_createdAt_idx" ON "forum_reports"("status","createdAt");
CREATE INDEX IF NOT EXISTS "forum_reports_topicId_idx" ON "forum_reports"("topicId");
CREATE INDEX IF NOT EXISTS "forum_reports_replyId_idx" ON "forum_reports"("replyId");
CREATE INDEX IF NOT EXISTS "forum_reports_reporterUserId_idx" ON "forum_reports"("reporterUserId");
CREATE TABLE IF NOT EXISTS "forum_revisions" ("id" TEXT PRIMARY KEY DEFAULT 'main',"value" INTEGER NOT NULL DEFAULT 0,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE IF NOT EXISTS "forum_moderation_logs" ("id" TEXT PRIMARY KEY,"action" TEXT NOT NULL,"targetId" TEXT NOT NULL,"reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "forum_moderation_logs_createdAt_idx" ON "forum_moderation_logs"("createdAt");
