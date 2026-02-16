// lib/rag/context.ts
import type { RagChunk } from "./retrieve";

export function buildContext(chunks: RagChunk[]): string {
  if (!chunks.length) return "";

  return `
Use the following context to answer the prompt.
If the context is insufficient or unrelated, say you don't have enough information.

Context:
${chunks.map((c, i) => `(${i + 1}) ${c.content}`).join("\n\n")}
`;
}
