-- CreateTable
CREATE TABLE "public"."QuizShareSettings" (
    "id" TEXT NOT NULL,
    "quizId" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizShareSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizShareSettings_quizId_key" ON "public"."QuizShareSettings"("quizId");

-- CreateIndex
CREATE INDEX "QuizShareSettings_quizId_isOpen_idx" ON "public"."QuizShareSettings"("quizId", "isOpen");

-- CreateIndex
CREATE INDEX "QuizShareSettings_expiresAt_idx" ON "public"."QuizShareSettings"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."QuizShareSettings" ADD CONSTRAINT "QuizShareSettings_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

