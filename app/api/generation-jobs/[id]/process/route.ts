import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { createRequestId, apiError, logApiError } from "@/lib/api-error";
import {
  claimAsyncGenerationJob,
  completeAsyncGenerationJob,
  failAsyncGenerationJob,
  getAsyncGenerationJob,
} from "@/lib/async-generation-jobs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getBaseUrl(req: NextRequest) {
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

function parseJobBody(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function hasValidInternalSecret(req: NextRequest): boolean {
  const configured =
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    process.env.INTERNAL_API_SECRET;
  if (!configured) return false;
  const provided = req.headers.get("x-generation-job-secret");
  return provided === configured;
}

function getInternalSecretValue(): string | null {
  return (
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    null
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const { id } = await params;
    const isInternal = hasValidInternalSecret(req);

    let userId: string | null = null;
    let existing: Awaited<ReturnType<typeof getAsyncGenerationJob>> | null = null;

    if (isInternal) {
      const rows = await prisma.$queryRaw<
        Array<{ id: string; userId: string }>
      >`SELECT "id", "userId" FROM "AsyncGenerationJob" WHERE "id" = ${id} LIMIT 1`;
      if (!rows[0]) return apiError(404, "Job not found", requestId);
      userId = rows[0].userId;
      existing = await getAsyncGenerationJob(id, userId);
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (!user) return apiError(404, "User not found", requestId);
      userId = user.id;
      existing = await getAsyncGenerationJob(id, userId);
    }

    if (!existing || !userId) return apiError(404, "Job not found", requestId);

    if (existing.status === "completed" || existing.status === "failed") {
      return NextResponse.json(
        {
          ok: true,
          job: existing,
          requestId,
        },
        { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
      );
    }

    if (existing.status === "processing") {
      return NextResponse.json(
        {
          ok: true,
          job: existing,
          requestId,
        },
        { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
      );
    }

    const claimed = await claimAsyncGenerationJob(id, userId);
    if (!claimed) {
      const latest = await getAsyncGenerationJob(id, userId);
      return NextResponse.json(
        {
          ok: true,
          job: latest,
          requestId,
        },
        { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
      );
    }

    const baseUrl = getBaseUrl(req);
    const internalSecret = getInternalSecretValue();
    const cookieHeader = req.headers.get("cookie") || "";
    const requestBody = parseJobBody(claimed.request);
    const internalHeaders: Record<string, string> = {
      "x-async-internal": "1",
      "x-async-user-id": userId,
    };
    if (internalSecret) {
      internalHeaders["x-generation-job-secret"] = internalSecret;
    }

    let response: Response;
    if (claimed.type === "quiz_generate") {
      response = await fetch(`${baseUrl}/api/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...internalHeaders,
        },
        body: JSON.stringify({ ...(requestBody.body as Record<string, unknown>), async: false }),
      });
    } else if (claimed.type === "lesson_plan_generate") {
      response = await fetch(`${baseUrl}/api/generate-lesson-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...internalHeaders,
        },
        body: JSON.stringify({ ...(requestBody.body as Record<string, unknown>), async: false }),
      });
    } else if (claimed.type === "lesson_material_upload") {
      const file = requestBody.file as
        | { name?: string; type?: string; base64?: string }
        | undefined;
      const fields = (requestBody.fields || {}) as Record<string, string>;
      if (!file?.base64) {
        await failAsyncGenerationJob(id, userId, "Missing queued file payload");
        return apiError(400, "Invalid queued file payload", requestId);
      }
      const bytes = Buffer.from(file.base64, "base64");
      const formData = new FormData();
      const blob = new Blob([bytes], {
        type: file.type || "application/octet-stream",
      });
      formData.append("file", blob, file.name || "upload.bin");
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
      formData.append("async", "false");

      response = await fetch(`${baseUrl}/api/lesson-material-from-file`, {
        method: "POST",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...internalHeaders,
        },
        body: formData,
      });
    } else {
      await failAsyncGenerationJob(id, userId, `Unsupported job type: ${claimed.type}`);
      return apiError(400, "Unsupported job type", requestId);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof payload?.error === "string"
          ? payload.error
          : `Job failed with status ${response.status}`;
      const failed = await failAsyncGenerationJob(id, userId, message);
      return NextResponse.json(
        {
          ok: false,
          job: failed,
          requestId,
        },
        {
          status: 500,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    const completed = await completeAsyncGenerationJob(id, userId, payload);
    return NextResponse.json(
      {
        ok: true,
        job: completed,
        requestId,
      },
      {
        headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    logApiError(requestId, "generation-jobs/[id]/process", err);
    return apiError(500, "Failed to process job", requestId);
  }
}
