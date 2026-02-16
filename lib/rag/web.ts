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
  const { query, namespace } = options;
  const maxSources = Math.min(Math.max(options.maxSources ?? 5, 3), 5);
  const maxChunks = Math.min(Math.max(options.maxChunks ?? 12, 4), 24);
  const envMin = process.env.RAG_MIN_SIMILARITY
    ? Number(process.env.RAG_MIN_SIMILARITY)
    : undefined;
  const minSimilarity = Math.min(
    Math.max(options.minSimilarity ?? envMin ?? 0.55, 0.35),
    0.95
  );

  const results = await searchWeb(query, maxSources);
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
  let keptSources = 0;
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
      keptSources += 1;
    }
  }

  // Fallback: if too few sources passed the filter, keep top sources anyway
  if (sources.length < 3 && ordered.length > 0) {
    for (const item of ordered) {
      if (sources.length >= Math.min(3, maxSources)) break;
      const url = item.url || "";
      if (!url || sources.some((s) => s.url === url)) continue;
      const text = item.content || "";
      if (!text) continue;
      const chunks = chunkText(text);
      for (const chunk of chunks) {
        if (chunkIndex >= maxChunks) break;
        const embedding = await embed(chunk);
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
      }
      sources.push({ url, title: item.title || undefined });
    }
  }

  return {
    sources,
    debug: {
      query,
      minSimilarity,
      resultsFound: results.length,
      sourcesKept: sources.length,
    },
  };
}
