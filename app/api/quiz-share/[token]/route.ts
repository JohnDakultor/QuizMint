import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { verifyQuizShareToken } from "@/lib/quiz-share";
import { randomUUID } from "crypto";

function inferQuestionType(question: string, options: string[]) {
  if (
    options.length === 2 &&
    options.some((opt) => opt.toLowerCase() === "true") &&
    options.some((opt) => opt.toLowerCase() === "false")
  ) {
    return "true_false" as const;
  }
  if (options.length >= 2) return "mcq" as const;
  if (question.includes("____")) return "fill_blank" as const;
  return "short_answer" as const;
}

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
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
      return apiError(410, "Quiz is no longer available", requestId);
    }

    const cookieName = `quiz_take_${quiz.id}`;
    const existingTakeSessionId = _req.cookies.get(cookieName)?.value ?? "";
    const takeSessionId = existingTakeSessionId || randomUUID();

    const response = NextResponse.json(
      {
        ok: true,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          instructions: quiz.instructions,
          createdAt: quiz.createdAt,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            questionType: inferQuestionType(q.question, q.options),
          })),
        },
        availability: {
          isOpen: quiz.shareSettings?.isOpen ?? true,
          expiresAt: quiz.shareSettings?.expiresAt ?? null,
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
    if (!existingTakeSessionId) {
      response.cookies.set(cookieName, takeSessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  } catch (err) {
    logApiError(requestId, "quiz-share-get", err);
    return apiError(500, "Failed to load shared quiz", requestId);
  }
}
