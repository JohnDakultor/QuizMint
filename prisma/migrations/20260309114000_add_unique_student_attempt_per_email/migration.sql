-- Deduplicate existing rows per quiz/email before adding unique constraint
DELETE FROM "public"."StudentQuizAttempt" a
USING "public"."StudentQuizAttempt" b
WHERE a."id" < b."id"
  AND a."quizId" = b."quizId"
  AND a."studentEmail" = b."studentEmail"
  AND a."studentEmail" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StudentQuizAttempt_quizId_studentEmail_key"
ON "public"."StudentQuizAttempt"("quizId", "studentEmail");

