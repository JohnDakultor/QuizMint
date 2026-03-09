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
import { generateQuizAI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";
import { embed, normalizeForEmbedding } from "@/lib/rag/embed";
import { enhancePromptWithRAG } from "@/lib/rag/pipeLine";
import { semanticCacheStore } from "@/lib/rag/semanticCache";
import { checkFeatureBurstLimit } from "@/lib/abuse-guard";
import { trackGenerationEvent } from "@/lib/generation-events";
import { buildPromptProfile } from "@/lib/adaptive-personalization";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { logDebug, logWarn } from "@/lib/logger";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  const requestId = createRequestId();
  try {
    // --- AUTH ---
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email)
      return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.subscriptionPlan !== "premium")
      return apiError(403, "You must subscribe to upload files.", requestId);
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";

    const burstCheck = checkFeatureBurstLimit({
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
    const file = formData.get("file") as File | null;
    const prompt = (formData.get("prompt") as string) || "";

    const difficulty = user.aiDifficulty || "easy";
    const adaptiveLearning = user.adaptiveLearning ?? false;

    let content = "";

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const arrayBuffer = await file.arrayBuffer();

      if (ext === "txt") {
        content = new TextDecoder().decode(arrayBuffer);
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
    }

    // --- INGEST FILE INTO RAG ---
    const namespace = `quiz:${user.id}`;
    const title = file?.name || "Uploaded file";
    const sourceType = file?.name.split(".").pop()?.toLowerCase() || "file";

    const chunks = chunkText(content);
    if (chunks.length > 0) {
      // Replace previous chunks for this namespace (keeps RAG focused)
      await prisma.$executeRaw`
        DELETE FROM "Document" WHERE namespace = ${namespace}
      `;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await embed(chunk);
        await prisma.$executeRaw`
          INSERT INTO "Document" (
            id, namespace, "sourceUrl", title, "sourceType",
            "chunkIndex", content, embedding, "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid(), ${namespace}, ${null}, ${title}, ${sourceType},
            ${i}, ${chunk}, ${embedding}::vector, now(), now()
          )
        `;
      }
    }

    // --- RAG-ENHANCED GENERATION ---
    const basePrompt = enforceDefaultQuestionCount(prompt || "", 10);

    const { enhancedPrompt, cachedResponse, sources, ragMeta, sourceMode } =
      await enhancePromptWithRAG({
        finalPrompt: basePrompt,
        namespace,
      });

    // --- GENERATE QUIZ ---
    const quiz = cachedResponse
      ? JSON.parse(cachedResponse)
      : await generateQuizAI(
          enhancedPrompt,
          difficulty,
          adaptiveLearning,
          true,
          basePrompt,
        );

    if (ragMeta && !cachedResponse) {
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
        explanation?: string | null;
        hint?: string | null;
      }) => ({
        question: q.question ?? "",
        options: Array.isArray(q.options) ? q.options : [],
        answer: q.answer ?? "",
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
        fileName: file?.name ?? null,
        fileType: sourceType,
      },
    });

    return NextResponse.json({
      message: "Quiz generated",
      quiz: savedQuiz,
      sources: sources ?? [],
      sourceTrace: {
        mode: sourceMode ?? "none",
        fromCache: Boolean(cachedResponse),
        sourceCount: (sources ?? []).length,
      },
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
