import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { invalidateDashboardSummarySnapshot } from "@/lib/dashboard-summary-snapshot";
import { trackGenerationEvent } from "@/lib/generation-events";
import { invalidateInterventionSummarySnapshots } from "@/lib/intervention-summary-snapshot";
import { prisma } from "@/lib/prisma";
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

    const assignment = await prisma.assignment.findFirst({
      where: { shareToken: token },
      include: {
        quiz: {
          include: {
            questions: true,
            shareSettings: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment?.quiz) return apiError(404, "Assignment not found", requestId);
    if (assignment.status === "closed" || assignment.closedAt) {
      return apiError(410, "Assignment is closed by the teacher", requestId);
    }
    if (assignment.availableFrom && new Date(assignment.availableFrom).getTime() > Date.now()) {
      return apiError(403, "Assignment is not available yet", requestId);
    }
    if (assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now()) {
      return apiError(410, "Assignment due date has passed", requestId);
    }
    if (assignment.quiz.shareSettings?.isOpen === false) {
      return apiError(410, "Quiz is closed by the teacher", requestId);
    }

    const rosterValidation = await validateAssignmentRosterEmail({
      classId: assignment.class.id,
      studentEmail,
    });
    if (!rosterValidation.ok) return apiError(403, rosterValidation.message, requestId);

    const existingRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "StudentQuizAttempt"
      WHERE "quizId" = ${assignment.quiz.id}
        AND "assignmentId" = ${assignment.id}
        AND "studentEmail" = ${studentEmail}
    `;
    if ((existingRows[0]?.count ?? 0) > 0) {
      return apiError(
        409,
        "This email has already submitted this assignment. Ask your teacher if a retake is needed.",
        requestId
      );
    }

    const cookieName = `assignment_take_${assignment.id}`;
    const takeSessionId = req.cookies.get(cookieName)?.value ?? randomUUID();
    try {
      await prisma.studentQuizTake.create({
        data: {
          quizId: assignment.quiz.id,
          takeSessionId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return apiError(
          410,
          "This assignment session expired or was already completed. Reopen the shared link to start again.",
          requestId
        );
      }
      throw err;
    }

    const { details, total, correct, scorePercent } = scoreQuizAnswers(
      assignment.quiz.questions,
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
        ${assignment.quiz.id},
        ${assignment.id},
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
      eventType: "assignment_submitted",
      feature: "assignment_share",
      status: "success",
      metadata: {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        classId: assignment.class.id,
        className: assignment.class.name,
        quizId: assignment.quiz.id,
        studentName,
        studentEmail,
        totalQuestions: total,
        correctAnswers: correct,
        scorePercent,
      },
    });

    invalidateDashboardSummarySnapshot(assignment.userId);
    invalidateInterventionSummarySnapshots(assignment.userId);

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
    return response;
  } catch (err) {
    logApiError(requestId, "assignment-share-submit", err);
    return apiError(500, "Failed to submit assignment", requestId);
  }
}
