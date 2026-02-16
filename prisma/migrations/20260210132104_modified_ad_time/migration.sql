-- AlterTable
ALTER TABLE "User" ADD COLUMN     "quizAdResetCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizAdResetWindowAt" TIMESTAMP(3);
