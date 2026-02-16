// lib/rag/ragPipeline.ts
import { embed, normalizeForEmbedding } from "./embed";
import { semanticCacheLookup } from "./semanticCache";
import { retrieveContext, RagChunk } from "./retrieve";
import { buildContext } from "./context";

interface RagEnhanceInput {
  finalPrompt: string;
  namespace: string;
  cacheKey?: string; // optional override
  topK?: number;
  similarityThreshold?: number;
}

export async function enhancePromptWithRAG({
  finalPrompt,
  namespace,
  cacheKey,
  topK = 5,
  similarityThreshold = 0.85,
}: RagEnhanceInput): Promise<{
  enhancedPrompt: string;
  cachedResponse?: string;
  sources?: { url: string; title?: string }[];
  hasContext?: boolean;
  ragMeta?: {
    embedding: number[];
    namespace: string;
    promptForCache: string;
  };
}> {
  const normalizedPrompt = normalizeForEmbedding(finalPrompt);
  if (!normalizedPrompt) {
    return { enhancedPrompt: finalPrompt };
  }

  const safeTopK = Math.min(Math.max(Math.floor(topK), 1), 20);
  const safeThreshold = Math.min(Math.max(similarityThreshold, 0), 1);
  const cacheNamespace = cacheKey ? `${namespace}:${cacheKey}` : namespace;

  const embedding = await embed(normalizedPrompt);

  // 1️⃣ semantic cache (FULL RESPONSE cache)
  const cached = await semanticCacheLookup(
    embedding,
    cacheNamespace,
    safeThreshold
  );

  if (cached) {
    return {
      enhancedPrompt: finalPrompt,
      cachedResponse: cached,
    };
  }

  // 2️⃣ retrieve context
  const chunks = await retrieveContext(embedding, {
    topK: safeTopK,
    namespace,
  });
  const context = buildContext(chunks);

  // 3️⃣ inject context ABOVE user prompt
  const enhancedPrompt = context
    ? `${context}\n\nUser request:\n${finalPrompt}`
    : finalPrompt;

  const sources = buildSources(chunks);

  return {
    enhancedPrompt,
    sources,
    hasContext: Boolean(context),
    ragMeta: {
      embedding,
      namespace: cacheNamespace,
      promptForCache: normalizedPrompt,
    },
  };
}

function buildSources(chunks: RagChunk[]) {
  const seenUrl = new Set<string>();
  const sources: { url: string; title?: string }[] = [];
  const maxSources = 5;

  for (const chunk of chunks) {
    const url = chunk.sourceUrl?.trim();
    if (!url || seenUrl.has(url)) continue;
    seenUrl.add(url);
    sources.push({ url, title: chunk.title ?? undefined });
    if (sources.length >= maxSources) break;
  }

  return sources;
}
