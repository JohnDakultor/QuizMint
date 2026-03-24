import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

function isInternalAuthorized(req: NextRequest) {
  const internalSecret =
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    "";
  if (!internalSecret) return false;
  return req.headers.get("x-generation-job-secret") === internalSecret;
}

function staleProcessingMinutes() {
  const raw = Number(process.env.GENERATION_JOB_STALE_MINUTES || 20);
  if (!Number.isFinite(raw) || raw < 1) return 20;
  return Math.floor(raw);
}

export async function GET(req: NextRequest) {
  const admin = await assertAdminSession();
  const internal = isInternalAuthorized(req);
  if (!admin.ok && !internal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleMinutes = staleProcessingMinutes();
  const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

  const [counts, oldestQueued, staleProcessing, latestFailed] = await Promise.all([
    prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT "status", COUNT(*)::bigint AS "count"
      FROM "AsyncGenerationJob"
      GROUP BY "status"
    `,
    prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
      SELECT "id", "createdAt"
      FROM "AsyncGenerationJob"
      WHERE "status" = 'queued'
      ORDER BY "createdAt" ASC
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ id: string; startedAt: Date | null; attemptCount: number }>>`
      SELECT "id", "startedAt", COALESCE("attemptCount", 0) AS "attemptCount"
      FROM "AsyncGenerationJob"
      WHERE "status" = 'processing'
        AND "startedAt" IS NOT NULL
        AND "startedAt" < ${staleCutoff}
      ORDER BY "startedAt" ASC
      LIMIT 25
    `,
    prisma.$queryRaw<
      Array<{ id: string; type: string; error: string | null; completedAt: Date | null }>
    >`
      SELECT "id", "type", "error", "completedAt"
      FROM "AsyncGenerationJob"
      WHERE "status" = 'failed'
      ORDER BY "updatedAt" DESC
      LIMIT 10
    `,
  ]);

  const statusCounts: Record<string, number> = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  for (const row of counts) {
    statusCounts[row.status] = Number(row.count || 0);
  }

  return NextResponse.json(
    {
      ok: true,
      worker: {
        staleThresholdMinutes: staleMinutes,
      },
      jobs: {
        counts: statusCounts,
        oldestQueuedAt: oldestQueued[0]?.createdAt ?? null,
        staleProcessing: staleProcessing.map((job) => ({
          id: job.id,
          startedAt: job.startedAt,
          attemptCount: Number(job.attemptCount || 0),
        })),
        latestFailed: latestFailed.map((job) => ({
          id: job.id,
          type: job.type,
          error: job.error,
          completedAt: job.completedAt,
        })),
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

