-- CreateTable
CREATE TABLE "LessonPlanExport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonPlanId" TEXT,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "inputHash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "resultData" BYTEA,
    "mimeType" TEXT,
    "fileName" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlanExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlanExport_userId_createdAt_idx" ON "LessonPlanExport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonPlanExport_status_createdAt_idx" ON "LessonPlanExport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LessonPlanExport_lessonPlanId_idx" ON "LessonPlanExport"("lessonPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlanExport_userId_format_inputHash_key" ON "LessonPlanExport"("userId", "format", "inputHash");

-- AddForeignKey
ALTER TABLE "LessonPlanExport" ADD CONSTRAINT "LessonPlanExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanExport" ADD CONSTRAINT "LessonPlanExport_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

