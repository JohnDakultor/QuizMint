import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { processLessonPlanExportJob } from "@/lib/lesson-plan-export";
import { extractProviderErrorDetails, trackGenerationEvent } from "@/lib/generation-events";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

export const runtime = "nodejs";
const PROVIDER_ISSUE_MESSAGE =
  "Server issue - we're fixing it. Please try again in a few minutes.";

function isProviderIssueError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || "");
  return (
    message.includes("AI response failed:") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":402') ||
    message.includes("Provider returned error")
  );
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, "Unauthorized", requestId);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionPlan: true },
    });
    if (!user) {
      return apiError(404, "User not found", requestId);
    }
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";
    if (user.subscriptionPlan !== "premium") {
      return apiError(403, "Premium required", requestId);
    }

    const body = await req.json().catch(() => ({}));
    let jobId = body?.jobId ? String(body.jobId) : "";

    if (!jobId) {
      const nextQueued = await prisma.lessonPlanExport.findFirst({
        where: { userId: user.id, status: "queued" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!nextQueued) {
        return apiError(404, "No queued job", requestId);
      }
      jobId = nextQueued.id;
    }

    const processed = await processLessonPlanExportJob(jobId, user.id);
    if (!processed) {
      return apiError(404, "Job not found", requestId);
    }
    const job = processed.job;
    const telemetry = processed.telemetry || { costUsd: 0 };

    if (job.status === "failed") {
      await trackGenerationEvent({
        userId: user.id,
        eventType: "export_failed",
        feature: "lesson_plan_export",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: typeof telemetry.costUsd === "number" ? telemetry.costUsd : 0,
        metadata: {
          jobId: job.id,
          format: job.format,
          error: job.error || null,
          ...telemetry,
        },
      });
    }

    if (job.status === "completed") {
      await trackGenerationEvent({
        userId: user.id,
        eventType: "export_generated",
        feature: "lesson_plan_export",
        status: "success",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: typeof telemetry.costUsd === "number" ? telemetry.costUsd : 0,
        metadata: {
          jobId: job.id,
          format: job.format,
          ...telemetry,
        },
      });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      error: job.error || null,
      requestId,
    }, {
      headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    if (isProviderIssueError(err)) {
      const providerError = extractProviderErrorDetails(err);
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "export_failed",
        feature: "lesson_plan_export",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: {
          providerIssue: true,
          provider: providerError.provider ?? "unknown",
          providerCode: providerError.code,
        },
      });
      return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
    }
    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "export_failed",
      feature: "lesson_plan_export",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: { message: err?.message || "Failed to process job" },
    });
    logApiError(requestId, "lesson-plan-export/process", err);
    return apiError(500, err?.message || "Failed to process job", requestId);
  }
}
