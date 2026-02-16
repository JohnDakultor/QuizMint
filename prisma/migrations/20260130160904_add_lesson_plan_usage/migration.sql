-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLessonPlanAt" TIMESTAMP(3),
ADD COLUMN     "lessonPlanUsage" INTEGER NOT NULL DEFAULT 0;
