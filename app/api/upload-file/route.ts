// import { NextResponse } from "next/server";
// import mammoth from "mammoth";
// import * as XLSX from "xlsx";
// import { generateQuizAI } from "@/lib/ai";
// import { prisma } from "@/lib/prisma";
// import { authOptions } from "@/lib/auth-option";
// import { getServerSession } from "next-auth";

// export const runtime = "nodejs";

// export async function POST(req: Request) {
//   try {
//     // 1️⃣ Authenticate user
//     const session = await getServerSession(authOptions);
//     const email = session?.user?.email;
//     if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user || user.subscriptionPlan !== "premium") {
//       return NextResponse.json(
//         { error: "You must subscribe to upload files." },
//         { status: 403 }
//       );
//     }

//     // 2️⃣ Get file and prompt from formData
//     const formData = await req.formData();
//     const file = formData.get("file") as File;
//     const prompt = (formData.get("prompt") as string) || "";

//     if (!file) return NextResponse.json({ error: "No file uploaded", status: 400 });

//     const difficulty = user.aiDifficulty || "easy";
//     const adaptiveLearning = user.adaptiveLearning ?? false;

//     const ext = file.name.split(".").pop()?.toLowerCase() || "";
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     let content = "";
//     if (ext === "txt") {
//       content = buffer.toString("utf-8");
//     } else if (ext === "docx") {
//       content = (await mammoth.extractRawText({ buffer })).value;
//     } else if (ext === "xlsx") {
//       const workbook = XLSX.read(buffer, { type: "buffer" });
//       workbook.SheetNames.forEach((sheetName) => {
//         const sheet = workbook.Sheets[sheetName];
//         content += XLSX.utils.sheet_to_csv(sheet) + "\n";
//       });
//     } else {
//       return NextResponse.json({ error: "Unsupported file type", status: 400 });
//     }

//     if (content.length > 3000) content = content.slice(0, 3000);

//     // 3️⃣ Generate AI quiz
//     const quiz = await generateQuizAI(content, difficulty, adaptiveLearning, true, prompt);

//     // 4️⃣ Sanitize for front-end
//     const safeQuiz = {
//       title: quiz.title,
//       instructions: quiz.instructions,
//       questions: quiz.questions.map((q: any) => ({
//         question: q.question,
//         options: q.options,
//         answer: q.answer,
//         explanation: adaptiveLearning ? q.explanation ?? null : null,
//         hint: adaptiveLearning ? q.hint ?? null : null,
//       })),
//     };

