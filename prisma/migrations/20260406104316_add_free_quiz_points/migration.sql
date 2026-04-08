-- AlterTable
ALTER TABLE "AsyncGenerationJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeQuizPoints" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "freeQuizPointsMax" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "freeQuizPointsRechargeAt" TIMESTAMP(3);
