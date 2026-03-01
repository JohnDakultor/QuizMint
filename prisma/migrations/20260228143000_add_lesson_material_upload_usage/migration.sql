-- Add separate usage tracking for lesson-material upload to PPTX generation.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "lessonMaterialUploadUsage" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "lastLessonMaterialUploadAt" TIMESTAMP(3);
