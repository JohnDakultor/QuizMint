import { NextRequest, NextResponse } from "next/server";
import { listQueuedAsyncGenerationJobs } from "@/lib/async-generation-jobs";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (cronSecret && bearer === cronSecret) return true;

  const internalSecret =
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    "";
  const headerSecret = req.headers.get("x-generation-job-secret") || "";
  if (internalSecret && headerSecret === internalSecret) return true;

  // Optional Vercel cron marker fallback when CRON_SECRET is not configured.
  if (!cronSecret && req.headers.get("x-vercel-cron")) return true;

  return false;
}

function resolveBaseUrl(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  if (host) return `${proto}://${host}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:3000";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perRun = Math.max(
    1,
    Math.min(20, Number(process.env.GENERATION_WORKER_BATCH_SIZE || 3))
  );
  const jobs = await listQueuedAsyncGenerationJobs(perRun);
  const baseUrl = resolveBaseUrl(req);
  const secret =
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    "";

  let dispatched = 0;
  for (const job of jobs) {
    try {
      const res = await fetch(`${baseUrl}/api/generation-jobs/${job.id}/process`, {
        method: "POST",
        headers: secret ? { "x-generation-job-secret": secret } : undefined,
        cache: "no-store",
      });
      if (res.ok || res.status === 202) dispatched += 1;
    } catch {
      // Continue to next queued job.
    }
  }

  return NextResponse.json(
    {
      ok: true,
      queued: jobs.length,
      dispatched,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

