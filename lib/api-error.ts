import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

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
  log.warn("api_error", { requestId, status, error, extra });
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
  log.error("api_exception", { requestId, context, err });
}
