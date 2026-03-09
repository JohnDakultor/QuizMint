-- CreateTable
CREATE TABLE "public"."StudentQuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" INTEGER NOT NULL,
    "studentName" TEXT,
    "studentEmail" TEXT,
    "scorePercent" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentQuizAttempt_quizId_submittedAt_idx" ON "public"."StudentQuizAttempt"("quizId", "submittedAt");

-- CreateIndex
CREATE INDEX "StudentQuizAttempt_studentEmail_submittedAt_idx" ON "public"."StudentQuizAttempt"("studentEmail", "submittedAt");

-- AddForeignKey
ALTER TABLE "public"."StudentQuizAttempt" ADD CONSTRAINT "StudentQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

