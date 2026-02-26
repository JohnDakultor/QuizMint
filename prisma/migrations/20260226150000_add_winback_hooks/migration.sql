ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "marketingOptIn" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "marketingUnsubscribedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "WinbackEmailLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "milestoneDay" INTEGER NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WinbackEmailLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WinbackEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "WinbackEmailLog_userId_milestoneDay_key"
  ON "WinbackEmailLog"("userId", "milestoneDay");

CREATE INDEX IF NOT EXISTS "WinbackEmailLog_milestoneDay_sentAt_idx"
  ON "WinbackEmailLog"("milestoneDay", "sentAt");

CREATE INDEX IF NOT EXISTS "WinbackEmailLog_userId_sentAt_idx"
  ON "WinbackEmailLog"("userId", "sentAt");
