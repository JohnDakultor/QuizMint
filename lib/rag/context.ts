// lib/rag/context.ts
import type { RagChunk } from "./retrieve";

export function buildContext(chunks: RagChunk[]): string {
  if (!chunks.length) return "";

  return `
Retrieved context is OPTIONAL supporting material.
Use it only when directly relevant to the user's request.
If any context is unrelated, ignore it.

Context:
${chunks.map((c, i) => `(${i + 1}) ${c.content}`).join("\n\n")}
`;
}
