import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const { token } = await params;
    if (!token) return apiError(400, "Missing token", requestId);

    const assignment = await prisma.assignment.findFirst({
      where: { shareToken: token },
      select: {
        id: true,
        quizId: true,
      },
    });

    if (!assignment || !assignment.quizId) {
      return apiError(404, "Assignment not found", requestId);
    }

    const cookieName = `assignment_take_${assignment.id}`;
    const takeSessionId = req.cookies.get(cookieName)?.value ?? "";
    if (!takeSessionId) {
      return NextResponse.json(
        { ok: true, requestId },
        {
          headers: {
            "x-request-id": requestId,
            "Cache-Control": "no-store",
          },
        },
      );
    }

    await prisma.studentQuizTake.upsert({
      where: {
        quizId_takeSessionId: {
          quizId: assignment.quizId,
          takeSessionId,
        },
      },
      update: {},
      create: {
        quizId: assignment.quizId,
        takeSessionId,
      },
    });

    return NextResponse.json(
      { ok: true, requestId },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    logApiError(requestId, "assignment-share-expire", err);
    return apiError(500, "Failed to expire assignment session", requestId);
  }
}
