-- CreateTable
CREATE TABLE "AsyncGenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "request" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsyncGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AsyncGenerationJob_userId_createdAt_idx" ON "AsyncGenerationJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AsyncGenerationJob_status_createdAt_idx" ON "AsyncGenerationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AsyncGenerationJob_type_createdAt_idx" ON "AsyncGenerationJob"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "AsyncGenerationJob" ADD CONSTRAINT "AsyncGenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
