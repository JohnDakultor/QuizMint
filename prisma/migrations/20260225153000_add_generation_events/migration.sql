CREATE TABLE IF NOT EXISTS "GenerationEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "feature" TEXT,
  "status" TEXT NOT NULL,
  "plan" TEXT,
  "latencyMs" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GenerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GenerationEvent_eventType_createdAt_idx"
  ON "GenerationEvent"("eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "GenerationEvent_userId_createdAt_idx"
  ON "GenerationEvent"("userId", "createdAt");
