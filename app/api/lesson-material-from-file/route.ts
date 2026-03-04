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
import { checkFeatureBurstLimit } from "@/lib/abuse-guard";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import os from "os";
import path from "path";
import pptxTextParser from "pptx-text-parser";

export const runtime = "nodejs";

const FREE_UPLOAD_LIMIT = 3;
const RESET_HOURS = 3;
const MIN_CONTENT_CHARS = 120;
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
}) {
  const chunks = splitIntoChunks(input.text).slice(0, 7);
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
      console.info(
        "[lesson-material-from-file] pdfjs worker unavailable in server bundle; using fallback parser."
      );
    } else {
      console.warn(
        "[lesson-material-from-file] pdfjs parse failed; using fallback parser.",
        message
      );
    }
  }

  return extractTextFromPdfBytesFallback(arrayBuffer);
}

async function extractFileText(file: File, ext: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

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
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
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

function usagePayload(used: number, resetInSeconds: number | null) {
  const remaining = Math.max(FREE_UPLOAD_LIMIT - used, 0);
  return {
    used,
    limit: FREE_UPLOAD_LIMIT,
    remaining,
    resetInSeconds,
  };
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  let extForEvent = "unknown";
  let extractedTextLength = 0;
  let metaForEvent: LessonPlanPptAIMeta | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionPlan: true,
        liteMode: true,
      },
    });

    if (!user) return apiError(404, "User not found", requestId);
    eventUserId = user.id;
    eventPlan = String(user.subscriptionPlan || "free").toLowerCase();

    const burstCheck = checkFeatureBurstLimit({
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
    const isFree = normalizedPlan === "free";
    const isProOrPremium =
      normalizedPlan === "pro" || normalizedPlan === "premium";
    const usageRows = await prisma.$queryRaw<
      Array<{
        lessonMaterialUploadUsage: number | null;
        secondsUntilReset: number | null;
      }>
    >`
      SELECT
        COALESCE("lessonMaterialUploadUsage", 0) AS "lessonMaterialUploadUsage",
        CASE
          WHEN "lastLessonMaterialUploadAt" IS NULL THEN NULL
          ELSE CEIL(EXTRACT(EPOCH FROM (("lastLessonMaterialUploadAt" + INTERVAL '3 hours') - NOW())))
        END::int AS "secondsUntilReset"
      FROM "User"
      WHERE id = ${user.id}
      LIMIT 1
    `;
    let currentUploadUsage = Number(usageRows?.[0]?.lessonMaterialUploadUsage || 0);
    let secondsUntilReset = toInt(usageRows?.[0]?.secondsUntilReset);

    // Auto-reset every 3 hours for free users (DB-time based).
    if (isFree && currentUploadUsage > 0 && secondsUntilReset !== null && secondsUntilReset <= 0) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "lessonMaterialUploadUsage" = 0,
            "lastLessonMaterialUploadAt" = NULL
        WHERE id = ${user.id}
      `;
      currentUploadUsage = 0;
      secondsUntilReset = null;
    }

    if (isFree && currentUploadUsage >= FREE_UPLOAD_LIMIT) {
      const resetInSeconds =
        secondsUntilReset === null ? null : Math.max(secondsUntilReset, 0);
      return apiError(
        403,
        "Free upload limit reached. You can generate up to 3 lesson materials from uploaded files.",
        requestId,
        {
          usage: usagePayload(currentUploadUsage, resetInSeconds),
        }
      );
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

    const extracted = await extractFileText(file, ext);
    const cleanText = normalizeExtractedText(extracted);
    extractedTextLength = cleanText.length;
    if (cleanText.length < MIN_CONTENT_CHARS) {
      return apiError(
        400,
        "Insufficient content in uploaded file. Please upload a file with more lesson text.",
        requestId
      );
    }

    const topic = String(formData.get("topic") || "").trim() || deriveTopicFromFilename(file.name) || "Uploaded Lesson Plan";
    const subject = String(formData.get("subject") || "").trim() || "General";
    const grade = String(formData.get("grade") || "").trim() || "General";
    const duration = String(formData.get("duration") || "").trim() || "1 day(s), 40 minutes per day";

    const pseudoLessonPlan = buildPseudoLessonPlan({
      text: cleanText,
      topic,
      subject,
      grade,
      duration,
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

    let nextUsage = currentUploadUsage;
    if (isFree) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "lessonMaterialUploadUsage" = COALESCE("lessonMaterialUploadUsage", 0) + 1,
            "lastLessonMaterialUploadAt" = NOW()
        WHERE id = ${user.id}
      `;
      const nextRows = await prisma.$queryRaw<
        Array<{
          lessonMaterialUploadUsage: number | null;
          secondsUntilReset: number | null;
        }>
      >`
        SELECT
          COALESCE("lessonMaterialUploadUsage", 0) AS "lessonMaterialUploadUsage",
          CASE
            WHEN "lastLessonMaterialUploadAt" IS NULL THEN NULL
            ELSE CEIL(EXTRACT(EPOCH FROM (("lastLessonMaterialUploadAt" + INTERVAL '3 hours') - NOW())))
          END::int AS "secondsUntilReset"
        FROM "User"
        WHERE id = ${user.id}
        LIMIT 1
      `;
      nextUsage = Number(nextRows?.[0]?.lessonMaterialUploadUsage || 0);
      const nextSecondsUntilReset = toInt(nextRows?.[0]?.secondsUntilReset);
      const resetInSeconds =
        nextUsage >= FREE_UPLOAD_LIMIT && nextSecondsUntilReset !== null
          ? Math.max(nextSecondsUntilReset, 0)
          : null;
      return NextResponse.json(
        {
          deck,
          usage: usagePayload(nextUsage, resetInSeconds),
          requestId,
        },
        {
          headers: {
            "x-request-id": requestId,
            "Cache-Control": "no-store",
          },
        }
      );
    }

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
        usage: null,
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
