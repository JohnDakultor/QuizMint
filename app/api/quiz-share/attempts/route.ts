import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

type AttemptDetail = {
  questionId: number;
  question: string;
  questionType: "mcq" | "true_false" | "fill_blank" | "short_answer";
  selected: string;
  correctAnswer: string;
  correct: boolean;
};

type AttemptRow = {
  quizId: number;
  quizTitle: string;
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  scorePercent: number;
  correctAnswers: number;
  totalQuestions: number;
  submittedAt: Date;
  result: unknown;
};

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);

    const quizIdRaw = req.nextUrl.searchParams.get("quizId");
    const quizId = quizIdRaw ? Number(quizIdRaw) : null;
    let rows: AttemptRow[] = [];

    if (quizId !== null) {
      if (!Number.isInteger(quizId) || quizId <= 0) {
        return apiError(400, "Invalid quizId", requestId);
      }

      const owned = await prisma.quiz.findFirst({
        where: { id: quizId, userId: user.id },
        select: { id: true },
      });
      if (!owned) return apiError(404, "Quiz not found", requestId);

      rows = await prisma.$queryRaw<AttemptRow[]>`
        SELECT
          s."quizId",
          q."title" AS "quizTitle",
          s."id",
          s."studentName",
          s."studentEmail",
          s."scorePercent",
          s."correctAnswers",
          s."totalQuestions",
          s."submittedAt",
          s."result"
        FROM "StudentQuizAttempt" s
        JOIN "Quiz" q ON q."id" = s."quizId"
        WHERE s."quizId" = ${quizId}
        ORDER BY s."submittedAt" DESC
        LIMIT 100
      `;
    } else {
      rows = await prisma.$queryRaw<AttemptRow[]>`
        SELECT
          s."quizId",
          q."title" AS "quizTitle",
          s."id",
          s."studentName",
          s."studentEmail",
          s."scorePercent",
          s."correctAnswers",
          s."totalQuestions",
          s."submittedAt",
          s."result"
        FROM "StudentQuizAttempt" s
        JOIN "Quiz" q ON q."id" = s."quizId"
        WHERE q."userId" = ${user.id}
        ORDER BY s."submittedAt" DESC
        LIMIT 100
      `;
    }

    const attempts = rows.map((row) => {
      const details = Array.isArray(row.result)
        ? (row.result as AttemptDetail[])
        : [];
      return {
        quizId: row.quizId,
        quizTitle: row.quizTitle,
        id: row.id,
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        scorePercent: row.scorePercent,
        correctAnswers: row.correctAnswers,
        totalQuestions: row.totalQuestions,
        submittedAt: row.submittedAt,
        details,
      };
    });

    return NextResponse.json(
      { ok: true, attempts, requestId },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    logApiError(requestId, "quiz-share-attempts", err);
    return apiError(500, "Failed to load student attempts", requestId);
  }
}
