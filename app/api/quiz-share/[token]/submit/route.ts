import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { invalidateDashboardSummarySnapshot } from "@/lib/dashboard-summary-snapshot";
import { trackGenerationEvent } from "@/lib/generation-events";
import { invalidateInterventionSummarySnapshots } from "@/lib/intervention-summary-snapshot";
import { prisma } from "@/lib/prisma";
import {
  verifyQuizShareToken,
  verifyTimedAssessmentSessionToken,
} from "@/lib/quiz-share";
import { scoreQuizAnswers } from "@/lib/quiz-scoring";
import { validateAssignmentRosterEmail } from "@/lib/roster-validation";

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
      if (verified.reason === "expired") return apiError(410, "Share link expired", requestId);
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
    if (!studentName) return apiError(400, "Student name is required", requestId);
    if (!studentEmail) return apiError(400, "Student email is required", requestId);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
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
    if (quiz.shareSettings?.isOpen === false) {
      return apiError(410, "Quiz is closed by the teacher", requestId);
    }
    if (
      quiz.shareSettings?.expiresAt &&
      new Date(quiz.shareSettings.expiresAt).getTime() < Date.now()
    ) {
      return apiError(410, "Quiz timer has ended", requestId);
    }

    const assignment = verified.assignmentId
      ? await prisma.assignment.findFirst({
          where: {
            id: verified.assignmentId,
            quizId: quiz.id,
          },
          select: {
            id: true,
            title: true,
            status: true,
            availableFrom: true,
            dueAt: true,
            closedAt: true,
            classId: true,
          },
        })
      : null;
    if (verified.assignmentId && !assignment) {
      return apiError(410, "Assignment is no longer available", requestId);
    }
    if (assignment?.status === "closed" || assignment?.closedAt) {
      return apiError(410, "Assignment is closed by the teacher", requestId);
    }
    if (assignment?.availableFrom && new Date(assignment.availableFrom).getTime() > Date.now()) {
      return apiError(403, "Assignment is not available yet", requestId);
    }
    if (assignment) {
      const rosterValidation = await validateAssignmentRosterEmail({
        classId: assignment.classId,
        studentEmail,
      });
      if (!rosterValidation.ok) return apiError(403, rosterValidation.message, requestId);
    }
    if (assignment?.dueAt && new Date(assignment.dueAt).getTime() < Date.now()) {
      return apiError(410, "Assignment due date has passed", requestId);
    }

    const cookieName = `quiz_take_${quiz.id}`;
    const assessmentDurationMinutes =
      verified.assessmentDurationMinutes ??
      quiz.shareSettings?.assessmentDurationMinutes ??
      null;
    const assessmentCookieName = `quiz_assessment_${quiz.id}`;
    if (assessmentDurationMinutes) {
      const assessmentToken = req.cookies.get(assessmentCookieName)?.value ?? "";
      const verifiedAssessment = assessmentToken
        ? verifyTimedAssessmentSessionToken(assessmentToken)
        : null;
      const activeTakeSessionId = req.cookies.get(cookieName)?.value ?? "";
      if (
        !verifiedAssessment?.ok ||
        verifiedAssessment.quizId !== quiz.id ||
        verifiedAssessment.takeSessionId !== activeTakeSessionId
      ) {
        return apiError(
          410,
          "Timed assessment session is no longer active. Reopen the shared link to start again.",
          requestId
        );
      }
      if (verifiedAssessment.expiresAt < Date.now()) {
        return apiError(410, "Assessment timer has ended", requestId);
      }
    }

    const existingRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "StudentQuizAttempt"
      WHERE "quizId" = ${quiz.id}
        AND "studentEmail" = ${studentEmail}
        AND "assignmentId" IS NOT DISTINCT FROM ${assignment?.id ?? null}
    `;
    if ((existingRows[0]?.count ?? 0) > 0) {
      return apiError(
        409,
        "This email has already submitted this quiz. Ask your teacher if a retake is needed.",
        requestId
      );
    }

    const takeSessionId = req.cookies.get(cookieName)?.value ?? randomUUID();
    try {
      await prisma.studentQuizTake.create({
        data: {
          quizId: quiz.id,
          takeSessionId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return apiError(
          410,
          "This quiz session expired or was already completed. Reopen the shared link to start again.",
          requestId
        );
      }
      throw err;
    }

    const { details, total, correct, scorePercent } = scoreQuizAnswers(
      quiz.questions,
      answersInput
    );
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    await prisma.$executeRaw`
      INSERT INTO "StudentQuizAttempt" (
        "id",
        "quizId",
        "assignmentId",
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
        ${assignment?.id ?? null},
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
        assignmentId: assignment?.id ?? null,
        assignmentTitle: assignment?.title ?? null,
        studentName,
        studentEmail,
        totalQuestions: total,
        correctAnswers: correct,
        scorePercent,
      },
    });

    invalidateDashboardSummarySnapshot(quiz.userId);
    invalidateInterventionSummarySnapshots(quiz.userId);

    const response = NextResponse.json(
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
    response.cookies.set(cookieName, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    response.cookies.set(assessmentCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (err) {
    logApiError(requestId, "quiz-share-submit", err);
    return apiError(500, "Failed to submit quiz", requestId);
  }
}
