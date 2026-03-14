import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { createRequestId, apiError, logApiError } from "@/lib/api-error";
import { getAsyncGenerationJob } from "@/lib/async-generation-jobs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return apiError(404, "User not found", requestId);

    const { id } = await params;
    const job = await getAsyncGenerationJob(id, user.id);
    if (!job) return apiError(404, "Job not found", requestId);

    return NextResponse.json(
      {
        ok: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          error: job.error,
          result: job.result,
          attemptCount: job.attemptCount,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
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
  } catch (err) {
    logApiError(requestId, "generation-jobs/[id]", err);
    return apiError(500, "Failed to get job", requestId);
  }
}

