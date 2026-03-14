import type { NextRequest } from "next/server";

function resolveBaseUrl(req: NextRequest): string {
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

function getInternalJobSecret(): string | null {
  return (
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    null
  );
}

export async function dispatchAsyncGenerationJob(
  req: NextRequest,
  jobId: string
): Promise<boolean> {
  const secret = getInternalJobSecret();
  if (!secret) return false;

  const baseUrl = resolveBaseUrl(req);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    await fetch(`${baseUrl}/api/generation-jobs/${jobId}/process`, {
      method: "POST",
      headers: {
        "x-generation-job-secret": secret,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

