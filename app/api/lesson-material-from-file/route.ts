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
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import os from "os";
import path from "path";
import pptxTextParser from "pptx-text-parser";
import {
  buildFileExtractionCacheKey as buildExtractionCacheKey,
  getCachedFileExtraction,
} from "@/lib/source-extraction-cache";

export const runtime = "nodejs";

const MIN_CONTENT_CHARS = 120;
const MAX_QUEUED_UPLOAD_BYTES = 2 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
  "txt",
  "docx",
  "pdf",
  "ppt",
  "pptx",
  "xlsx",
  "csv",
  "md",
]);
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

function normalizeExtractedText(text: string): string {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function splitIntoChunks(text: string, maxChunkChars = 1100): string[] {
  const clean = normalizeExtractedText(text);
  if (!clean) return [];
  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [clean.slice(0, maxChunkChars)];

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > maxChunkChars) {
      if (current) chunks.push(current.trim());
      current = paragraph;
      continue;
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function deriveTopicFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildPseudoLessonPlan(input: {
  text: string;
  topic: string;
  subject: string;
  grade: string;
  duration: string;
  framework: string;
  days: number;
  minutesPerDay: number;
}) {
  const chunkCount = Math.min(Math.max(input.days, 1), 7);
  const chunks = splitIntoChunks(input.text).slice(0, chunkCount);
  const days = (chunks.length ? chunks : [input.text.slice(0, 900)]).map(
    (chunk, index) => {
      const compact = chunk.replace(/\s+/g, " ").trim();
      const summary = compact.slice(0, 260);
      return {
        day: index + 1,
        topic: `${input.topic} - Part ${index + 1}`,
        specificActivities: {
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
        },
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
    framework: input.framework,
    minutesPerDay: input.minutesPerDay,
    days,
    objectives: [
      `Understand the main concepts in ${input.topic}.`,
      `Apply concepts from the uploaded lesson content.`,
    ],
  };
}

function extractTextFromPdfBytesFallback(arrayBuffer: ArrayBuffer): string {
  // Fallback parser: extracts printable text runs from raw PDF bytes.
  // Not perfect, but avoids runtime worker failures in dev/prod server bundles.
  const buffer = Buffer.from(arrayBuffer);
  const raw = buffer.toString("latin1");
  const matches = raw.match(/[A-Za-z0-9][A-Za-z0-9\s,.;:()'"%\-_/]{6,}/g) || [];
  const cleaned = matches
    .map((m) => m.replace(/\s+/g, " ").trim())
    .filter((m) => m.length > 8);
  return cleaned.join("\n");
}

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const typedArray = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjs.getDocument({
      data: typedArray,
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    } as any);
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const text = await page.getTextContent();
      const pageText = text.items
        .map((item: any) => String(item?.str || ""))
        .join(" ")
        .trim();
      if (pageText) pages.push(pageText);
    }

    const extracted = pages.join("\n\n").trim();
    if (extracted.length >= MIN_CONTENT_CHARS) return extracted;
  } catch (err) {
    const message = String((err as Error)?.message || err || "");
    const isWorkerIssue =
      message.includes("Setting up fake worker failed") ||
      message.includes("pdf.worker.mjs");
    if (isWorkerIssue) {
      log.info("lesson_material_pdf_worker_unavailable", {
        message: "pdfjs worker unavailable in server bundle; using fallback parser",
      });
    } else {
      log.warn("lesson_material_pdf_parse_failed", {
        message: "pdfjs parse failed; using fallback parser",
        err: message,
      });
    }
  }

  return extractTextFromPdfBytesFallback(arrayBuffer);
}

async function extractFileTextFromArrayBuffer(arrayBuffer: ArrayBuffer, ext: string, fileName: string): Promise<string> {
  if (ext === "txt" || ext === "md" || ext === "csv") {
    return new TextDecoder().decode(arrayBuffer);
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
    return result.value;
  }

  if (ext === "xlsx") {
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const rows: string[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      rows.push(XLSX.utils.sheet_to_csv(sheet));
    });
    return rows.join("\n");
  }

  if (ext === "pptx" || ext === "ppt") {
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);
    try {
      await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
      const text = await pptxTextParser(tempFilePath, "text");
      return text;
    } finally {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }

  if (ext === "pdf") {
    return extractTextFromPdf(arrayBuffer);
  }

  throw new Error("Unsupported file type");
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
      normalizedPlan === "pro" || normalizedPlan === "premium";
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
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
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
    const extractionCacheKey = buildExtractionCacheKey({
      fileName: file.name,
      ext,
      bytes: fileBytes,
    });
    const extractionResult = await getCachedFileExtraction(extractionCacheKey, async () =>
      extractFileTextFromArrayBuffer(fileBytes, ext, file.name)
    );
    if (extractionResult.cacheHit) {
      log.debug("lesson_material_file_extract_cache_hit", {
        fileName: file.name,
        ext,
      });
    }
    const extracted = extractionResult.value;
    const cleanText = normalizeExtractedText(extracted);
    extractedTextLength = cleanText.length;
    if (cleanText.length < MIN_CONTENT_CHARS) {
      return apiError(
        400,
        "Insufficient content in uploaded file. Please upload a file with more lesson text.",
        requestId
      );
    }

    const framework = String(formData.get("framework") || "").trim() || "4a";
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
