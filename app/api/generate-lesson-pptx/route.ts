import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanPptx } from "@/lib/generate-lesson-plan-pptx";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";
import { extractProviderErrorDetails, trackGenerationEvent } from "@/lib/generation-events";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { checkFeatureBurstLimitDistributed } from "@/lib/abuse-guard";

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
  let eventSource: "lesson_plan" | "lesson_material_upload" = "lesson_plan";
  let eventFeature = "lesson_plan_pptx";
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, "Unauthorized", requestId);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionPlan: true, liteMode: true },
    });

    if (!user) {
      return apiError(404, "User not found", requestId);
    }

    const burstCheck = await checkFeatureBurstLimitDistributed({
      userId: user.id,
      plan: user.subscriptionPlan,
      feature: "lesson_pptx_download",
    });
    if (!burstCheck.ok) {
      return apiError(
        429,
        `Too many PPTX download requests. Please wait ${burstCheck.retryAfterSec}s and try again.`,
        requestId,
        {
          retryAfterSec: burstCheck.retryAfterSec,
          limitPerMinute: burstCheck.limit,
        }
      );
    }

    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";

    const body = await req.json();
    const deck = body?.deck as PptDeck | undefined;
    const source = body?.source === "lesson_material_upload" ? "lesson_material_upload" : "lesson_plan";
    eventSource = source;
    eventFeature =
      source === "lesson_material_upload"
        ? "lesson_material_upload_pptx"
        : "lesson_plan_pptx";

    if (!deck || !deck.slides || !Array.isArray(deck.slides)) {
      return apiError(400, "Invalid deck", requestId);
    }

    const plan = user.subscriptionPlan || "free";
    const isPremium = plan === "premium";
    const isFree = plan === "free" || !plan;

    // Policy:
    // - lesson_plan decks: premium only (existing behavior)
    // - lesson_material_upload decks: free/pro/premium allowed
    if (source === "lesson_plan" && !isPremium) {
      return apiError(403, "Premium required", requestId);
    }
    if (source === "lesson_material_upload" && isFree) {
      const usageRows = await prisma.$queryRaw<Array<{ lessonMaterialUploadUsage: number | null }>>`
        SELECT "lessonMaterialUploadUsage" FROM "User" WHERE id = ${user.id} LIMIT 1
      `;
      const uploadUsage = Number(usageRows?.[0]?.lessonMaterialUploadUsage || 0);
      if (uploadUsage <= 0) {
        return apiError(
          403,
          "Generate slides from an uploaded lesson file first before downloading PPTX.",
          requestId
        );
      }
    }

    const pptxBuffer = await generateLessonPlanPptx(deck, {
      liteMode: Boolean((user as any).liteMode),
    });
    await trackGenerationEvent({
      userId: user.id,
      eventType: "pptx_generated",
      feature: eventFeature,
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: { slideCount: deck.slides.length, source: eventSource },
    });
    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${(deck.title || "Lesson_Plan")
          .replace(/\s+/g, "_")
          .slice(0, 50)}.pptx"`,
      },
    });
  } catch (err: any) {
    logApiError(requestId, "generate-lesson-pptx", err);
    if (isProviderIssueError(err)) {
      const providerError = extractProviderErrorDetails(err);
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "pptx_generated",
        feature: eventFeature,
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: {
          providerIssue: true,
          provider: providerError.provider ?? "unknown",
          providerCode: providerError.code,
          source: eventSource,
        },
      });
      return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
    }
    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "pptx_generated",
      feature: eventFeature,
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: { message: String(err?.message || "unknown_error"), source: eventSource },
    });
    return apiError(500, `Failed to generate PPTX: ${err.message}`, requestId);
  }
}
