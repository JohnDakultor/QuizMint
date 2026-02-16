// lib/rag/types.ts
export type RagNamespace =
  | "lesson"
  | "quiz"
  | "explanation"
  | "general";

export interface RagInput {
  prompt: string;
  namespace: RagNamespace;
  topK?: number;
  similarityThreshold?: number;
}

export interface RagResult {
  answer: string;
  fromCache: boolean;
}
