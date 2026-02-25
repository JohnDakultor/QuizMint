import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanPptx } from "@/lib/generate-lesson-plan-pptx";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";
import { extractProviderErrorDetails, trackGenerationEvent } from "@/lib/generation-events";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

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

    const body = await req.json();
    const deck = body?.deck as PptDeck | undefined;

    if (!deck || !deck.slides || !Array.isArray(deck.slides)) {
      return apiError(400, "Invalid deck", requestId);
    }

    const pptxBuffer = await generateLessonPlanPptx(deck);
    await trackGenerationEvent({
      userId: user.id,
      eventType: "pptx_generated",
      feature: "lesson_plan_pptx",
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      metadata: { slideCount: deck.slides.length },
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
        feature: "lesson_plan_pptx",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
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
      eventType: "pptx_generated",
      feature: "lesson_plan_pptx",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      metadata: { message: String(err?.message || "unknown_error") },
    });
    return apiError(500, `Failed to generate PPTX: ${err.message}`, requestId);
  }
}