//     return NextResponse.json({ message: "Quiz generated", quiz: safeQuiz });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message || "Failed to process file" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import os from "os";
import path from "path";
import pptxTextParser from "pptx-text-parser";
import crypto from "crypto";
import { generateQuizAI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";
import { embed, normalizeForEmbedding } from "@/lib/rag/embed";
import { enhancePromptWithRAG } from "@/lib/rag/pipeLine";
import { semanticCacheStore } from "@/lib/rag/semanticCache";
import { checkFeatureBurstLimitDistributed } from "@/lib/abuse-guard";
import { trackGenerationEvent } from "@/lib/generation-events";
import { buildPromptProfile } from "@/lib/adaptive-personalization";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { logDebug, logWarn } from "@/lib/logger";
import type { GamifiedMode } from "@/lib/quiz-question-types";
import {
  buildStoredStructureFromAI,
  encodeAnswerWithStructure,
  stripStructuredMeta,
} from "@/lib/quiz-structured";
import { extractImageContent } from "@/lib/extract-image-content";
import { generateQuizFromImageAI } from "@/lib/quiz-image-ai";
import { buildReferenceOnlyContext, validateUploadedFiles } from "@/lib/upload-guards";
import { createAsyncGenerationJob } from "@/lib/async-generation-jobs";
import { dispatchAsyncGenerationJob } from "@/lib/async-job-dispatch";

export const runtime = "nodejs";

function buildQuizCacheKey(input: {
  difficulty: string;
  adaptiveLearning: boolean;
  requestedItemCount: number | null;
  sourceSignature?: string | null;
  questionMix: {
    mcq?: number;
    trueFalse?: number;
    fillBlank?: number;
    shortAnswer?: number;
    matching?: number;
    essayRubric?: number;
    worksheet?: number;
    gamified?: number;
  } | null;
  gamifiedMode: string | null;
}): string {
  const mix = input.questionMix
    ? {
        mcq: input.questionMix.mcq ?? 0,
        trueFalse: input.questionMix.trueFalse ?? 0,
        fillBlank: input.questionMix.fillBlank ?? 0,
        shortAnswer: input.questionMix.shortAnswer ?? 0,
        matching: input.questionMix.matching ?? 0,
        essayRubric: input.questionMix.essayRubric ?? 0,
        worksheet: input.questionMix.worksheet ?? 0,
        gamified: input.questionMix.gamified ?? 0,
      }
    : null;

  return JSON.stringify({
    v: 2,
    difficulty: input.difficulty,
    adaptiveLearning: input.adaptiveLearning,
    requestedItemCount: input.requestedItemCount ?? 10,
    sourceSignature: input.sourceSignature ?? null,
    gamifiedMode: input.gamifiedMode ?? "puzzle",
    questionMix: mix,
  });
}

function buildSourceSignature(parts: Array<string | null | undefined>) {
  const merged = parts
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n\n");
  if (!merged) return null;
  return crypto.createHash("sha256").update(merged).digest("hex");
}

function buildUploadSourceRef(fileName: string, kind: string) {
  const safeName = encodeURIComponent(String(fileName || "uploaded-file"));
  const safeKind = encodeURIComponent(String(kind || "file"));
  return `upload://${safeKind}/${safeName}`;
}

function chunkText(text: string, chunkSize = 1200, overlap = 200) {
  const cleaned = normalizeForEmbedding(text);
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = Math.max(end - overlap, 0);
  }
  return chunks;
}

function hasExplicitQuestionCount(prompt: string) {
  return /\b\d+\s*-?\s*(item|items|question|questions)\b/i.test(prompt);
}

function enforceDefaultQuestionCount(prompt: string, defaultCount = 10) {
  const trimmed = (prompt || "").trim();
  if (trimmed && hasExplicitQuestionCount(trimmed)) return trimmed;
  const defaultRule = `Generate exactly ${defaultCount} questions.`;
  if (!trimmed) {
    return `Create a quiz based on the uploaded document. ${defaultRule}`;
  }
  return `${trimmed}\n\n${defaultRule}`;
}

