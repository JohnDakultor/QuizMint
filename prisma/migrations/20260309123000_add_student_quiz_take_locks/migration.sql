-- CreateTable
CREATE TABLE "public"."StudentQuizTake" (
    "id" TEXT NOT NULL,
    "quizId" INTEGER NOT NULL,
    "takeSessionId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentQuizTake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentQuizTake_quizId_takeSessionId_key"
ON "public"."StudentQuizTake"("quizId", "takeSessionId");

-- CreateIndex
CREATE INDEX "StudentQuizTake_quizId_submittedAt_idx"
ON "public"."StudentQuizTake"("quizId", "submittedAt");

-- AddForeignKey
ALTER TABLE "public"."StudentQuizTake"
ADD CONSTRAINT "StudentQuizTake_quizId_fkey"
FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

