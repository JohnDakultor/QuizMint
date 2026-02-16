import { prisma } from "@/lib/prisma";
import { embed, normalizeForEmbedding } from "@/lib/rag/embed";

const ALLOWED_DOMAINS = [
  "khanacademy.org",
  "britannica.com",
  "openstax.org",
  "oercommons.org",
  "ck12.org",
  "mit.edu",
  "stanford.edu",
  "harvard.edu",
  "ox.ac.uk",
  "cam.ac.uk",
  "ed.gov",
  "nasa.gov",
  "nih.gov",
  "cdc.gov",
  "ncbi.nlm.nih.gov",
  "medlineplus.gov",
  "mayoclinic.org",
  "clevelandclinic.org",
  "hopkinsmedicine.org",
  "who.int",
  "epa.gov",
  "noaa.gov",
  "loc.gov",
  "archives.gov",
  "history.state.gov",
  "nationalgeographic.com",
  "pbs.org",
  "smithsonianmag.com",
  "sciencenews.org",
  "science.org",
  "pnas.org",
  "nature.com",
  "sciencedirect.com",
  "journals.sagepub.com",
  "tandfonline.com",
  "springer.com",
  "jstor.org",
  "aps.org",
  "aapt.org",
  "iop.org",
  "aip.org",
  "physics.org",
  "scitation.org",
  "ieee.org",
  "acm.org",
  "arxiv.org",
  "unesco.org",
  "oecd.org",
  "worldbank.org",
  "edutopia.org",
  "ck12.org",
  "scholar.google.com",
  "wolframalpha.com",
];

function normalizeSearchQuery(query: string) {
  const q = (query || "").toLowerCase();
  const cleaned = q
    .replace(/\b(create|generate|make|build|give me|i want|please)\b/g, " ")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/\bquiz\b/g, " ")
    .replace(/\b(items?|questions?)\b/g, " ")
    .replace(/\b(true\/false|true or false|multiple choice|fill in the blanks?)\b/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || query;
}

function tokenize(input: string) {
  return (input || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function lexicalOverlapScore(query: string, title?: string, content?: string) {
  const q = new Set(tokenize(query));
  if (!q.size) return 0;
  const text = `${title || ""} ${content || ""}`;
  const tokens = new Set(tokenize(text));
  let hit = 0;
  for (const token of q) if (tokens.has(token)) hit += 1;
  return hit / q.size;
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

async function searchWeb(query: string, maxResults = 6) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Missing TAVILY_API_KEY");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: Math.min(Math.max(maxResults, 1), 10),
      include_domains: ALLOWED_DOMAINS,
      include_answer: false,
      include_images: false,
      include_raw_content: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily search failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    results?: { url?: string; content?: string; title?: string }[];
  };
  return (data.results || []).filter((r) => r.url && r.content);
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function ingestWebSourcesForQuery(options: {
  query: string;
  namespace: string;
  maxSources?: number;
  maxChunks?: number;
  minSimilarity?: number;
}) {
  const { namespace } = options;
  const query = normalizeSearchQuery(options.query);
  const maxSources = Math.min(Math.max(options.maxSources ?? 5, 3), 5);
  const maxChunks = Math.min(Math.max(options.maxChunks ?? 12, 4), 24);
  const envMin = process.env.RAG_MIN_SIMILARITY
    ? Number(process.env.RAG_MIN_SIMILARITY)
    : undefined;
  const minSimilarity = Math.min(
    Math.max(options.minSimilarity ?? envMin ?? 0.55, 0.35),
    0.95
  );

  const rawResults = await searchWeb(query, maxSources + 2);
  const results = rawResults
    .map((r) => ({
      ...r,
      overlap: lexicalOverlapScore(query, r.title, r.content),
    }))
    .filter((r) => r.overlap >= 0.25)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, maxSources);
  const sources: { url: string; title?: string }[] = [];
  const domainOf = (u: string) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u;
    }
  };
  const byDomain = new Map<
    string,
    { url: string; content: string; title?: string }
  >();
  const extras: { url: string; content: string; title?: string }[] = [];
  const britannicaDomain = "britannica.com";

  for (const r of results as { url: string; content: string; title?: string }[]) {
    const dom = domainOf(r.url);
    if (!byDomain.has(dom)) byDomain.set(dom, r);
    else extras.push(r);
  }

  const unique = [...byDomain.values()];
  const nonBritannica = unique.filter(
    (r) => domainOf(r.url) !== britannicaDomain
  );
  const britannica = unique.filter(
    (r) => domainOf(r.url) === britannicaDomain
  );
  const ordered: { url: string; content: string; title?: string }[] = [
    ...nonBritannica,
    ...britannica,
    ...extras,
  ];
  const queryEmbedding = await embed(query);
  let chunkIndex = 0;
  for (const item of ordered) {
    if (sources.length >= maxSources) break;
    const url = item.url || "";
    const text = item.content || "";
    if (!text) continue;

    const chunks = chunkText(text);
    let keptAnyChunk = false;
    for (const chunk of chunks) {
      if (chunkIndex >= maxChunks) break;
      const embedding = await embed(chunk);
      const sim = cosineSimilarity(queryEmbedding, embedding);
      if (sim < minSimilarity) continue;
      await prisma.$executeRaw`
        INSERT INTO "Document" (
          id, namespace, "sourceUrl", title, "sourceType",
          "chunkIndex", content, embedding, "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), ${namespace}, ${url}, ${item.title || null}, ${"web"},
          ${chunkIndex}, ${chunk}, ${embedding}::vector, now(), now()
        )
      `;
      chunkIndex += 1;
      keptAnyChunk = true;
    }
    if (keptAnyChunk) {
      sources.push({ url, title: item.title || undefined });
    }
  }

  return {
    sources,
    debug: {
      query: options.query,
      minSimilarity,
      normalizedQuery: query,
      resultsFound: rawResults.length,
      sourcesKept: sources.length,
    },
  };
}