function normalizeQuestionCountInput(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

function normalizeMixCountInput(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(50, Math.max(0, Math.floor(n)));
}

function stripInlineAnswerArtifacts(value: string) {
  if (!value) return "";
  return value
    .replace(/\n?\s*answer\s*:\s*.*$/i, "")
    .replace(/\n?\s*correct answer\s*:\s*.*$/i, "")
    .trim();
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  const requestId = createRequestId();
  try {
    const nextReq = req as Request & {
      headers: Headers;
      signal?: AbortSignal;
      nextUrl?: URL;
    };
    // --- AUTH ---
    const internalSecret =
      process.env.GENERATION_JOB_INTERNAL_SECRET ||
      process.env.INTERNAL_API_SECRET ||
      "";
    const isInternalTrusted =
      Boolean(internalSecret) &&
      req.headers.get("x-generation-job-secret") === internalSecret;
    const internalUserId = req.headers.get("x-async-user-id");

    let user = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;
    if (isInternalTrusted && internalUserId) {
      user = await prisma.user.findUnique({ where: { id: internalUserId } });
    } else {
      const session = await getServerSession(authOptions);
      const email = session?.user?.email;
      if (!email)
        return apiError(401, "Unauthorized", requestId);
      user = await prisma.user.findUnique({ where: { email } });
    }
    if (!user || user.subscriptionPlan !== "premium")
      return apiError(403, "You must subscribe to upload files.", requestId);
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";

    const burstCheck = await checkFeatureBurstLimitDistributed({
      userId: user.id,
      plan: user.subscriptionPlan,
      feature: "quiz_file_upload_generate",
    });
    if (!burstCheck.ok) {
      return apiError(
        429,
        `Too many file quiz generation requests. Please wait ${burstCheck.retryAfterSec}s and try again.`,
        requestId,
        {
          retryAfterSec: burstCheck.retryAfterSec,
          limitPerMinute: burstCheck.limit,
        },
      );
    }

    // --- FILE & PROMPT ---
    const formData = await req.formData();
    const files = formData
      .getAll("file")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const file = files[0] ?? null;
    await validateUploadedFiles(files);
    const queueRequested =
      formData.get("async") === "true" || formData.get("queue") === "true";
    const isAsyncInternal = req.headers.get("x-async-internal") === "1";
    if (queueRequested && !isAsyncInternal) {
      const serializableFiles = await Promise.all(
        files.map(async (currentFile) => ({
          name: currentFile.name,
          type: currentFile.type,
          base64: Buffer.from(await currentFile.arrayBuffer()).toString("base64"),
        }))
      );
      const queued = await createAsyncGenerationJob({
        userId: user.id,
        type: "quiz_file_upload",
        request: {
          files: serializableFiles,
          fields: {
            prompt: String(formData.get("prompt") || ""),
            difficulty: String(formData.get("difficulty") || ""),
            adaptiveLearning: String(formData.get("adaptiveLearning") || ""),
            numberOfItems: String(formData.get("numberOfItems") || ""),
            mixMcq: String(formData.get("mixMcq") || ""),
            mixTrueFalse: String(formData.get("mixTrueFalse") || ""),
            mixFillBlank: String(formData.get("mixFillBlank") || ""),
            mixShortAnswer: String(formData.get("mixShortAnswer") || ""),
            mixMatching: String(formData.get("mixMatching") || ""),
            mixEssayRubric: String(formData.get("mixEssayRubric") || ""),
            mixWorksheet: String(
              formData.get("mixWorksheet") ?? formData.get("mixWorksheetMath") ?? ""
            ),
            mixGamified: String(formData.get("mixGamified") || ""),
            gamifiedMode: String(formData.get("gamifiedMode") || ""),
          },
        },
        requestId,
      });
      if (!queued) return apiError(500, "Failed to queue generation job", requestId);
      const dispatched = await dispatchAsyncGenerationJob(nextReq as any, queued.id);
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
    const prompt = (formData.get("prompt") as string) || "";
    const requestedItemCount = normalizeQuestionCountInput(
      formData.get("numberOfItems")
    );
    const questionMix = {
      mcq: normalizeMixCountInput(formData.get("mixMcq")),
      trueFalse: normalizeMixCountInput(formData.get("mixTrueFalse")),
      fillBlank: normalizeMixCountInput(formData.get("mixFillBlank")),
      shortAnswer: normalizeMixCountInput(formData.get("mixShortAnswer")),
      matching: normalizeMixCountInput(formData.get("mixMatching")),
      essayRubric: normalizeMixCountInput(formData.get("mixEssayRubric")),
      worksheet: normalizeMixCountInput(
        formData.get("mixWorksheet") ?? formData.get("mixWorksheetMath")
      ),
      gamified: normalizeMixCountInput(formData.get("mixGamified")),
    };
    const gamifiedModeRaw = String(formData.get("gamifiedMode") || "").toLowerCase().trim();
    const gamifiedMode: GamifiedMode | null =
      gamifiedModeRaw === "bingo" || gamifiedModeRaw === "timeline" || gamifiedModeRaw === "puzzle"
        ? (gamifiedModeRaw as GamifiedMode)
        : null;
    const questionMixTotal =
      questionMix.mcq +
      questionMix.trueFalse +
      questionMix.fillBlank +
      questionMix.shortAnswer +
      questionMix.matching +
      questionMix.essayRubric +
      questionMix.worksheet +
      questionMix.gamified;

    const difficulty = user.aiDifficulty || "easy";
    const adaptiveLearning = user.adaptiveLearning ?? false;
    const liteMode = Boolean(user.liteMode);
    if (questionMixTotal > 50) {
      return apiError(400, "Question mix cannot exceed 50 items.", requestId);
    }
    if (
      requestedItemCount &&
      questionMixTotal > 0 &&
      questionMixTotal !== requestedItemCount
    ) {
      return apiError(400, "Question mix must equal the total number of items.", requestId);
    }

    const title =
      files.length === 1
        ? file?.name || "Uploaded file"
        : files.length > 1
        ? `${files.length} uploaded files`
        : "Uploaded file";
    const sourceType =
      files.length === 1
        ? file?.name.split(".").pop()?.toLowerCase() || "file"
        : files.length > 1
        ? "mixed"
        : "file";
    let content = "";

    if (file && files.length === 1) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const arrayBuffer = await file.arrayBuffer();

      if (ext === "txt") {
        content = new TextDecoder().decode(arrayBuffer);
      } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
        const imageBuffer = Buffer.from(arrayBuffer);
        const extracted = await extractImageContent({
          buffer: imageBuffer,
          mimeType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
          fileName: file.name,
          requestId,
        });

        const namespace = `quiz:${user.id}`;
        const imageContent = extracted.text.trim();
        const basePrompt = enforceDefaultQuestionCount(
          prompt || "",
          requestedItemCount ?? (questionMixTotal > 0 ? questionMixTotal : 10)
        );
        let enhancedPrompt = basePrompt;
        let cachedResponse: string | null = null;
        let sources: Array<{ url: string; title?: string }> = [];
        let ragMeta:
          | {
              promptForCache: string;
              embedding: number[];
              namespace: string;
            }
          | null = null;
        let sourceMode: "semantic_cache" | "documents" | "none" = "none";

        if (!liteMode) {
          const chunks = chunkText(imageContent);
          if (chunks.length > 0) {
            await prisma.$executeRaw`
              DELETE FROM "Document" WHERE namespace = ${namespace}
            `;

            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              const embedding = await embed(chunk);
              const sourceRef = buildUploadSourceRef(file.name, "image");
              await prisma.$executeRaw`
                INSERT INTO "Document" (
                  id, namespace, "sourceUrl", title, "sourceType",
                  "chunkIndex", content, embedding, "createdAt", "updatedAt"
                )
                VALUES (
                  gen_random_uuid(), ${namespace}, ${sourceRef}, ${title}, ${"image"},
                  ${i}, ${chunk}, ${embedding}::vector, now(), now()
                )
              `;
            }
          }

          const sourceSignature = buildSourceSignature([
            file.name,
            imageContent,
            extracted.summary,
            extracted.labels.join(", "),
          ]);
          const cacheKey = buildQuizCacheKey({
            difficulty,
            adaptiveLearning,
            requestedItemCount,
            sourceSignature,
            questionMix: questionMixTotal > 0 ? questionMix : null,
            gamifiedMode,
          });
          const ragResult = await enhancePromptWithRAG({
            finalPrompt: basePrompt,
            namespace,
            cacheKey,
          });
          enhancedPrompt = ragResult.enhancedPrompt;
          cachedResponse = ragResult.cachedResponse ?? null;
          sources = ragResult.sources ?? [];
          ragMeta = ragResult.ragMeta ?? null;
          sourceMode = ragResult.sourceMode ?? "none";
        } else {
          enhancedPrompt = `${basePrompt}\n\n${buildReferenceOnlyContext(
            "image-derived content",
            imageContent
          )}`;
        }

        const visionQuiz = cachedResponse
          ? JSON.parse(cachedResponse)
          : await generateQuizFromImageAI({
              buffer: imageBuffer,
              mimeType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
              fileName: file.name,
              extractedText: extracted.text,
              extractedSummary: extracted.summary,
              extractedLabels: extracted.labels,
              difficulty,
              adaptiveLearning,
              isProOrPremium: true,
              userPrompt: enhancedPrompt,
              requestedItemCount,
              questionMix: questionMixTotal > 0 ? questionMix : null,
              gamifiedMode,
            });

        if (!liteMode && ragMeta && !cachedResponse) {
          try {
            await semanticCacheStore(
              ragMeta.promptForCache,
              ragMeta.embedding,
              JSON.stringify(visionQuiz),
              ragMeta.namespace
            );
          } catch (cacheErr) {
            console.warn("Semantic cache store failed:", cacheErr);
          }
        }

        const safeQuiz = {
          ...visionQuiz,
          instructions:
            visionQuiz.instructions ||
            "Answer the questions using the image-derived content provided in each question.",
          questions: visionQuiz.questions.map((q: {
            question: string;
            options: string[];
            answer: string;
            questionType?: string | null;
            structure?: unknown;
            explanation?: string | null;
            hint?: string | null;
          }) => ({
            question: stripInlineAnswerArtifacts(String(q.question ?? "")),
            options: Array.isArray(q.options)
              ? q.options
                  .map((opt) => stripInlineAnswerArtifacts(String(opt ?? "")))
                  .filter(Boolean)
              : [],
            answer: encodeAnswerWithStructure(
              stripInlineAnswerArtifacts(String(q.answer ?? "")),
              buildStoredStructureFromAI({
                question: String(q.question ?? ""),
                answer: String(q.answer ?? ""),
                questionType: q.questionType ?? null,
                structure: q.structure,
              })
            ),
            explanation: adaptiveLearning ? (q.explanation ?? null) : null,
            hint: adaptiveLearning ? (q.hint ?? null) : null,
          })),
        };

        const savedQuiz = await prisma.quiz.create({
          data: {
            title: safeQuiz.title,
            instructions: safeQuiz.instructions,
            userId: user.id,
            questions: {
              create: safeQuiz.questions.map((q: {
                question: string;
                options: string[];
                answer: string;
                explanation?: string | null;
                hint?: string | null;
              }) => ({
                question: q.question,
                options: q.options,
                answer: q.answer,
                explanation: q.explanation,
                hint: q.hint,
              })),
            },
          },
          include: {
            questions: true,
          },
        });

        const responseQuiz = {
          ...savedQuiz,
          questions: savedQuiz.questions.map((q) => ({
            ...q,
            answer: stripStructuredMeta(q.answer),
          })),
        };

        const promptProfile = buildPromptProfile(
          [prompt, file.name, extracted.summary, extracted.text.slice(0, 1200)]
            .filter(Boolean)
            .join("\n\n"),
        );

        await trackGenerationEvent({
          userId: user.id,
          eventType: "quiz_generated",
          feature: "quiz_file_upload",
          status: "success",
          plan: eventPlan,
          latencyMs: Date.now() - startedAt,
          costUsd: 0,
          metadata: {
            difficulty,
            promptTopic: promptProfile.topic,
            promptKeywords: promptProfile.keywords,
            promptPreview: promptProfile.preview,
            quizId: savedQuiz.id,
            sourceMode: sourceMode === "none" ? "image_multimodal" : sourceMode,
            sourceCount: sources.length,
            sources,
            cacheHit: Boolean(cachedResponse),
            liteMode,
            fileName: file?.name ?? null,
            fileType: sourceType,
            extractedSummary: extracted.summary,
            extractedLabels: extracted.labels,
          },
        });

        return NextResponse.json({
          message: "Quiz generated",
          quiz: responseQuiz,
          requestId,
          ...(liteMode
            ? {}
            : {
                sources,
                sourceTrace: {
                  mode: sourceMode === "none" ? "image_multimodal" : sourceMode,
                  fromCache: Boolean(cachedResponse),
                  sourceCount: sources.length,
                },
              }),
          imageTrace: {
            mode: "multimodal",
            summary: extracted.summary,
            labels: extracted.labels,
          },
        });
      } else if (ext === "docx") {
        content = (
          await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
        ).value;
      } else if (ext === "xlsx") {
        const workbook = XLSX.read(Buffer.from(arrayBuffer), {
          type: "buffer",
        });
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          content += XLSX.utils.sheet_to_csv(sheet) + "\n";
        });
      } else if (ext === "pptx" || ext === "ppt") {
        try {
          const tempFilePath = path.join(
            os.tmpdir(),
            `${Date.now()}-${file.name}`,
          );
          await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));

          content = await pptxTextParser(tempFilePath, "text");

          logDebug("PPT extracted text preview", {
            requestId,
            chars: content.length,
            preview: content.slice(0, 300),
          });

          await fs.unlink(tempFilePath);

          // --- CHECK FOR MEANINGFUL CONTENT ---
          const meaningfulText = content
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("---"))
  .join("\n");

          logDebug("PPT meaningful text", {
            requestId,
            meaningfulChars: meaningfulText.length,
          });

