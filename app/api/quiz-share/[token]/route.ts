import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { verifyQuizShareToken } from "@/lib/quiz-share";
import { randomUUID } from "crypto";
import { inferQuizQuestionType } from "@/lib/quiz-question-types";

type RouteParams = {
  params: Promise<{ token: string }>;
};

function hashSeed(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededShuffle<T>(arr: T[], seedInput: string) {
  const out = [...arr];
  let seed = hashSeed(seedInput) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

    let takeSessionId = existingTakeSessionId || randomUUID();
    if (existingTakeSessionId) {
      const existingTake = await prisma.studentQuizTake.findUnique({
        where: {
          quizId_takeSessionId: {
            quizId: quiz.id,
            takeSessionId: existingTakeSessionId,
          },
        },
        select: { id: true },
      });
      // Shared devices are common in classrooms; rotate session ID after a completed submit.
      if (existingTake) {
        takeSessionId = randomUUID();
      }
    }

    const shuffledQuestions = verified.shuffleQuestions
      ? seededShuffle(
          quiz.questions.map((q) => ({
            ...q,
            options: Array.isArray(q.options)
              ? seededShuffle(q.options, `${takeSessionId}:${q.id}:opts`)
              : [],
          })),
          `${takeSessionId}:${quiz.id}:questions`
        )
      : quiz.questions.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        }));

    const response = NextResponse.json(
      {
        ok: true,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          instructions: quiz.instructions,
          createdAt: quiz.createdAt,
          questions: shuffledQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            questionType: inferQuizQuestionType(
              q.question,
              q.options
            ),
          })),
        },
        availability: {
          isOpen: quiz.shareSettings?.isOpen ?? true,
          expiresAt: quiz.shareSettings?.expiresAt ?? null,
          shuffleQuestions: verified.shuffleQuestions,
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
    if (!existingTakeSessionId || takeSessionId !== existingTakeSessionId) {
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
