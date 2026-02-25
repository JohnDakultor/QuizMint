import { NextResponse } from "next/server";

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function apiError(
  status: number,
  error: string,
  requestId: string,
  extra?: Record<string, unknown>
) {
  console.warn(`[api-error] requestId=${requestId} status=${status} error=${error}`);
  return NextResponse.json(
    {
      error,
      requestId,
      ...(extra || {}),
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
        "Cache-Control": "no-store",
      },
    }
  );
}

export function logApiError(requestId: string, context: string, err: unknown) {
  console.error(`[${context}] requestId=${requestId}`, err);
}