if (!meaningfulText) {
  // <-- Return proper 400 so frontend sees error
            return apiError(
              400,
              "No meaningful content found in the uploaded file. Please provide a file with actual text.",
              requestId,
              { code: "InsufficientContent" },
            );
}

content = meaningfulText;  // override to pass to AI
        } catch (pptErr: unknown) {
          const parseError =
            pptErr instanceof Error ? pptErr.message : String(pptErr);
          logWarn("PPT parsing failed", {
            requestId,
            error: parseError,
          });
          content = "";
        }
      } else {
        return apiError(400, "Unsupported file type", requestId);
      }
    } else if (files.length > 1) {
      const extractedParts: string[] = [];
      for (const currentFile of files) {
        const ext = currentFile.name.split(".").pop()?.toLowerCase() || "";
        const arrayBuffer = await currentFile.arrayBuffer();

        if (ext === "txt") {
          const text = new TextDecoder().decode(arrayBuffer).trim();
          if (text) {
            extractedParts.push(`File: ${currentFile.name}\n${text}`);
          }
        } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
          const extracted = await extractImageContent({
            buffer: Buffer.from(arrayBuffer),
            mimeType: currentFile.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
            fileName: currentFile.name,
            requestId,
          });
          extractedParts.push(`Image: ${currentFile.name}\n${extracted.text}`);
        } else if (ext === "docx") {
          const text = (
            await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
          ).value.trim();
          if (text) {
            extractedParts.push(`File: ${currentFile.name}\n${text}`);
          }
        } else if (ext === "xlsx") {
          let sheetContent = "";
          const workbook = XLSX.read(Buffer.from(arrayBuffer), {
            type: "buffer",
          });
          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            sheetContent += XLSX.utils.sheet_to_csv(sheet) + "\n";
          });
          if (sheetContent.trim()) {
            extractedParts.push(`File: ${currentFile.name}\n${sheetContent.trim()}`);
          }
        } else if (ext === "pptx" || ext === "ppt") {
          try {
            const tempFilePath = path.join(
              os.tmpdir(),
              `${Date.now()}-${currentFile.name}`,
            );
            await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
            const pptText = await pptxTextParser(tempFilePath, "text");
            await fs.unlink(tempFilePath);
            const meaningfulText = pptText
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line && !line.startsWith("---"))
              .join("\n")
              .trim();
            if (meaningfulText) {
              extractedParts.push(`File: ${currentFile.name}\n${meaningfulText}`);
            }
          } catch (pptErr: unknown) {
            const parseError =
              pptErr instanceof Error ? pptErr.message : String(pptErr);
            logWarn("PPT parsing failed", {
              requestId,
              fileName: currentFile.name,
              error: parseError,
            });
          }
        } else {
          return apiError(400, `Unsupported file type: ${currentFile.name}`, requestId);
        }
      }

      content = extractedParts.join("\n\n---\n\n").trim();
    }

    if (!content.trim()) {
      return apiError(
        400,
        "No meaningful content found in the uploaded file. Please provide a file with readable text or a clearer image.",
        requestId,
        { code: "InsufficientContent" },
      );
    }

    // --- INGEST FILE INTO RAG ---
    const namespace = `quiz:${user.id}`;

    // --- RAG-ENHANCED GENERATION ---
    const basePrompt = enforceDefaultQuestionCount(
      prompt || "",
      requestedItemCount ?? (questionMixTotal > 0 ? questionMixTotal : 10)
    );
    let enhancedPrompt = basePrompt;
    let cachedResponse: string | null = null;
    let sources: Array<{ url: string; title?: string }> = [];
    let ragMeta:
      | {
          promptForCache: string;
          embedding: number[];
          namespace: string;
        }
      | null = null;
    let sourceMode: "semantic_cache" | "documents" | "none" = "none";

    if (!liteMode) {
      const chunks = chunkText(content);
      if (chunks.length > 0) {
        // Replace previous chunks for this namespace (keeps RAG focused)
        await prisma.$executeRaw`
          DELETE FROM "Document" WHERE namespace = ${namespace}
        `;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await embed(chunk);
          const sourceRef = buildUploadSourceRef(title, sourceType);
          await prisma.$executeRaw`
            INSERT INTO "Document" (
              id, namespace, "sourceUrl", title, "sourceType",
              "chunkIndex", content, embedding, "createdAt", "updatedAt"
            )
            VALUES (
              gen_random_uuid(), ${namespace}, ${sourceRef}, ${title}, ${sourceType},
              ${i}, ${chunk}, ${embedding}::vector, now(), now()
            )
          `;
        }
      }

      const sourceSignature = buildSourceSignature([title, sourceType, content]);
      const cacheKey = buildQuizCacheKey({
        difficulty,
        adaptiveLearning,
        requestedItemCount,
        sourceSignature,
        questionMix: questionMixTotal > 0 ? questionMix : null,
        gamifiedMode,
      });
      const ragResult = await enhancePromptWithRAG({
        finalPrompt: basePrompt,
        namespace,
        cacheKey,
      });
      enhancedPrompt = ragResult.enhancedPrompt;
      cachedResponse = ragResult.cachedResponse ?? null;
      sources = ragResult.sources ?? [];
      ragMeta = ragResult.ragMeta ?? null;
      sourceMode = ragResult.sourceMode ?? "none";
    } else {
      enhancedPrompt = `${basePrompt}\n\n${buildReferenceOnlyContext(
        "document content",
        content
      )}`;
    }

    // --- GENERATE QUIZ ---
    const quiz = cachedResponse
      ? JSON.parse(cachedResponse)
        : await generateQuizAI(
            enhancedPrompt,
            difficulty,
            adaptiveLearning,
            true,
            basePrompt,
            {
              liteMode,
              questionMix: questionMixTotal > 0 ? questionMix : null,
              gamifiedMode,
            },
          );

    if (!liteMode && ragMeta && !cachedResponse) {
      try {
        await semanticCacheStore(
          ragMeta.promptForCache,
          ragMeta.embedding,
          JSON.stringify(quiz),
          ragMeta.namespace
        );
      } catch (cacheErr) {
        console.warn("Semantic cache store failed:", cacheErr);
      }
    }

    // --- DEFENSIVE CHECK ---
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return apiError(
        400,
        "No quiz questions generated. Reason: Provided content is insufficient for question generation.",
        requestId,
        { code: "InsufficientContent" },
      );
}

    const safeQuiz = {
      ...quiz,
      questions: quiz.questions.map((q: {
        question: string;
        options: string[];
        answer: string;
        questionType?: string | null;
        structure?: unknown;
        explanation?: string | null;
        hint?: string | null;
      }) => ({
        question: stripInlineAnswerArtifacts(String(q.question ?? "")),
        options: Array.isArray(q.options)
          ? q.options
              .map((opt) => stripInlineAnswerArtifacts(String(opt ?? "")))
              .filter(Boolean)
          : [],
        answer: encodeAnswerWithStructure(
          stripInlineAnswerArtifacts(String(q.answer ?? "")),
          buildStoredStructureFromAI({
            question: String(q.question ?? ""),
            answer: String(q.answer ?? ""),
            questionType: q.questionType ?? null,
            structure: q.structure,
          })
        ),
        explanation: adaptiveLearning ? (q.explanation ?? null) : null,
        hint: adaptiveLearning ? (q.hint ?? null) : null,
      })),
    };

    const savedQuiz = await prisma.quiz.create({
  data: {
    title: safeQuiz.title,
    instructions: safeQuiz.instructions,
    userId: user.id, // from your authenticated session
    questions: {
      create: safeQuiz.questions.map((q: {
        question: string;
        options: string[];
        answer: string;
        explanation?: string | null;
        hint?: string | null;
      }) => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        hint: q.hint,
      })),
    },
  },
  include: {
    questions: true, // return saved questions as well
  },
});
    const responseQuiz = {
      ...savedQuiz,
      questions: savedQuiz.questions.map((q) => ({
        ...q,
        answer: stripStructuredMeta(q.answer),
      })),
    };

    const promptProfile = buildPromptProfile(
      [basePrompt, title, content.slice(0, 1200)].filter(Boolean).join("\n\n"),
    );
    type NormalizedSource = { url: string; title?: string };
    const normalizedSources = (Array.isArray(sources) ? sources : [])
      .reduce<NormalizedSource[]>((acc, source) => {
        const url = typeof source?.url === "string" ? source.url.trim() : "";
        const sourceTitle =
          typeof source?.title === "string" ? source.title.trim() : "";
        if (!url) return acc;
        acc.push(sourceTitle ? { url, title: sourceTitle } : { url });
        return acc;
      }, [])
      .slice(0, 5);
    await trackGenerationEvent({
      userId: user.id,
      eventType: "quiz_generated",
      feature: "quiz_file_upload",
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: {
        difficulty,
        promptTopic: promptProfile.topic,
        promptKeywords: promptProfile.keywords,
        promptPreview: promptProfile.preview,
        quizId: savedQuiz.id,
        sourceMode: sourceMode ?? "documents",
        sourceCount: (sources ?? []).length,
        sources: normalizedSources,
        cacheHit: Boolean(cachedResponse),
        liteMode,
        fileName: file?.name ?? null,
        fileType: sourceType,
      },
    });

    return NextResponse.json({
      message: "Quiz generated",
      quiz: responseQuiz,
      ...(liteMode
        ? {}
        : {
            sources: sources ?? [],
            sourceTrace: {
              mode: sourceMode ?? "none",
              fromCache: Boolean(cachedResponse),
              sourceCount: (sources ?? []).length,
            },
          }),
      requestId,
    });
  } catch (err: unknown) {
    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "quiz_generated",
      feature: "quiz_file_upload",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: {
        message: err instanceof Error ? err.message : "unknown_error",
      },
    });
    logApiError(requestId, "upload-file", err);
    return apiError(
      500,
      err instanceof Error ? err.message : "Failed to process file",
      requestId
    );
  }
}
