// lib/rag/semanticCache.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function semanticCacheLookup(
  embedding: number[],
  namespace: string,
  threshold = 0.85
): Promise<string | null> {
  if (!embedding.length) return null;

  const rows = await prisma.$queryRaw<{ response: string; similarity: number }[]>(
    Prisma.sql`
      SELECT
        response,
        1 - (embedding <=> ${embedding}::vector) AS similarity
      FROM "SemanticCache"
      WHERE namespace = ${namespace}
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT 1
    `
  );

  if (!rows.length) return null;
  if (rows[0].similarity < threshold) return null;

  return rows[0].response;
}

export async function semanticCacheStore(
  prompt: string,
  embedding: number[],
  response: string,
  namespace: string
) {
  if (!prompt || !embedding.length || !response) return;

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "SemanticCache" (
        id, prompt, embedding, response, namespace, "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), ${prompt}, ${embedding}::vector, ${response},
        ${namespace}, now(), now()
      )
    `
  );
}
