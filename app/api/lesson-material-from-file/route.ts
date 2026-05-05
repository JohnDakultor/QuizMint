import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import {
  extractProviderErrorDetails,
  trackGenerationEvent,
} from "@/lib/generation-events";
import {
  generateLessonPlanPptAIWithMeta,
  type LessonPlanPptAIMeta,
} from "@/lib/lesson-plan-ppt-ai";
import { checkFeatureBurstLimitDistributed } from "@/lib/abuse-guard";
import { createAsyncGenerationJob } from "@/lib/async-generation-jobs";
import { dispatchAsyncGenerationJob } from "@/lib/async-job-dispatch";
import { log } from "@/lib/logger";
import {
  buildFreeLessonPlanPointsStatusPayload,
  deductFreeLessonPlanPoints,
  getLessonPlanGenerationPointCost,
  isFreeLessonPlanPointLimited,
  restoreFreeLessonPlanPoints,
  type DeductFreeLessonPlanPointsResult,
} from "@/lib/free-tier-points";
import {
  deriveTopicFromFilename,
  extractUploadedFileText,
  normalizeExtractedText,
  splitTextIntoParagraphChunks,
  SUPPORTED_TEXT_EXTRACTION_EXTENSIONS,
} from "@/lib/file-text-extraction";
import {
  buildFrameworkPhaseModel,
  getLessonPlanFramework,
  normalizeLessonPlanFramework,
} from "@/lib/lesson-plan-frameworks";
import { hasPremiumFeaturePlan } from "@/lib/organization-subscription";

export const runtime = "nodejs";

const MIN_CONTENT_CHARS = 120;
const MAX_QUEUED_UPLOAD_BYTES = 2 * 1024 * 1024;
const PROVIDER_ISSUE_MESSAGE =
  "Server issue - we're fixing it. Please try again in a few minutes.";

function isProviderIssueError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || "");
  return (
    message.includes("AI response failed:") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":402') ||
    message.includes('"code":429') ||
    message.includes('"code":503') ||
    message.includes("Provider returned error")
  );
}

