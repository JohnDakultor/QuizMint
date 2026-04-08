DROP INDEX IF EXISTS "StudentQuizAttempt_quizId_studentEmail_key";

CREATE UNIQUE INDEX "StudentQuizAttempt_quizId_studentEmail_assignmentId_key"
ON "StudentQuizAttempt"("quizId", "studentEmail", "assignmentId");
