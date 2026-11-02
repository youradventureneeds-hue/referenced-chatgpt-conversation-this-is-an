CREATE TABLE IF NOT EXISTS "password_resets" (
 "id" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_tokenHash_key" ON "password_resets"("tokenHash");
CREATE INDEX IF NOT EXISTS "password_resets_userId_idx" ON "password_resets"("userId");
CREATE TABLE IF NOT EXISTS "candidate_documents" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('CV','CERTIFICATION')),
 "filename" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL,
 "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 3145728),
 "content" BYTEA NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "candidate_documents_userId_kind_idx" ON "candidate_documents"("userId", "kind");
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_documents_one_cv" ON "candidate_documents"("userId") WHERE "kind" = 'CV';
CREATE TABLE IF NOT EXISTS "account_email_settings" (
 "id" TEXT NOT NULL DEFAULT 'main',
 "sender" TEXT NOT NULL,
 "passwordCiphertext" TEXT NOT NULL,
 "verifiedAt" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "account_email_settings_pkey" PRIMARY KEY ("id")
);