function buildPseudoLessonPlan(input: {
  text: string;
  topic: string;
  subject: string;
  grade: string;
  duration: string;
  framework: string;
  frameworkFocus?: string;
  days: number;
  minutesPerDay: number;
}) {
  const framework = getLessonPlanFramework(input.framework);
  const chunkCount = Math.min(Math.max(input.days, 1), 7);
  const chunks = splitTextIntoParagraphChunks(input.text).slice(0, chunkCount);
  const days = (chunks.length ? chunks : [input.text.slice(0, 900)]).map(
    (chunk, index) => {
      const compact = chunk.replace(/\s+/g, " ").trim();
      const summary = compact.slice(0, 260);
      return {
        day: index + 1,
        topic: `${input.topic} - Part ${index + 1}`,
        "4asModel": buildFrameworkPhaseModel(framework.id, {
          topic: input.frameworkFocus
            ? `${input.topic} (${input.frameworkFocus})`
            : input.topic,
          subject: input.subject,
          grade: input.grade,
          minutesPerDay: input.minutesPerDay,
        }),
        specificActivities: framework.supportsSpecificActivities ? {
          ACTIVITY: {
            readingPassage: chunk,
            questions: [
              {
                question: `What is the key idea in part ${index + 1} of ${input.topic}?`,
                answer: summary || `Main concept for ${input.topic}.`,
              },
            ],
          },
          ANALYSIS: {
            checklist: [
              `Identify important terms from part ${index + 1}`,
              `Connect this part to ${input.subject} concepts`,
            ],
          },
          ABSTRACTION: {
            explanation:
              summary || `Core explanation for ${input.topic} part ${index + 1}.`,
          },
          APPLICATION: {
            realWorldExamples: [
              {
                example: `Apply ${input.topic} part ${index + 1} in a practical classroom scenario.`,
              },
            ],
          },
        } : {},
        assessment: [
          {
            criteria: `Understanding of ${input.topic} part ${index + 1}`,
            description: `Learner explains and applies content from part ${index + 1}.`,
            rubricLevel: {
              excellent: "Accurate explanation with concrete application.",
              satisfactory: "Basic explanation with limited application.",
              needsImprovement: "Needs support to explain core ideas.",
            },
          },
        ],
        closure: `Summarize the most important points from part ${index + 1}.`,
      };
    }
  );

  return {
    title: `${input.topic} Lesson Material`,
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    duration: input.duration,
    framework: framework.id,
    frameworkLabel: framework.label,
    frameworkFocus: input.frameworkFocus || "",
    minutesPerDay: input.minutesPerDay,
    days,
    objectives: [
      `Understand the main concepts in ${input.topic}.`,
      `Apply concepts from the uploaded lesson content.`,
    ],
  };
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  let extForEvent = "unknown";
  let extractedTextLength = 0;
  let metaForEvent: LessonPlanPptAIMeta | null = null;
  let deductedFreeLessonPlanPoints: DeductFreeLessonPlanPointsResult | null = null;

  try {
    const internalSecret =
      process.env.GENERATION_JOB_INTERNAL_SECRET ||
      process.env.INTERNAL_API_SECRET ||
      "";
    const isInternalTrusted =
      Boolean(internalSecret) &&
      req.headers.get("x-generation-job-secret") === internalSecret;
    const internalUserId = req.headers.get("x-async-user-id");

    let user: { id: string; subscriptionPlan: string | null; liteMode: boolean | null } | null = null;
    if (isInternalTrusted && internalUserId) {
      user = await prisma.user.findUnique({
        where: { id: internalUserId },
        select: {
          id: true,
          subscriptionPlan: true,
          liteMode: true,
        },
      });
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          subscriptionPlan: true,
          liteMode: true,
        },
      });
    }

    if (!user) return apiError(404, "User not found", requestId);
    eventUserId = user.id;
    eventPlan = String(user.subscriptionPlan || "free").toLowerCase();

    const burstCheck = await checkFeatureBurstLimitDistributed({
      userId: user.id,
      plan: user.subscriptionPlan,
      feature: "lesson_material_upload",
    });
    if (!burstCheck.ok) {
      return apiError(
        429,
        `Too many file-to-PPTX requests. Please wait ${burstCheck.retryAfterSec}s and try again.`,
        requestId,
        {
          retryAfterSec: burstCheck.retryAfterSec,
          limitPerMinute: burstCheck.limit,
        }
      );
    }

    const normalizedPlan = String(user.subscriptionPlan || "free").toLowerCase();
    const isFree = isFreeLessonPlanPointLimited(normalizedPlan);
    const isProOrPremium =
      normalizedPlan === "pro" || hasPremiumFeaturePlan(normalizedPlan);
    const pointCost = getLessonPlanGenerationPointCost({ hasUpload: true });
    if (isFree) {
      const pointStatus = buildFreeLessonPlanPointsStatusPayload(
        user,
        pointCost,
        new Date()
      );
      if (!pointStatus.canAfford) {
        return apiError(
          403,
          "Not enough lesson plan credits for file-to-PPTX upload.",
          requestId,
          pointStatus
        );
      }
      deductedFreeLessonPlanPoints = await deductFreeLessonPlanPoints(
        user.id,
        pointCost,
        new Date()
      );
      if (!deductedFreeLessonPlanPoints) {
        return apiError(
          403,
          "Not enough lesson plan credits for file-to-PPTX upload.",
          requestId,
          pointStatus
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError(400, "No file uploaded", requestId);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    extForEvent = ext || "unknown";
    if (!SUPPORTED_TEXT_EXTRACTION_EXTENSIONS.has(ext)) {
      return apiError(
        400,
        "Unsupported file type. Supported: txt, docx, pdf, pptx, xlsx, csv, md",
        requestId
      );
    }

    const isAsyncInternal = req.headers.get("x-async-internal") === "1";
    const asyncField = String(formData.get("async") || formData.get("queue") || "").toLowerCase();
    const queueRequested =
      asyncField === "true" || asyncField === "1" || asyncField === "yes";
    if (queueRequested && !isAsyncInternal) {
      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_QUEUED_UPLOAD_BYTES) {
        return apiError(
          413,
          `Queued upload is limited to ${Math.floor(MAX_QUEUED_UPLOAD_BYTES / (1024 * 1024))}MB.`,
          requestId
        );
      }
      const queued = await createAsyncGenerationJob({
        userId: user.id,
        type: "lesson_material_upload",
        request: {
          fields: {
            framework: String(formData.get("framework") || ""),
            topic: String(formData.get("topic") || ""),
            subject: String(formData.get("subject") || ""),
            grade: String(formData.get("grade") || ""),
            days: String(formData.get("days") || ""),
            minutesPerDay: String(formData.get("minutesPerDay") || ""),
            frameworkFocus: String(formData.get("frameworkFocus") || ""),
            duration: String(formData.get("duration") || ""),
          },
          file: {
            name: file.name,
            type: file.type || "application/octet-stream",
            base64: Buffer.from(arrayBuffer).toString("base64"),
          },
        },
        requestId,
      });
      if (!queued) return apiError(500, "Failed to queue generation job", requestId);
      const dispatched = await dispatchAsyncGenerationJob(req, queued.id, {
        subscriptionPlan: user.subscriptionPlan,
      });
      return NextResponse.json(
        {
          ok: true,
          queued: true,
          jobId: queued.id,
          status: queued.status,
          dispatched,
          requestId,
        },
        {
          status: 202,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    const fileBytes = await file.arrayBuffer();
    const extractionResult = await extractUploadedFileText({
      fileName: file.name,
      ext,
      arrayBuffer: fileBytes,
    });
    if (extractionResult.cacheHit) {
      log.debug("lesson_material_file_extract_cache_hit", {
        fileName: file.name,
        ext,
      });
    }
    const extracted = extractionResult.text;
    const cleanText = normalizeExtractedText(extracted);
    extractedTextLength = cleanText.length;
    if (cleanText.length < MIN_CONTENT_CHARS) {
      return apiError(
        400,
        "Insufficient content in uploaded file. Please upload a file with more lesson text.",
        requestId
      );
    }

    const framework = normalizeLessonPlanFramework(String(formData.get("framework") || "").trim());
    const frameworkFocus = String(formData.get("frameworkFocus") || "").trim();
    const topic = String(formData.get("topic") || "").trim() || deriveTopicFromFilename(file.name) || "Uploaded Lesson Plan";
    const subject = String(formData.get("subject") || "").trim() || "General";
    const grade = String(formData.get("grade") || "").trim() || "General";
    const parsedDays = Number(formData.get("days") || 1);
    const parsedMinutesPerDay = Number(formData.get("minutesPerDay") || 40);
    const daysCount = Number.isFinite(parsedDays) ? Math.min(Math.max(Math.trunc(parsedDays), 1), 7) : 1;
    const minutesPerDay = Number.isFinite(parsedMinutesPerDay)
      ? Math.min(Math.max(Math.trunc(parsedMinutesPerDay), 10), 120)
      : 40;
    const duration =
      String(formData.get("duration") || "").trim() ||
      `${daysCount} day(s), ${minutesPerDay} minutes per day`;

    const pseudoLessonPlan = buildPseudoLessonPlan({
      text: cleanText,
      topic,
      subject,
      grade,
      duration,
      framework,
      frameworkFocus,
      days: daysCount,
      minutesPerDay,
    });

    const { deck, meta } = await generateLessonPlanPptAIWithMeta(
      {
        lessonPlan: pseudoLessonPlan,
        topic,
        subject,
        grade,
        duration,
        isProOrPremium,
      },
      { liteMode: Boolean(user.liteMode) }
    );
    metaForEvent = meta;

    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "pptx_generated",
      feature: "lesson_material_upload",
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: meta.estimatedCostUsd,
      metadata: {
        fileExtension: extForEvent,
        extractedTextLength,
        model: meta.finalModel,
        provider: meta.finalProvider,
        fallbackUsed: meta.fallbackUsed,
        retryCount: meta.retryCount,
      },
    });

    return NextResponse.json(
      {
        deck,
        usage: isFree
          ? {
              remainingPoints: deductedFreeLessonPlanPoints?.availablePoints ?? null,
              requiredPoints: pointCost,
              maxPoints: deductedFreeLessonPlanPoints?.maxPoints ?? null,
              nextRechargeAt:
                deductedFreeLessonPlanPoints?.rechargeAt?.toISOString() ?? null,
            }
          : null,
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    if (
      deductedFreeLessonPlanPoints?.userId &&
      deductedFreeLessonPlanPoints.spentPoints > 0
    ) {
      try {
        await restoreFreeLessonPlanPoints(
          deductedFreeLessonPlanPoints.userId,
          deductedFreeLessonPlanPoints.spentPoints
        );
      } catch (restoreErr) {
        log.warn("free_lesson_plan_upload_points_restore_failed", {
          userId: deductedFreeLessonPlanPoints.userId,
          err: restoreErr,
        });
      }
    }

    logApiError(requestId, "lesson-material-from-file", err);

    if (isProviderIssueError(err)) {
      const providerError = extractProviderErrorDetails(err);
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "pptx_generated",
        feature: "lesson_material_upload",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: metaForEvent?.estimatedCostUsd ?? 0,
        metadata: {
          fileExtension: extForEvent,
          extractedTextLength,
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
      feature: "lesson_material_upload",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: metaForEvent?.estimatedCostUsd ?? 0,
      metadata: {
        fileExtension: extForEvent,
        extractedTextLength,
        message: String(err?.message || "unknown_error"),
      },
    });

    return apiError(
      500,
      err?.message || "Failed to generate lesson material from uploaded file",
      requestId
    );
  }
}
