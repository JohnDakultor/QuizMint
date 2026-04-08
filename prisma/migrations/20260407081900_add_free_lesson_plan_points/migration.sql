-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeLessonPlanPoints" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "freeLessonPlanPointsMax" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "freeLessonPlanPointsRechargeAt" TIMESTAMP(3);
