import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { trackGenerationEvent } from "@/lib/generation-events";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  let userId: string | null = null;
  let assignmentId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);
    userId = user.id;

    const { id } = await context.params;
    assignmentId = id;
    const assignment = await prisma.assignment.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        quizId: true,
        title: true,
        shareToken: true,
        availableFrom: true,
        dueAt: true,
        closedAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment || !assignment.quizId) {
      return apiError(404, "Assignment not found", requestId);
    }

    const body = await req.json().catch(() => ({}));
    const nextShareToken = assignment.shareToken || randomUUID();
    const dueAt =
      body?.dueAt !== undefined && body?.dueAt
        ? new Date(String(body.dueAt))
        : assignment.dueAt;
    const availableFrom =
      body?.availableFrom !== undefined
        ? body?.availableFrom
          ? new Date(String(body.availableFrom))
          : null
        : assignment.availableFrom;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        shareToken: nextShareToken,
        availableFrom:
          availableFrom && !Number.isNaN(availableFrom.getTime()) ? availableFrom : null,
        dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
        status:
          dueAt && !Number.isNaN(dueAt.getTime())
            ? "open"
            : availableFrom && !Number.isNaN(availableFrom.getTime())
            ? "scheduled"
            : "open",
      },
      select: {
        id: true,
        title: true,
        shareToken: true,
        availableFrom: true,
        dueAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const shareUrl = `${req.nextUrl.origin}/assignment/${encodeURIComponent(nextShareToken)}`;

    await trackGenerationEvent({
      userId: user.id,
      eventType: "assignment_shared",
      feature: "assignment_share_link",
      status: "success",
      metadata: {
        assignmentId: updatedAssignment.id,
        quizId: assignment.quizId,
        shareUrl,
        requestId,
        availableFrom: updatedAssignment.availableFrom?.toISOString() ?? null,
        dueAt: updatedAssignment.dueAt?.toISOString() ?? null,
        classId: updatedAssignment.class.id,
        className: updatedAssignment.class.name,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        shareUrl,
        assignment: updatedAssignment,
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    await trackGenerationEvent({
      userId,
      eventType: "assignment_shared",
      feature: "assignment_share_link",
      status: "failed",
      metadata: {
        assignmentId,
        requestId,
        error: err instanceof Error ? err.message : "Failed to create assignment share link",
      },
    });
    logApiError(requestId, "assignment-share-create", err);
    return apiError(500, "Failed to create assignment share link", requestId);
  }
}
