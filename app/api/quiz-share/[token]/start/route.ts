import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import {
  createTimedAssessmentSessionToken,
  verifyQuizShareToken,
  verifyTimedAssessmentSessionToken,
} from "@/lib/quiz-share";

type RouteParams = {
  params: Promise<{ token: string }>;
};

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

    const quiz = await prisma.quiz.findUnique({
      where: { id: verified.quizId },
      include: {
        shareSettings: {
          select: {
            isOpen: true,
            expiresAt: true,
            assessmentDurationMinutes: true,
          },
        },
      },
    });
    if (!quiz) return apiError(404, "Quiz not found", requestId);
    if (quiz.shareSettings?.isOpen === false) {
      return apiError(410, "Quiz is closed by the teacher", requestId);
    }
    if (
      quiz.shareSettings?.expiresAt &&
      new Date(quiz.shareSettings.expiresAt).getTime() < Date.now()
    ) {
      return apiError(410, "Quiz is no longer available", requestId);
    }

    const takeCookieName = `quiz_take_${verified.quizId}`;
    const takeSessionId = req.cookies.get(takeCookieName)?.value ?? "";
    if (!takeSessionId) {
      return apiError(
        400,
        "Quiz session is not ready yet. Reopen the shared link and try again.",
        requestId
      );
    }

    const assessmentDurationMinutes =
      verified.assessmentDurationMinutes ??
      quiz.shareSettings?.assessmentDurationMinutes ??
      null;

    if (!assessmentDurationMinutes) {
      return NextResponse.json(
        {
          ok: true,
          timedAssessment: {
            enabled: false,
            assessmentDurationMinutes: null,
            startedAt: null,
            expiresAt: null,
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
    }

    const assessmentCookieName = `quiz_assessment_${verified.quizId}`;
    const existingAssessmentToken = req.cookies.get(assessmentCookieName)?.value ?? "";
    const existingAssessment = existingAssessmentToken
      ? verifyTimedAssessmentSessionToken(existingAssessmentToken)
      : null;

    if (
      existingAssessment?.ok &&
      existingAssessment.quizId === verified.quizId &&
      existingAssessment.takeSessionId === takeSessionId
    ) {
      return NextResponse.json(
        {
          ok: true,
          timedAssessment: {
            enabled: true,
            assessmentDurationMinutes,
            startedAt: new Date(existingAssessment.startedAt).toISOString(),
            expiresAt: new Date(existingAssessment.expiresAt).toISOString(),
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
    }

    const assessmentToken = createTimedAssessmentSessionToken(
      verified.quizId,
      takeSessionId,
      assessmentDurationMinutes * 60
    );
    const startedAt = Date.now();
    const expiresAt = startedAt + assessmentDurationMinutes * 60 * 1000;

    const response = NextResponse.json(
      {
        ok: true,
        timedAssessment: {
          enabled: true,
          assessmentDurationMinutes,
          startedAt: new Date(startedAt).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
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
    response.cookies.set(assessmentCookieName, assessmentToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt),
    });
    return response;
  } catch (err) {
    logApiError(requestId, "quiz-share-start", err);
    return apiError(500, "Failed to start timed assessment", requestId);
  }
}
