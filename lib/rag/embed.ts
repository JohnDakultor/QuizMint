// lib/rag/embed.ts

export async function embed(text: string): Promise<number[]> {
  const input = normalizeForEmbedding(text);
  if (!input) {
    throw new Error("embed: empty input after normalization");
  }

  const maxChars = 8000;
  const truncated = input.length > maxChars ? input.slice(0, maxChars) : input;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("embed: missing OPENROUTER_API_KEY");
  }

  const model =
    process.env.OPENROUTER_EMBEDDING_MODEL || "text-embedding-3-small";

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost",
          "X-Title": "QuizMint RAG Embeddings",
        },
        body: JSON.stringify({
          model,
          input: truncated,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(
          `embed: openrouter error ${res.status} ${res.statusText} - ${errText}`
        );
      }

      const data = (await res.json()) as {
        data?: { embedding?: number[] }[];
      };
      const embedding = data?.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("embed: missing embedding in response");
      }

      return embedding;
    } catch (err) {
      lastErr = err;
      if (attempt === 2) break;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("embed: failed");
}

export function normalizeForEmbedding(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
