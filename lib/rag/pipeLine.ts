import { embed, normalizeForEmbedding } from "./embed";
import { semanticCacheLookup } from "./semanticCache";
import { retrieveContext, RagChunk } from "./retrieve";
import { buildContext } from "./context";

interface RagEnhanceInput {
  finalPrompt: string;
  namespace: string;
  cacheKey?: string;
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
  sourceMode?: "semantic_cache" | "documents" | "none";
  ragMeta?: {
    embedding: number[];
    namespace: string;
    promptForCache: string;
  };
}> {
  const normalizedPrompt = normalizeForEmbedding(finalPrompt);
  if (!normalizedPrompt) {
    return { enhancedPrompt: finalPrompt, sourceMode: "none" };
  }

  const safeTopK = Math.min(Math.max(Math.floor(topK), 1), 20);
  const safeThreshold = Math.min(Math.max(similarityThreshold, 0), 1);
  const cacheNamespace = cacheKey ? `${namespace}:${cacheKey}` : namespace;

  const embedding = await embed(normalizedPrompt);

  // Always resolve retrieval sources so UI can show citations even on cache hit.
  const chunks = await retrieveContext(embedding, {
    topK: safeTopK,
    namespace,
  });
  const context = buildContext(chunks);
  const sources = buildSources(chunks);

  const cached = await semanticCacheLookup(embedding, cacheNamespace, safeThreshold);

  if (cached) {
    return {
      enhancedPrompt: finalPrompt,
      cachedResponse: cached,
      sources,
      hasContext: Boolean(context),
      sourceMode: sources.length ? "semantic_cache" : "none",
    };
  }

  const enhancedPrompt = context
    ? `${context}\n\nUser request:\n${finalPrompt}`
    : finalPrompt;

  return {
    enhancedPrompt,
    sources,
    hasContext: Boolean(context),
    sourceMode: sources.length ? "documents" : "none",
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
