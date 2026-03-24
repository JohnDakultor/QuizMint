import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export type AsyncJobType =
  | "quiz_generate"
  | "lesson_plan_generate"
  | "lesson_material_upload"
  | "lesson_pptx_generate";

export type AsyncJobStatus = "queued" | "processing" | "completed" | "failed";

export type AsyncGenerationJobRow = {
  id: string;
  userId: string;
  type: AsyncJobType;
  status: AsyncJobStatus;
  request: unknown;
  result: unknown | null;
  error: string | null;
  attemptCount: number;
  requestId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createAsyncGenerationJob(input: {
  userId: string;
  type: AsyncJobType;
  request: unknown;
  requestId?: string | null;
}) {
  const jobId = randomUUID();
  const rows = await prisma.$queryRaw<AsyncGenerationJobRow[]>`
    INSERT INTO "AsyncGenerationJob" ("id", "userId", "type", "status", "request", "requestId", "createdAt", "updatedAt")
    VALUES (${jobId}, ${input.userId}, ${input.type}, 'queued', ${JSON.stringify(input.request)}::jsonb, ${input.requestId || null}, NOW(), NOW())
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getAsyncGenerationJob(jobId: string, userId: string) {
  const rows = await prisma.$queryRaw<AsyncGenerationJobRow[]>`
    SELECT *
    FROM "AsyncGenerationJob"
    WHERE "id" = ${jobId}
      AND "userId" = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function claimAsyncGenerationJob(jobId: string, userId: string) {
  const rows = await prisma.$queryRaw<AsyncGenerationJobRow[]>`
    UPDATE "AsyncGenerationJob"
    SET
      "status" = 'processing',
      "startedAt" = NOW(),
      "attemptCount" = COALESCE("attemptCount", 0) + 1,
      "updatedAt" = NOW()
    WHERE "id" = ${jobId}
      AND "userId" = ${userId}
      AND "status" = 'queued'
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function completeAsyncGenerationJob(jobId: string, userId: string, result: unknown) {
  const rows = await prisma.$queryRaw<AsyncGenerationJobRow[]>`
    UPDATE "AsyncGenerationJob"
    SET
      "status" = 'completed',
      "result" = ${JSON.stringify(result)}::jsonb,
      "error" = NULL,
      "completedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = ${jobId}
      AND "userId" = ${userId}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function failAsyncGenerationJob(jobId: string, userId: string, error: string) {
  const rows = await prisma.$queryRaw<AsyncGenerationJobRow[]>`
    UPDATE "AsyncGenerationJob"
    SET
      "status" = 'failed',
      "error" = ${error},
      "completedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = ${jobId}
      AND "userId" = ${userId}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function requeueAsyncGenerationJob(jobId: string, userId: string, error: string) {
  const rows = await prisma.$queryRaw<AsyncGenerationJobRow[]>`
    UPDATE "AsyncGenerationJob"
    SET
      "status" = 'queued',
      "error" = ${error},
      "startedAt" = NULL,
      "completedAt" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${jobId}
      AND "userId" = ${userId}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function listQueuedAsyncGenerationJobs(limit = 10) {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await prisma.$queryRaw<
    Array<{ id: string; userId: string; type: AsyncJobType; attemptCount: number }>
  >`
    SELECT "id", "userId", "type", COALESCE("attemptCount", 0) AS "attemptCount"
    FROM "AsyncGenerationJob"
    WHERE "status" = 'queued'
    ORDER BY "createdAt" ASC
    LIMIT ${safeLimit}
  `;
  return rows;
}
