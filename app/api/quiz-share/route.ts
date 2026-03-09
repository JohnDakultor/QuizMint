import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { createQuizShareToken } from "@/lib/quiz-share";

const DEFAULT_DURATION_MINUTES = 60;
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 24 * 60;

function clampDurationMinutes(raw: unknown) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_DURATION_MINUTES;
  const i = Math.floor(n);
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, i));
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);

    const body = await req.json();
    const quizId = Number(body?.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return apiError(400, "Invalid quizId", requestId);
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: user.id },
      select: { id: true },
    });
    if (!quiz) {
      return apiError(404, "Quiz not found", requestId);
    }

    const durationMinutes = clampDurationMinutes(body?.durationMinutes);
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    await prisma.quizShareSettings.upsert({
      where: { quizId: quiz.id },
      create: {
        quizId: quiz.id,
        isOpen: true,
        expiresAt,
      },
      update: {
        isOpen: true,
        expiresAt,
      },
    });

    const token = createQuizShareToken(quiz.id, durationMinutes * 60);
    const shareUrl = `${req.nextUrl.origin}/quiz/${encodeURIComponent(token)}`;

    return NextResponse.json(
      {
        ok: true,
        token,
        shareUrl,
        shareSettings: {
          isOpen: true,
          expiresAt,
          durationMinutes,
        },
        requestId,
      },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "quiz-share-create", err);
    return apiError(500, "Failed to create quiz share link", requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);

    const body = await req.json();
    const quizId = Number(body?.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return apiError(400, "Invalid quizId", requestId);
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: user.id },
      select: { id: true },
    });
    if (!quiz) return apiError(404, "Quiz not found", requestId);

    const isOpen =
      typeof body?.isOpen === "boolean" ? body.isOpen : undefined;
    const durationMinutes =
      body?.durationMinutes !== undefined
        ? clampDurationMinutes(body.durationMinutes)
        : undefined;

    if (isOpen === undefined && durationMinutes === undefined) {
      return apiError(400, "Nothing to update", requestId);
    }

    const existing = await prisma.quizShareSettings.findUnique({
      where: { quizId: quiz.id },
      select: { isOpen: true, expiresAt: true },
    });
    const nextOpen = isOpen ?? existing?.isOpen ?? true;
    const nextExpiresAt =
      durationMinutes !== undefined
        ? new Date(Date.now() + durationMinutes * 60 * 1000)
        : existing?.expiresAt ?? null;

    const updated = await prisma.quizShareSettings.upsert({
      where: { quizId: quiz.id },
      create: {
        quizId: quiz.id,
        isOpen: nextOpen,
        expiresAt: nextExpiresAt,
      },
      update: {
        isOpen: nextOpen,
        expiresAt: nextExpiresAt,
      },
      select: { isOpen: true, expiresAt: true },
    });

    return NextResponse.json(
      { ok: true, shareSettings: updated, requestId },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "quiz-share-patch", err);
    return apiError(500, "Failed to update share settings", requestId);
  }
}
