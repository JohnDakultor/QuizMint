-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "gradeLevel" TEXT,
    "section" TEXT,
    "schoolYear" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassStudent" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT,
    "studentNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "quizId" INTEGER,
    "lessonPlanId" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "availableFrom" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StudentQuizAttempt" ADD COLUMN "assignmentId" TEXT;

-- CreateIndex
CREATE INDEX "Class_userId_createdAt_idx" ON "Class"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Class_userId_archived_idx" ON "Class"("userId", "archived");

-- CreateIndex
CREATE INDEX "ClassStudent_classId_createdAt_idx" ON "ClassStudent"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassStudent_classId_studentEmail_idx" ON "ClassStudent"("classId", "studentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_shareToken_key" ON "Assignment"("shareToken");

-- CreateIndex
CREATE INDEX "Assignment_userId_createdAt_idx" ON "Assignment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_classId_status_idx" ON "Assignment"("classId", "status");

-- CreateIndex
CREATE INDEX "Assignment_quizId_idx" ON "Assignment"("quizId");

-- CreateIndex
CREATE INDEX "Assignment_lessonPlanId_idx" ON "Assignment"("lessonPlanId");

-- CreateIndex
CREATE INDEX "StudentQuizAttempt_assignmentId_submittedAt_idx" ON "StudentQuizAttempt"("assignmentId", "submittedAt");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentQuizAttempt" ADD CONSTRAINT "StudentQuizAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
