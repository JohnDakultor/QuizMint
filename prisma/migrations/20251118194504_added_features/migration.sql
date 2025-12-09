/*
  Warnings:

  - You are about to drop the column `features` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "features",
ADD COLUMN     "adaptiveLearning" BOOLEAN DEFAULT false,
ADD COLUMN     "aiDifficulty" TEXT;
