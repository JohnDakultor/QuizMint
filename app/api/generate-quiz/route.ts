import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateQuizAIWithMeta } from "@/lib/ai";
import { enhancePromptWithRAG } from "@/lib/rag/pipeLine";
import { semanticCacheStore } from "@/lib/rag/semanticCache";
import { ingestWebSourcesForQuery } from "@/lib/rag/web";
import { embed, normalizeForEmbedding } from "@/lib/rag/embed";
import { extractProviderErrorDetails, trackGenerationEvent } from "@/lib/generation-events";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { buildPromptProfile } from "@/lib/adaptive-personalization";
import { checkFeatureBurstLimitDistributed } from "@/lib/abuse-guard";
import { createAsyncGenerationJob } from "@/lib/async-generation-jobs";
import { dispatchAsyncGenerationJob } from "@/lib/async-job-dispatch";
import { log } from "@/lib/logger";
import {
  buildBalancedContentWindow,
  chunkText,
  extractTextFromURL,
  extractYouTubeTranscript,
  fetchYouTubeMetadata,
  isURL,
  normalizeQuestionCountInput,
} from "@/lib/quiz-source-service";
import { buildQuizAdaptiveGuidance } from "@/lib/quiz-adaptive-service";

const COOLDOWN_HOURS = 3;
const FREE_QUIZ_LIMIT = 3;

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildAdaptiveProfileInput(input: {
  rawInput: string;
  resolvedContent: string;
  sourceTitle: string;
  isUrlInput: boolean;
}) {
  const parts: string[] = [];
  if (input.rawInput?.trim()) parts.push(input.rawInput.trim());
  if (input.sourceTitle?.trim()) parts.push(input.sourceTitle.trim());
  if (input.isUrlInput && input.resolvedContent?.trim()) {
    parts.push(input.resolvedContent.slice(0, 1200));
  }
  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  const requestId = createRequestId();
  const stageMs = {
    contentPrep: 0,
    ingest: 0,
    rag: 0,
    ai: 0,
    cacheWrite: 0,
    dbWrite: 0,
  };
  try {
    const ensureNotAborted = () => {
      if (req.signal.aborted) {
        const abortedError = new Error("REQUEST_ABORTED");
        (abortedError as Error & { name: string }).name = "AbortError";
        throw abortedError;
      }
    };

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
      if (!session?.user?.email)
        return apiError(401, "Unauthorized", requestId);
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
    }
    if (!user)
      return apiError(404, "User not found", requestId);
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";
    const liteMode = Boolean((user as { liteMode?: boolean }).liteMode);


    log.info("quiz_request_user", {
      id: user.id,
      subscriptionPlan: user.subscriptionPlan,
      aiDifficulty: user.aiDifficulty,
      adaptiveLearning: user.adaptiveLearning,
      quizUsage: user.quizUsage,
      liteMode,
    });

    const now = new Date();
    const subscriptionPlan = user.subscriptionPlan || "free";
    const isFree = subscriptionPlan === "free";
    const isProOrPremium =
      user.subscriptionPlan === "pro" || user.subscriptionPlan === "premium";

    const burstCheck = await checkFeatureBurstLimitDistributed({
      userId: user.id,
      plan: user.subscriptionPlan,
      feature: "quiz_generate",
    });
    if (!burstCheck.ok) {
      return apiError(
        429,
        `Too many quiz generation requests. Please wait ${burstCheck.retryAfterSec}s and try again.`,
        requestId,
        {
          retryAfterSec: burstCheck.retryAfterSec,
          limitPerMinute: burstCheck.limit,
        }
      );
    }

    if (isFree && user.quizUsage >= FREE_QUIZ_LIMIT) {
      if (user.lastQuizAt) {
        const hoursSinceLastQuiz =
          (now.getTime() - new Date(user.lastQuizAt).getTime()) /
          1000 /
          60 /
          60;
        if (hoursSinceLastQuiz < COOLDOWN_HOURS) {
          const nextFreeAt = new Date(
            new Date(user.lastQuizAt).getTime() +
              COOLDOWN_HOURS * 60 * 60 * 1000
          );
          const adCooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
          const windowStart = user.quizAdResetWindowAt
            ? new Date(user.quizAdResetWindowAt)
            : null;
          const resetCount = user.quizAdResetCount ?? 0;
          const windowExpired =
            !windowStart || now.getTime() - windowStart.getTime() >= adCooldownMs;
          const remainingResets = windowExpired ? 5 : Math.max(5 - resetCount, 0);
          const adResetAvailable = remainingResets > 0;
          const nextAdResetAt = adResetAvailable
            ? null
            : new Date(
                (windowStart ? windowStart.getTime() : now.getTime()) + adCooldownMs
              ).toISOString();
          return NextResponse.json(
            {
              error: "Free limit reached. Come back later.",
              nextFreeAt,
              quizUsage: user.quizUsage,
              adResetAvailable,
              nextAdResetAt,
              adResetsRemaining: remainingResets,
              requestId,
            },
            {
              status: 403,
              headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
            }
          );
        }

        // Reset usage after cooldown
        await prisma.user.update({
          where: { id: user.id },
          data: { quizUsage: 0 },
        });
        user.quizUsage = 0;
      }
    }

    // Parse body
    const body = await req.json();
    const isAsyncInternal = req.headers.get("x-async-internal") === "1";
    const queueRequested =
      body?.async === true || body?.async === "true" || body?.queue === true;
    if (queueRequested && !isAsyncInternal) {
      const queued = await createAsyncGenerationJob({
        userId: user.id,
        type: "quiz_generate",
        request: { body },
        requestId,
      });
      if (!queued) return apiError(500, "Failed to queue generation job", requestId);
      const dispatched = await dispatchAsyncGenerationJob(req, queued.id);
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
    
    // Safely get requested values with defaults
    const requestedDifficulty = body.difficulty && typeof body.difficulty === "string" 
      ? body.difficulty.toLowerCase().trim() 
      : undefined;
    const requestedItemCount = normalizeQuestionCountInput(body.numberOfItems);
    
    const requestedAdaptive = typeof body.adaptiveLearning === "boolean" 
      ? body.adaptiveLearning 
      : (typeof body.adaptiveLearning === "string"
        ? body.adaptiveLearning.toLowerCase() === "true"
        : undefined);
    const forceFreshGeneration = Boolean(body.forceFreshGeneration === true || body.forceFresh === true);
    
    const text = body.text?.trim();
    if (!text)
      return apiError(400, "No input provided", requestId);
    const itemCountInstruction = requestedItemCount
      ? `Generate exactly ${requestedItemCount} questions.`
      : "";

    // Determine content source
    let content = text;
    let sourceTitle = "";

    const contentPrepStartedAt = Date.now();
    if (isURL(content)) {
      if (liteMode) {
        try {
          const urlObj = new URL(content);
          const host = urlObj.hostname.replace(/^www\./, "");
          const pathParts = urlObj.pathname
            .split("/")
            .filter(Boolean)
            .slice(-2);
          const titleHint = decodeURIComponent(pathParts.join(" "))
            .replace(/[-_]+/g, " ")
            .trim();
          sourceTitle = titleHint || host;
          content = [
            `Source URL: ${text}`,
            sourceTitle ? `Title hint: ${sourceTitle}` : "",
            "Lite mode is enabled, so deep URL extraction was skipped.",
            "Generate a concise quiz from the available URL context and the user's instructions.",
          ]
            .filter(Boolean)
            .join("\n");
        } catch {
          content = `Source URL: ${text}\nLite mode is enabled, so deep URL extraction was skipped.`;
        }
      } else if (content.includes("youtube.com") || content.includes("youtu.be")) {
        // Premium check
        if (isFree) {
          return apiError(403, "YouTube link generation is premium only", requestId);
        }

        // Extract video ID correctly
        let videoId: string | undefined;
        try {
          const urlObj = new URL(content);
          if (urlObj.hostname.includes("youtu.be")) {
            videoId = urlObj.pathname.split("/").pop()?.split("?")[0];
          } else {
            videoId = urlObj.searchParams.get("v") || undefined;
          }
        } catch {
          return apiError(400, "Invalid YouTube URL", requestId);
        }

        if (!videoId) {
          return apiError(400, "Could not extract video ID", requestId);
        }

        // Try fetching transcript
        let extractedText = await extractYouTubeTranscript(videoId);

        // Fallback: use video title + description if transcript is empty
        if (!extractedText?.trim()) {
          try {
            const { title, description } = await fetchYouTubeMetadata(videoId);
            sourceTitle = title;
            extractedText = `${title}\n\n${description}`;
          } catch (err) {
            log.warn("youtube_metadata_fallback_failed", { videoId, err });
            extractedText = `⚠️ Limited content: only video ID ${videoId} available.`;
          }
        } else {
          try {
            const { title } = await fetchYouTubeMetadata(videoId);
            sourceTitle = title;
          } catch {
            sourceTitle = "";
          }
        }

        content = extractedText;
      } else {
        const targetUrl = content;
        const extracted = await extractTextFromURL(content);
        content = extracted.text;
        sourceTitle = extracted.title;
        log.debug("url_extracted", {
          url: targetUrl,
          title: sourceTitle || null,
          chars: content?.length || 0,
        });
      }
    }

    stageMs.contentPrep = Date.now() - contentPrepStartedAt;

    if (!content?.trim())
      return apiError(400, "Content Not Available", requestId);
    content = buildBalancedContentWindow(content, 8000);
    const promptProfile = buildPromptProfile(
      buildAdaptiveProfileInput({
        rawInput: text,
        resolvedContent: content,
        sourceTitle,
        isUrlInput: isURL(text),
      }),
    );

    // Validate and set difficulty
    const validDifficulties = new Set(["easy", "medium", "hard"]);
    const userDifficulty = user.aiDifficulty || "easy";
    
    // Only use requested difficulty if user is pro/premium AND it's valid
    let chosenDifficulty = userDifficulty;
    if (isProOrPremium && requestedDifficulty && validDifficulties.has(requestedDifficulty)) {
      chosenDifficulty = requestedDifficulty;
    }
    
    // Free users always get "easy"
    const safeDifficulty = isFree ? "easy" : chosenDifficulty;

    // Validate and set adaptive learning
    const canUseAdaptive = user.subscriptionPlan === "premium";
    const userAdaptive = user.adaptiveLearning ?? false;
    
    // Only use requested adaptive if user is premium
    let chosenAdaptive = userAdaptive;
    if (canUseAdaptive && typeof requestedAdaptive === "boolean") {
      chosenAdaptive = requestedAdaptive;
    }
    
    const safeAdaptive = canUseAdaptive ? chosenAdaptive : false;
    let adaptiveGuidance = "";
    const effectiveDifficulty = safeDifficulty;

    if (safeAdaptive) {
      adaptiveGuidance = await buildQuizAdaptiveGuidance(user.id);
    }

    // Update user preferences only if they're different
    if (isProOrPremium) {
      const updateData: { aiDifficulty?: string; adaptiveLearning?: boolean } = {};
      let needsUpdate = false;
      
      if (requestedDifficulty && validDifficulties.has(requestedDifficulty) && requestedDifficulty !== user.aiDifficulty) {
        updateData.aiDifficulty = safeDifficulty;
        needsUpdate = true;
      }
      
      if (typeof requestedAdaptive === "boolean" && requestedAdaptive !== user.adaptiveLearning) {
        updateData.adaptiveLearning = safeAdaptive;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    log.debug("quiz_request_body", {
      textChars: typeof body.text === "string" ? body.text.length : 0,
      difficulty: body.difficulty,
      adaptiveLearning: body.adaptiveLearning,
      adaptiveGuidanceEnabled: Boolean(adaptiveGuidance),
      effectiveDifficulty,
    });

    const isPromptOnly = !isURL(text);
    const isUrlInput = isURL(text);
    const baseNamespace = `quiz:${user.id}`;
    const webNamespace = `web:${user.id}:${hashString(text)}`;
    const urlNamespace = `url:${user.id}:${hashString(text)}`;
    const namespace = isPromptOnly ? webNamespace : isUrlInput ? urlNamespace : baseNamespace;

    let webDebug: unknown = null;
    if (liteMode) {
      // Lite mode: skip heavy web/url ingestion and semantic retrieval for faster low-bandwidth flow.
      stageMs.ingest = 0;
      stageMs.rag = 0;
    } else if (isPromptOnly) {
      const docCountRows = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM "Document" WHERE namespace = ${namespace}
      `;
      const hasDocs = (docCountRows[0]?.count ?? 0) > 0;

      if (!hasDocs) {
        try {
          const ingestStartedAt = Date.now();
          ensureNotAborted();
          const webResult = await ingestWebSourcesForQuery({
            query: text,
            namespace,
          });
          ensureNotAborted();
          stageMs.ingest = Date.now() - ingestStartedAt;
          webDebug = webResult.debug;
        } catch (webErr) {
          log.warn("quiz_rag_web_ingest_failed", { namespace, err: webErr });
        }
      }
    } else if (isUrlInput) {
      const docCountRows = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM "Document" WHERE namespace = ${namespace}
      `;
      const hasDocs = (docCountRows[0]?.count ?? 0) > 0;

      if (!hasDocs) {
        const ingestStartedAt = Date.now();
        const chunks = chunkText(content);
        for (let i = 0; i < chunks.length; i++) {
          ensureNotAborted();
          const chunk = chunks[i];
          const embedding = await embed(chunk);
          await prisma.$executeRaw`
            INSERT INTO "Document" (
              id, namespace, "sourceUrl", title, "sourceType",
              "chunkIndex", content, embedding, "createdAt", "updatedAt"
            )
            VALUES (
              gen_random_uuid(), ${namespace}, ${text}, ${sourceTitle || null}, ${"url"},
              ${i}, ${chunk}, ${embedding}::vector, now(), now()
            )
          `;
        }
        stageMs.ingest = Date.now() - ingestStartedAt;
      }
    }

    ensureNotAborted();

    let enhancedPrompt = content;
    let cachedResponse: string | null = null;
    let sources: Array<{ url: string; title?: string }> = [];
    let ragMeta: {
      promptForCache: string;
      embedding: number[];
      namespace: string;
    } | null = null;
    let hasContext = false;
    let sourceMode: string | null = null;
    if (!liteMode) {
      const ragStartedAt = Date.now();
      const ragResult = await enhancePromptWithRAG({
        finalPrompt: content,
        namespace,
        topK: isPromptOnly ? 5 : 5,
      });
      enhancedPrompt = ragResult.enhancedPrompt;
      cachedResponse = forceFreshGeneration ? null : (ragResult.cachedResponse ?? null);
      sources = ragResult.sources ?? [];
      ragMeta = ragResult.ragMeta ?? null;
      hasContext = ragResult.hasContext ?? false;
      sourceMode = ragResult.sourceMode ?? "none";
      stageMs.rag = Date.now() - ragStartedAt;
    }

    // Generate quiz with safe parameters
    ensureNotAborted();

    const aiStartedAt = Date.now();
    const composedUserPrompt = [
      text,
      itemCountInstruction,
      adaptiveGuidance,
      requestedItemCount
        ? "STRICT QUESTION COUNT: Follow the requested number of items exactly."
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const aiResult = cachedResponse
      ? null
      : await generateQuizAIWithMeta(
          isPromptOnly && !hasContext ? text : enhancedPrompt,
          effectiveDifficulty,
          safeAdaptive,
          isProOrPremium,
          composedUserPrompt,
          { liteMode }
        );
    const quiz = cachedResponse ? JSON.parse(cachedResponse) : aiResult!.quiz;
    if (!cachedResponse) {
      stageMs.ai = Date.now() - aiStartedAt;
    }

    let cacheStored = false;
    if (!liteMode && ragMeta && !cachedResponse) {
      try {
        const cacheStoreStartedAt = Date.now();
        ensureNotAborted();
        await semanticCacheStore(
          ragMeta.promptForCache,
          ragMeta.embedding,
          JSON.stringify(quiz),
          ragMeta.namespace
        );
        stageMs.cacheWrite = Date.now() - cacheStoreStartedAt;
        cacheStored = true;
      } catch (cacheErr: unknown) {
        if (
          cacheErr instanceof Error &&
          (cacheErr.name === "AbortError" || cacheErr.message === "REQUEST_ABORTED")
        ) {
          throw cacheErr;
        }
        log.warn("quiz_semantic_cache_store_failed", { namespace, err: cacheErr });
      }
    }

    type NormalizedSource = { url: string; title?: string };
    const normalizedSources = (Array.isArray(sources) ? sources : [])
      .reduce<NormalizedSource[]>((acc, source) => {
        const url = typeof source?.url === "string" ? source.url.trim() : "";
        const title =
          typeof source?.title === "string" ? source.title.trim() : "";
        if (!url) return acc;
        acc.push(title ? { url, title } : { url });
        return acc;
      }, [])
      .slice(0, 5);

    // Sanitize questions
    const safeQuestions = quiz.questions.map((q: {
      question: string;
      options: string[];
      answer: string;
      explanation?: string | null;
      hint?: string | null;
    }) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: safeAdaptive ? q.explanation ?? null : null,
      hint: safeAdaptive ? q.hint ?? null : null,
    }));

    ensureNotAborted();

    const dbWriteStartedAt = Date.now();
    const savedQuiz = await prisma.quiz.create({
      data: {
        title: quiz.title,
        instructions: quiz.instructions,
        userId: user.id,
        questions: { create: safeQuestions },
      },
      include: { questions: true },
    });

    let nextQuizUsage: number | null = null;
    if (isFree) {
      ensureNotAborted();
      const updatedUsageRows = await prisma.$queryRaw<Array<{ quizUsage: number | null }>>`
        UPDATE "User"
        SET
          "quizUsage" = CASE
            WHEN "lastQuizAt" IS NULL OR "lastQuizAt" <= (NOW() - INTERVAL '3 hours') THEN 1
            ELSE COALESCE("quizUsage", 0) + 1
          END,
          "lastQuizAt" = NOW(),
          "lastActiveAt" = NOW()
        WHERE id = ${user.id}
          AND (
            "lastQuizAt" IS NULL
            OR "lastQuizAt" <= (NOW() - INTERVAL '3 hours')
            OR COALESCE("quizUsage", 0) < ${FREE_QUIZ_LIMIT}
          )
        RETURNING COALESCE("quizUsage", 0) AS "quizUsage"
      `;
      if (!updatedUsageRows[0]) {
        return apiError(
          403,
          "Free limit reached. Come back later.",
          requestId
        );
      }
      nextQuizUsage = Number(updatedUsageRows[0].quizUsage || 0);
    } else {
      ensureNotAborted();
      await prisma.user.update({
        where: { id: user.id },
        data: { lastQuizAt: now, lastActiveAt: now },
      });
    }
    stageMs.dbWrite = Date.now() - dbWriteStartedAt;

    await trackGenerationEvent({
      userId: user.id,
      eventType: "quiz_generated",
      feature: "quiz",
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: aiResult?.meta.estimatedCostUsd ?? 0,
      metadata: {
        liteMode,
        difficulty: effectiveDifficulty,
        requestedItemCount,
        sourceMode: sourceMode ?? "none",
        sourceCount: (sources ?? []).length,
        sources: normalizedSources,
        cacheHit: Boolean(cachedResponse),
        forceFreshGeneration,
        quizId: savedQuiz.id,
        promptTopic: promptProfile.topic,
        promptKeywords: promptProfile.keywords,
        promptPreview: promptProfile.preview,
        retryCount: aiResult?.meta.retryCount ?? 0,
        fallbackUsed: aiResult?.meta.fallbackUsed ?? false,
        finalModel: aiResult?.meta.finalModel ?? null,
        finalProvider: aiResult?.meta.finalProvider ?? null,
        promptTokens: aiResult?.meta.promptTokens ?? 0,
        completionTokens: aiResult?.meta.completionTokens ?? 0,
        totalTokens: aiResult?.meta.totalTokens ?? 0,
        costUsd: aiResult?.meta.estimatedCostUsd ?? 0,
        stageMs,
      },
    });

    return NextResponse.json({
      message: "Quiz generated successfully",
      quiz: savedQuiz,
      ...(liteMode
        ? {}
        : {
            sources: sources ?? [],
            webDebug,
            sourceTrace: {
              mode: sourceMode ?? "none",
              fromCache: Boolean(cachedResponse),
              sourceCount: (sources ?? []).length,
            },
          }),
      quizUsage: isFree ? nextQuizUsage : null,
      remaining:
        isFree && nextQuizUsage !== null
          ? Math.max(FREE_QUIZ_LIMIT - nextQuizUsage, 0)
          : null,
      cache: {
        hit: Boolean(cachedResponse),
        stored: cacheStored,
        hasRagMeta: Boolean(ragMeta),
      },
    });
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.message === "REQUEST_ABORTED") {
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "pause_clicked",
        feature: "quiz",
        status: "aborted",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: { stageMs },
      });
      return NextResponse.json(
        { error: "Generation paused by user", requestId },
        {
          status: 499,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    const message = String(err?.message || "");
    const isProviderQuotaIssue =
      message.includes("AI response failed:") &&
      (message.includes("Quota exceeded") ||
        message.includes('"code":402') ||
        message.includes("Provider returned error"));

    if (isProviderQuotaIssue) {
      const providerError = extractProviderErrorDetails(err);
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "quiz_generated",
        feature: "quiz",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: {
          providerIssue: true,
          provider: providerError.provider ?? "unknown",
          providerCode: providerError.code,
          stageMs,
        },
      });
      return NextResponse.json(
        { error: "Server issue - we're fixing it. Please try again in a few minutes.", requestId },
        {
          status: 503,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "quiz_generated",
      feature: "quiz",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: { message: String(err?.message || "unknown_error"), stageMs },
    });
    logApiError(requestId, "generate-quiz", err);
    return apiError(500, err.message || "Internal server error", requestId);
  }
}
  
