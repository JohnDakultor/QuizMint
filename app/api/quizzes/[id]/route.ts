import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

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
