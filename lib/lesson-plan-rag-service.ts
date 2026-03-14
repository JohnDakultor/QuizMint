import { prisma } from "@/lib/prisma";
import { enhancePromptWithRAG } from "@/lib/rag/pipeLine";
import { ingestWebSourcesForQuery } from "@/lib/rag/web";
import { semanticCacheStore } from "@/lib/rag/semanticCache";
import { log } from "@/lib/logger";

export async function runLessonPlanAssistiveRag(input: {
  basePrompt: string;
  namespace: string;
  topic: string;
  subject: string;
  grade: string;
  liteMode: boolean;
  stageMs: { ingest: number; rag: number; cacheWrite: number };
}) {
  let promptForGeneration = input.basePrompt;
  let cachedResponse: string | null = null;
  let ragMeta:
    | {
        promptForCache: string;
        embedding: number[];
        namespace: string;
      }
    | null = null;
  let hasContext = false;
  let sourceMode: "semantic_cache" | "documents" | "none" = "none";
  let sources: { url: string; title?: string }[] = [];
  let webIngestSources: { url: string; title?: string }[] = [];
  let ragContextText = "";

  if (input.liteMode) {
    return {
      promptForGeneration,
      cachedResponse,
      ragMeta,
      hasContext,
      sourceMode,
      sources,
      ragContextText,
      cacheStored: false,
    };
  }

  try {
    const docCountRows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "Document" WHERE namespace = ${input.namespace}
    `;
    const hasDocs = (docCountRows[0]?.count ?? 0) > 0;
    if (!hasDocs) {
      const ingestStartedAt = Date.now();
      const firstIngest = await ingestWebSourcesForQuery({
        query: `${input.topic} ${input.subject} ${input.grade} lesson plan`,
        namespace: input.namespace,
        maxSources: 5,
        maxChunks: 24,
        minSimilarity: 0.45,
      });
      webIngestSources = firstIngest.sources ?? [];
      if (webIngestSources.length < 5) {
        const secondIngest = await ingestWebSourcesForQuery({
          query: `${input.topic} ${input.subject} ${input.grade} classroom examples`,
          namespace: input.namespace,
          maxSources: 5,
          maxChunks: 24,
          minSimilarity: 0.4,
        });
        const merged = [...webIngestSources, ...(secondIngest.sources ?? [])];
        const seen = new Set<string>();
        webIngestSources = merged.filter((s) => {
          const key = (s.url || "").trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      input.stageMs.ingest = Date.now() - ingestStartedAt;
    }
  } catch (ingestErr) {
    log.warn("lesson_plan_web_ingest_failed", { namespace: input.namespace, err: ingestErr });
  }

  try {
    const ragStartedAt = Date.now();
    const ragResult = await enhancePromptWithRAG({
      finalPrompt: input.basePrompt,
      namespace: input.namespace,
      topK: 8,
    });
    input.stageMs.rag = Date.now() - ragStartedAt;
    promptForGeneration = ragResult.enhancedPrompt || input.basePrompt;
    cachedResponse = ragResult.cachedResponse ?? null;
    const ragSources = ragResult.sources ?? [];
    const mergedSources = [...ragSources, ...webIngestSources];
    const seen = new Set<string>();
    sources = mergedSources
      .filter((s) => {
        const key = (s.url || "").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
    ragMeta = ragResult.ragMeta ?? null;
    hasContext = ragResult.hasContext ?? false;
    sourceMode = ragResult.sourceMode ?? "none";
    if (sourceMode === "none" && sources.length > 0) sourceMode = "documents";
    if (hasContext && promptForGeneration.includes("\n\nUser request:\n")) {
      ragContextText = promptForGeneration.split("\n\nUser request:\n")[0] || "";
    }
  } catch (ragErr) {
    log.warn("lesson_plan_rag_failed", { namespace: input.namespace, err: ragErr });
  }

  return {
    promptForGeneration,
    cachedResponse,
    ragMeta,
    hasContext,
    sourceMode,
    sources,
    ragContextText,
    cacheStored: false,
  };
}

export async function storeLessonPlanSemanticCache(input: {
  liteMode: boolean;
  ragMeta:
    | {
        promptForCache: string;
        embedding: number[];
        namespace: string;
      }
    | null;
  cachedResponse: string | null;
  lessonPlan: unknown;
  namespace: string;
  stageMs: { cacheWrite: number };
}) {
  if (input.liteMode || !input.ragMeta || input.cachedResponse) return false;
  try {
    const cacheStoreStartedAt = Date.now();
    await semanticCacheStore(
      input.ragMeta.promptForCache,
      input.ragMeta.embedding,
      JSON.stringify(input.lessonPlan),
      input.ragMeta.namespace
    );
    input.stageMs.cacheWrite = Date.now() - cacheStoreStartedAt;
    return true;
  } catch (cacheErr) {
    log.warn("lesson_plan_semantic_cache_store_failed", {
      namespace: input.namespace,
      err: cacheErr,
    });
    return false;
  }
}

