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
  jobId: string,
  options?: {
    subscriptionPlan?: string | null;
  }
): Promise<boolean> {
  const secret = getInternalJobSecret();
  if (!secret) return false;
  const normalizedPlan = String(options?.subscriptionPlan || "free")
    .trim()
    .toLowerCase();
  const priorityDispatch = normalizedPlan === "premium";
  const eagerDispatchSetting = String(
    process.env.GENERATION_JOB_EAGER_DISPATCH || "true"
  )
    .trim()
    .toLowerCase();
  const eagerDispatchDisabled = ["0", "false", "no", "off"].includes(
    eagerDispatchSetting
  );
  if (eagerDispatchDisabled && !priorityDispatch) return false;

  const baseUrl = resolveBaseUrl(req);
  // Fire-and-forget dispatch (best effort): this avoids blocking the user request.
  void fetch(`${baseUrl}/api/generation-jobs/${jobId}/process`, {
    method: "POST",
    headers: {
      "x-generation-job-secret": secret,
    },
    cache: "no-store",
  }).catch(() => null);

  return true;
}

