import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { createQuizShareToken } from "@/lib/quiz-share";
import { trackGenerationEvent } from "@/lib/generation-events";

const DEFAULT_DURATION_MINUTES = 60;
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 24 * 60;

function clampDurationMinutes(raw: unknown) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_DURATION_MINUTES;
  const i = Math.floor(n);
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, i));
}

function clampAssessmentDurationMinutes(raw: unknown) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
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
    const assignmentId =
      typeof body?.assignmentId === "string" ? body.assignmentId.trim() : "";
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

    if (assignmentId) {
      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          userId: user.id,
          quizId: quiz.id,
        },
        select: { id: true },
      });
      if (!assignment) {
        return apiError(404, "Assignment not found for this quiz", requestId);
      }
    }

    const durationMinutes = clampDurationMinutes(body?.durationMinutes);
    const shuffleQuestions = Boolean(body?.shuffleQuestions);
    const assessmentDurationMinutes =
      body?.timedAssessmentEnabled === true
        ? clampAssessmentDurationMinutes(body?.assessmentDurationMinutes)
        : null;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    await prisma.quizShareSettings.upsert({
      where: { quizId: quiz.id },
      create: {
        quizId: quiz.id,
        isOpen: true,
        expiresAt,
        assessmentDurationMinutes,
      },
      update: {
        isOpen: true,
        expiresAt,
        assessmentDurationMinutes,
      },
    });

    const token = createQuizShareToken(quiz.id, durationMinutes * 60, {
      shuffleQuestions,
      assignmentId: assignmentId || null,
      assessmentDurationMinutes,
    });
    const shareUrl = `${req.nextUrl.origin}/quiz/${encodeURIComponent(token)}`;

    await trackGenerationEvent({
      userId: user.id,
      eventType: "quiz_generated",
      feature: "quiz_share_link",
      status: "success",
      metadata: {
        quizId: quiz.id,
        shareUrl,
        assignmentId: assignmentId || null,
        shuffleQuestions,
        durationMinutes,
        assessmentDurationMinutes,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        token,
        shareUrl,
        shareSettings: {
          isOpen: true,
          expiresAt,
          durationMinutes,
          shuffleQuestions,
          assessmentDurationMinutes,
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
    const assessmentDurationMinutes =
      body?.timedAssessmentEnabled === true
        ? clampAssessmentDurationMinutes(body?.assessmentDurationMinutes)
        : body?.timedAssessmentEnabled === false
        ? null
        : undefined;

    if (
      isOpen === undefined &&
      durationMinutes === undefined &&
      assessmentDurationMinutes === undefined
    ) {
      return apiError(400, "Nothing to update", requestId);
    }

    const existing = await prisma.quizShareSettings.findUnique({
      where: { quizId: quiz.id },
      select: { isOpen: true, expiresAt: true, assessmentDurationMinutes: true },
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
        assessmentDurationMinutes:
          assessmentDurationMinutes !== undefined
            ? assessmentDurationMinutes
            : existing?.assessmentDurationMinutes ?? null,
      },
      update: {
        isOpen: nextOpen,
        expiresAt: nextExpiresAt,
        assessmentDurationMinutes:
          assessmentDurationMinutes !== undefined
            ? assessmentDurationMinutes
            : existing?.assessmentDurationMinutes ?? null,
      },
      select: { isOpen: true, expiresAt: true, assessmentDurationMinutes: true },
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
