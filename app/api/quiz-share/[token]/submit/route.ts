import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { verifyQuizShareToken } from "@/lib/quiz-share";
import { trackGenerationEvent } from "@/lib/generation-events";
import { randomUUID } from "crypto";
import { Prisma } from "@/lib/generated/prisma/client";

type RouteParams = {
  params: Promise<{ token: string }>;
};

type QuestionType = "mcq" | "true_false" | "fill_blank" | "short_answer";

function inferQuestionType(question: string, options: string[]): QuestionType {
  if (
    options.length === 2 &&
    options.some((opt) => opt.toLowerCase() === "true") &&
    options.some((opt) => opt.toLowerCase() === "false")
  ) {
    return "true_false";
  }
  if (options.length >= 2) return "mcq";
  if (question.includes("____")) return "fill_blank";
  return "short_answer";
}

function normalizeForCompare(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[.,!?;:()]/g, "")
    .replace(/\s+/g, " ");
}

function answersMatch(selected: string, expected: string) {
  return normalizeForCompare(selected) === normalizeForCompare(expected);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const { token } = await params;
    if (!token) return apiError(400, "Missing token", requestId);

    const verified = verifyQuizShareToken(token);
    if (!verified.ok) {
      if (verified.reason === "expired") {
        return apiError(410, "Share link expired", requestId);
      }
      return apiError(400, "Invalid share link", requestId);
    }

    const body = await req.json();
    const answersInput =
      body?.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
        ? (body.answers as Record<string, string>)
        : null;
    if (!answersInput) return apiError(400, "Invalid answers payload", requestId);
    const studentName =
      typeof body?.studentName === "string" ? body.studentName.trim().slice(0, 120) : "";
    const studentEmail =
      typeof body?.studentEmail === "string"
        ? body.studentEmail.trim().toLowerCase().slice(0, 200)
        : "";
    if (!studentName) {
      return apiError(400, "Student name is required", requestId);
    }
    if (!studentEmail) {
      return apiError(400, "Student email is required", requestId);
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail);
    if (!emailValid) {
      return apiError(400, "Please enter a valid email address", requestId);
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: verified.quizId },
      include: {
        questions: true,
        shareSettings: true,
      },
    });
    if (!quiz) return apiError(404, "Quiz not found", requestId);
    if (quiz.shareSettings && quiz.shareSettings.isOpen === false) {
      return apiError(410, "Quiz is closed by the teacher", requestId);
    }
    if (
      quiz.shareSettings?.expiresAt &&
      new Date(quiz.shareSettings.expiresAt).getTime() < Date.now()
    ) {
      return apiError(410, "Quiz timer has ended", requestId);
    }
    const cookieName = `quiz_take_${quiz.id}`;
    const takeSessionId = req.cookies.get(cookieName)?.value ?? "";
    if (!takeSessionId) {
      return apiError(400, "Session not initialized. Please reload the quiz page.", requestId);
    }

    try {
      await prisma.studentQuizTake.create({
        data: {
          quizId: quiz.id,
          takeSessionId,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return apiError(
          409,
          "Quiz already submitted from this device/session. Retake is not allowed.",
          requestId
        );
      }
      throw err;
    }

    const existingRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "StudentQuizAttempt"
      WHERE "quizId" = ${quiz.id}
        AND "studentEmail" = ${studentEmail}
    `;
    if ((existingRows[0]?.count ?? 0) > 0) {
      return apiError(
        409,
        "This email has already submitted this quiz. Ask your teacher if a retake is needed.",
        requestId
      );
    }

    const details = quiz.questions.map((q) => {
      const raw = answersInput[String(q.id)];
      const selected = typeof raw === "string" ? raw : "";
      const questionType = inferQuestionType(q.question, q.options);
      const correct = answersMatch(selected, q.answer);
      return {
        questionId: q.id,
        question: q.question,
        questionType,
        selected,
        correctAnswer: q.answer,
        correct,
      };
    });

    const total = details.length;
    const correct = details.filter((d) => d.correct).length;
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    await prisma.$executeRaw`
      INSERT INTO "StudentQuizAttempt" (
        "id",
        "quizId",
        "studentName",
        "studentEmail",
        "scorePercent",
        "correctAnswers",
        "totalQuestions",
        "result",
        "ip",
        "userAgent",
        "submittedAt",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${quiz.id},
        ${studentName},
        ${studentEmail},
        ${scorePercent},
        ${correct},
        ${total},
        ${JSON.stringify(details)}::jsonb,
        ${ip},
        ${userAgent},
        NOW(),
        NOW()
      )
    `;

    await trackGenerationEvent({
      userId: null,
      eventType: "quiz_submitted",
      feature: "quiz_share",
      status: "success",
      plan: null,
      latencyMs: undefined,
      costUsd: 0,
      metadata: {
        quizId: quiz.id,
        studentName,
        studentEmail,
        totalQuestions: total,
        correctAnswers: correct,
        scorePercent,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        result: {
          total,
          correct,
          scorePercent,
          details,
        },
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    logApiError(requestId, "quiz-share-submit", err);
    return apiError(500, "Failed to submit quiz", requestId);
  }
}
