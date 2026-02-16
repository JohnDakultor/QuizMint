// lib/rag/retrieve.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export interface RagChunk {
  content: string;
  sourceUrl?: string | null;
  title?: string | null;
}

interface RetrieveOptions {
  topK?: number;
  namespace: string;
}

export async function retrieveContext(
  embedding: number[],
  options: RetrieveOptions
): Promise<RagChunk[]> {
  if (!embedding.length) return [];

  const topK = Math.min(Math.max(Math.floor(options.topK ?? 5), 1), 20);

  const rows = await prisma.$queryRaw<RagChunk[]>(
    Prisma.sql`
      SELECT
        content,
        "sourceUrl",
        title
      FROM "Document"
      WHERE namespace = ${options.namespace}
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT ${topK}
    `
  );

  return rows;
}
