import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function sanitizeText(value: unknown) {
  return String(value || "").trim();
}

function sanitizeOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => sanitizeText(option))
    .filter(Boolean)
    .slice(0, 12);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);

    const { id } = await params;
    const quizId = Number(id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return apiError(400, "Invalid quiz id", requestId);
    }

    const existingQuiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: user.id },
      include: { questions: { orderBy: { id: "asc" } } },
    });
    if (!existingQuiz) return apiError(404, "Quiz not found", requestId);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError(400, "Invalid request body", requestId);
    }

    const title = sanitizeText((body as Record<string, unknown>).title);
    const instructions = sanitizeText(
      (body as Record<string, unknown>).instructions
    );
    const rawQuestions = Array.isArray((body as Record<string, unknown>).questions)
      ? ((body as Record<string, unknown>).questions as Array<Record<string, unknown>>)
      : null;

    if (!title) return apiError(400, "Quiz title is required.", requestId);
    if (!instructions) {
      return apiError(400, "Quiz instructions are required.", requestId);
    }
    if (!rawQuestions?.length) {
      return apiError(400, "At least one question is required.", requestId);
    }

    const sanitizedQuestions = rawQuestions
      .map((question) => ({
        id:
          typeof question.id === "number" && Number.isInteger(question.id)
            ? question.id
            : null,
        question: sanitizeText(question.question),
        options: sanitizeOptions(question.options),
        answer: sanitizeText(question.answer),
        explanation: sanitizeText(question.explanation) || null,
        hint: sanitizeText(question.hint) || null,
      }))
      .filter((question) => question.question && question.answer);

    if (!sanitizedQuestions.length) {
      return apiError(400, "Every quiz needs valid question content.", requestId);
    }

    for (const question of sanitizedQuestions) {
      if (question.options.length > 0 && question.options.length < 2) {
        return apiError(
          400,
          "Multiple-choice style questions need at least two options.",
          requestId
        );
      }
    }

    const allowedQuestionIds = new Set(existingQuiz.questions.map((question) => question.id));

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id: existingQuiz.id },
        data: {
          title,
          instructions,
        },
      });

      const incomingIds = sanitizedQuestions
        .map((question) => question.id)
        .filter((id): id is number => id !== null && allowedQuestionIds.has(id));

      const staleIds = existingQuiz.questions
        .map((question) => question.id)
        .filter((id) => !incomingIds.includes(id));

      if (staleIds.length) {
        await tx.question.deleteMany({
          where: {
            quizId: existingQuiz.id,
            id: { in: staleIds },
          },
        });
      }

      for (const question of sanitizedQuestions) {
        if (question.id && allowedQuestionIds.has(question.id)) {
          await tx.question.update({
            where: { id: question.id },
            data: {
              question: question.question,
              options: question.options,
              answer: question.answer,
              explanation: question.explanation,
              hint: question.hint,
            },
          });
          continue;
        }

        await tx.question.create({
          data: {
            quizId: existingQuiz.id,
            question: question.question,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation,
            hint: question.hint,
          },
        });
      }

      return tx.quiz.findUniqueOrThrow({
        where: { id: existingQuiz.id },
        include: { questions: { orderBy: { id: "asc" } } },
      });
    });

    return NextResponse.json(
      { ok: true, quiz: updatedQuiz, requestId },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "quiz-update", err);
    return apiError(500, "Failed to update quiz", requestId);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);

    const { id } = await params;
    const quizId = Number(id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return apiError(400, "Invalid quiz id", requestId);
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: user.id },
      select: { id: true },
    });
    if (!quiz) return apiError(404, "Quiz not found", requestId);

    await prisma.$transaction(async (tx) => {
      // Be explicit to handle older DBs where foreign keys are not ON DELETE CASCADE.
      await tx.studentQuizTake.deleteMany({ where: { quizId: quiz.id } });
      await tx.studentQuizAttempt.deleteMany({ where: { quizId: quiz.id } });
      await tx.quizShareSettings.deleteMany({ where: { quizId: quiz.id } });
      await tx.question.deleteMany({ where: { quizId: quiz.id } });
      await tx.quiz.delete({ where: { id: quiz.id } });
    });

    return NextResponse.json(
      { ok: true, requestId },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "quiz-delete", err);
    return apiError(500, "Failed to delete quiz", requestId);
  }
}
