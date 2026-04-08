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
  buildFreeQuizPointsStatusPayload,
  deductFreeQuizPoints,
  getQuizGenerationPointCost,
  isFreeQuizPointLimited,
  restoreFreeQuizPoints,
  type DeductFreeQuizPointsResult,
} from "@/lib/free-tier-points";
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
import {
  buildStoredStructureFromAI,
  encodeAnswerWithStructure,
  stripStructuredMeta,
} from "@/lib/quiz-structured";
import { invalidateDashboardSummarySnapshot } from "@/lib/dashboard-summary-snapshot";
import { invalidateInterventionSummarySnapshots } from "@/lib/intervention-summary-snapshot";
import { buildQuizArtifactsFromPersistedQuiz } from "@/lib/quiz-artifacts";
import { shouldQueueQuizGeneration } from "@/lib/quiz-workload-routing";
type LocalGamifiedMode = "bingo" | "timeline" | "puzzle";

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

function normalizeMixCountInput(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(50, Math.max(0, Math.floor(n)));
}

function hasQuestionTypeIntent(prompt: string): boolean {
  const p = String(prompt || "").toLowerCase();
  return /mcq|multiple\s*choice|true\s*\/?\s*false|fill\s*in\s*the\s*blank|short\s*answer|matching|match\s*the\s*following|essay|rubric|worksheet|gamified|super race|case challenge|bingo|timeline|timeline order|sudoku|puzzle|mix|mixed/i.test(
    p
  );
}

function buildQuizCacheKey(input: {
  difficulty: string;
  adaptiveLearning: boolean;
  requestedItemCount: number | null;
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
    gamifiedMode: input.gamifiedMode ?? "puzzle",
    questionMix: mix,
  });
}

function stripInlineAnswerArtifacts(value: string) {
  if (!value) return "";
  return value
    .replace(/\n?\s*answer\s*:\s*.*$/i, "")
    .replace(/\n?\s*correct answer\s*:\s*.*$/i, "")
    .trim();
}

function parseLaunchContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sourceType =
    typeof (value as Record<string, unknown>).sourceType === "string"
      ? String((value as Record<string, unknown>).sourceType)
      : null;
  const sourceId =
    typeof (value as Record<string, unknown>).sourceId === "string"
      ? String((value as Record<string, unknown>).sourceId)
      : null;
  const mode =
    typeof (value as Record<string, unknown>).mode === "string"
      ? String((value as Record<string, unknown>).mode)
      : null;
  if (!sourceType || !sourceId || !mode) return null;
  return {
    sourceType,
    sourceId,
    classId:
      typeof (value as Record<string, unknown>).classId === "string"
        ? String((value as Record<string, unknown>).classId)
        : null,
    className:
      typeof (value as Record<string, unknown>).className === "string"
        ? String((value as Record<string, unknown>).className)
        : null,
    assignmentTitle:
      typeof (value as Record<string, unknown>).assignmentTitle === "string"
        ? String((value as Record<string, unknown>).assignmentTitle)
        : null,
    mode,
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  let eventLaunchContext: ReturnType<typeof parseLaunchContext> = null;
  let deductedFreeQuizPoints: DeductFreeQuizPointsResult | null = null;
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
      freeQuizPoints: user.freeQuizPoints,
      freeQuizPointsRechargeAt: user.freeQuizPointsRechargeAt,
      liteMode,
    });

    const now = new Date();
    const subscriptionPlan = user.subscriptionPlan || "free";
    const isFree = isFreeQuizPointLimited(subscriptionPlan);
    const isProOrPremium =
      user.subscriptionPlan === "pro" || user.subscriptionPlan === "premium";
    const pointCost = getQuizGenerationPointCost({ hasUploads: false });

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

    // Parse body
    const body = await req.json();
    const isAsyncInternal = req.headers.get("x-async-internal") === "1";
    const queueRequestedExplicit =
      body?.async === true || body?.async === "true" || body?.queue === true;
    if (isFree) {
      const pointStatus = buildFreeQuizPointsStatusPayload(user, pointCost, now);
      if (!pointStatus.canAfford) {
        return NextResponse.json(
          {
            error: "Not enough free quiz points.",
            ...pointStatus,
            requestId,
          },
          {
            status: 403,
            headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
          }
        );
      }
    }
    // Safely get requested values with defaults
    const requestedDifficulty = body.difficulty && typeof body.difficulty === "string" 
      ? body.difficulty.toLowerCase().trim() 
      : undefined;
    const requestedItemCount = normalizeQuestionCountInput(body.numberOfItems);
    const defaultItemCount = requestedItemCount ?? 10;
    const rawQuestionMix =
      body?.questionMix && typeof body.questionMix === "object"
        ? body.questionMix
        : null;
    const parsedQuestionMix = rawQuestionMix
      ? {
          mcq: normalizeMixCountInput(rawQuestionMix.mcq),
          trueFalse: normalizeMixCountInput(rawQuestionMix.trueFalse),
          fillBlank: normalizeMixCountInput(rawQuestionMix.fillBlank),
          shortAnswer: normalizeMixCountInput(rawQuestionMix.shortAnswer),
          matching: normalizeMixCountInput(rawQuestionMix.matching),
          essayRubric: normalizeMixCountInput(rawQuestionMix.essayRubric),
          worksheet: normalizeMixCountInput(
            rawQuestionMix.worksheet ?? rawQuestionMix.worksheetMath
          ),
          gamified: normalizeMixCountInput(rawQuestionMix.gamified),
        }
      : !hasQuestionTypeIntent(body?.text)
      ? {
          mcq: defaultItemCount,
          trueFalse: 0,
          fillBlank: 0,
          shortAnswer: 0,
          matching: 0,
          essayRubric: 0,
          worksheet: 0,
          gamified: 0,
        }
      : null;
    const gamifiedModeRaw =
      typeof body?.gamifiedMode === "string"
        ? body.gamifiedMode.toLowerCase().trim()
        : "";
    const gamifiedMode: LocalGamifiedMode | null =
      gamifiedModeRaw === "bingo" ||
      gamifiedModeRaw === "timeline" ||
      gamifiedModeRaw === "puzzle"
        ? (gamifiedModeRaw as LocalGamifiedMode)
        : null;
    const questionMixTotal = parsedQuestionMix
      ? (parsedQuestionMix.mcq || 0) +
        (parsedQuestionMix.trueFalse || 0) +
        (parsedQuestionMix.fillBlank || 0) +
        (parsedQuestionMix.shortAnswer || 0) +
        (parsedQuestionMix.matching || 0) +
        (parsedQuestionMix.essayRubric || 0) +
        (parsedQuestionMix.worksheet || 0) +
        (parsedQuestionMix.gamified || 0)
      : 0;
    
    const requestedAdaptive = typeof body.adaptiveLearning === "boolean" 
      ? body.adaptiveLearning 
      : (typeof body.adaptiveLearning === "string"
        ? body.adaptiveLearning.toLowerCase() === "true"
        : undefined);
    const forceFreshGeneration = Boolean(body.forceFreshGeneration === true || body.forceFresh === true);
    const launchContext = parseLaunchContext(body.launchContext);
    eventLaunchContext = launchContext;
    const text = body.text?.trim();
    if (!text)
      return apiError(400, "No input provided", requestId);
    const workloadDecision = shouldQueueQuizGeneration(
      {
        text,
        requestedItemCount,
        questionMix: parsedQuestionMix,
        adaptiveLearning: Boolean(requestedAdaptive),
      },
      Number(process.env.QUIZ_QUEUE_SCORE_THRESHOLD || 6)
    );
    const queueRequested =
      queueRequestedExplicit ||
      workloadDecision.shouldQueue;
    if (queueRequested && !isAsyncInternal) {
      const queued = await createAsyncGenerationJob({
        userId: user.id,
        type: "quiz_generate",
        request: { body },
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
    if (parsedQuestionMix && questionMixTotal <= 0) {
      return apiError(400, "Question mix is invalid.", requestId);
    }
    if (
      parsedQuestionMix &&
      requestedItemCount &&
      questionMixTotal !== requestedItemCount
    ) {
      return apiError(
        400,
        "Question mix must equal the total number of items.",
        requestId
      );
    }
    if (questionMixTotal > 50) {
      return apiError(400, "Question mix cannot exceed 50 items.", requestId);
    }
    const itemCountInstruction = requestedItemCount
      ? `Generate exactly ${requestedItemCount} questions.`
      : "";
    const questionMixInstruction =
      parsedQuestionMix && questionMixTotal > 0
        ? [
            "Use this exact question type distribution:",
            `- MCQ: ${parsedQuestionMix.mcq}`,
            `- True/False: ${parsedQuestionMix.trueFalse}`,
            `- Fill in the Blank: ${parsedQuestionMix.fillBlank}`,
            `- Short Answer: ${parsedQuestionMix.shortAnswer}`,
            `- Matching: ${parsedQuestionMix.matching}`,
            `- Essay with Rubric: ${parsedQuestionMix.essayRubric}`,
            `- Worksheet (subject-based): ${parsedQuestionMix.worksheet}`,
            `- Gamified: ${parsedQuestionMix.gamified}`,
            "Do not deviate from these counts.",
          ].join("\n")
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
    if (isFree) {
      ensureNotAborted();
      deductedFreeQuizPoints = await deductFreeQuizPoints(user.id, pointCost, now);
      if (!deductedFreeQuizPoints) {
        const pointStatus = buildFreeQuizPointsStatusPayload(user, pointCost, now);
        return NextResponse.json(
          {
            error: "Not enough free quiz points.",
            ...pointStatus,
            requestId,
          },
          {
            status: 403,
            headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
          }
        );
      }
    }
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
      adaptiveGuidance = await buildQuizAdaptiveGuidance(user.id, text);
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
      const cacheKey = buildQuizCacheKey({
        difficulty: effectiveDifficulty,
        adaptiveLearning: safeAdaptive,
        requestedItemCount,
        questionMix: parsedQuestionMix,
        gamifiedMode,
      });
      const ragResult = await enhancePromptWithRAG({
        finalPrompt: content,
        namespace,
        cacheKey,
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
      questionMixInstruction,
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
          { liteMode, questionMix: parsedQuestionMix, gamifiedMode }
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
      questionType?: string | null;
      structure?: unknown;
      explanation?: string | null;
      hint?: string | null;
    }) => ({
      question: stripInlineAnswerArtifacts(String(q.question || "")),
      options: Array.isArray(q.options)
        ? q.options.map((opt) => stripInlineAnswerArtifacts(String(opt || ""))).filter(Boolean)
        : [],
      answer: encodeAnswerWithStructure(
        stripInlineAnswerArtifacts(String(q.answer || "")),
        buildStoredStructureFromAI({
          question: String(q.question || ""),
          answer: String(q.answer || ""),
          questionType: q.questionType ?? null,
          structure: q.structure,
        })
      ),
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
    const responseQuiz = {
      ...savedQuiz,
      questions: savedQuiz.questions.map((q) => ({
        ...q,
        answer: stripStructuredMeta(q.answer),
      })),
    };
    const quizArtifacts = buildQuizArtifactsFromPersistedQuiz(savedQuiz);

    if (isFree) {
      ensureNotAborted();
      await prisma.user.update({
        where: { id: user.id },
        data: { lastQuizAt: now, lastActiveAt: now },
      });
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
        questionMix: parsedQuestionMix,
        sourceMode: sourceMode ?? "none",
        sourceCount: (sources ?? []).length,
        sources: normalizedSources,
        cacheHit: Boolean(cachedResponse),
        forceFreshGeneration,
        quizId: savedQuiz.id,
        quizArtifacts,
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
        adaptiveLaunch: Boolean(launchContext),
        interventionSourceType: launchContext?.sourceType ?? null,
        interventionSourceId: launchContext?.sourceId ?? null,
        interventionClassId: launchContext?.classId ?? null,
        interventionClassName: launchContext?.className ?? null,
        interventionAssignmentTitle: launchContext?.assignmentTitle ?? null,
        interventionMode: launchContext?.mode ?? null,
        workloadScore: workloadDecision.score,
        workloadReasons: workloadDecision.reasons,
        stageMs,
      },
    });

    invalidateDashboardSummarySnapshot(user.id);
    invalidateInterventionSummarySnapshots(user.id);

    return NextResponse.json({
      message: "Quiz generated successfully",
      quiz: responseQuiz,
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
      remainingPoints: isFree ? deductedFreeQuizPoints?.availablePoints ?? null : null,
      spentPoints: isFree ? deductedFreeQuizPoints?.spentPoints ?? null : null,
      maxPoints: isFree ? deductedFreeQuizPoints?.maxPoints ?? null : null,
      nextRechargeAt:
        isFree && deductedFreeQuizPoints?.rechargeAt
          ? deductedFreeQuizPoints.rechargeAt.toISOString()
          : null,
      cache: {
        hit: Boolean(cachedResponse),
        stored: cacheStored,
        hasRagMeta: Boolean(ragMeta),
      },
    });
  } catch (err: any) {
    if (deductedFreeQuizPoints?.userId && deductedFreeQuizPoints.spentPoints > 0) {
      try {
        await restoreFreeQuizPoints(
          deductedFreeQuizPoints.userId,
          deductedFreeQuizPoints.spentPoints
        );
      } catch (restoreErr) {
        log.warn("free_quiz_points_restore_failed", {
          userId: deductedFreeQuizPoints.userId,
          err: restoreErr,
        });
      }
    }

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
          adaptiveLaunch: Boolean(eventLaunchContext),
          interventionSourceType: eventLaunchContext?.sourceType ?? null,
          interventionSourceId: eventLaunchContext?.sourceId ?? null,
          interventionClassId: eventLaunchContext?.classId ?? null,
          interventionClassName: eventLaunchContext?.className ?? null,
          interventionAssignmentTitle: eventLaunchContext?.assignmentTitle ?? null,
          interventionMode: eventLaunchContext?.mode ?? null,
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
  
