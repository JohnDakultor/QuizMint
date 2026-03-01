import { NextRequest, NextResponse } from "next/server";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { finalizeGcashCheckout } from "@/lib/gcash";
import { verifyPayMongoWebhookSignature } from "@/lib/paymongo";

function extractCheckoutId(payload: any): string {
  const candidates = [
    payload?.data?.attributes?.data?.id,
    payload?.data?.attributes?.data?.attributes?.id,
    payload?.data?.attributes?.data?.attributes?.checkout_session_id,
    payload?.data?.attributes?.data?.attributes?.metadata?.checkoutId,
    payload?.data?.attributes?.metadata?.checkoutId,
  ]
    .map((v) => (typeof v === "string" ? v : ""))
    .filter(Boolean);

  return candidates.find((v) => v.startsWith("cs_")) || "";
}

function extractEventType(payload: any): string {
  return String(payload?.data?.attributes?.type || payload?.type || "");
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("paymongo-signature") ||
      req.headers.get("x-paymongo-signature") ||
      "";

    const isValid = verifyPayMongoWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      return apiError(401, "Invalid PayMongo webhook signature", requestId);
    }

    const payload = JSON.parse(rawBody);
    const eventType = extractEventType(payload);
    const checkoutId = extractCheckoutId(payload);

    if (!checkoutId) {
      return apiError(400, "Unable to resolve checkout session ID from webhook", requestId);
    }

    // Only finalize paid events; ignore others safely.
    const paidEvent =
      eventType.includes("checkout_session.payment.paid") ||
      eventType.includes("payment.paid") ||
      eventType.includes("checkout_session.paid");

    if (!paidEvent) {
      return NextResponse.json(
        { ok: true, ignored: true, eventType, requestId },
        { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
      );
    }

    const finalized = await finalizeGcashCheckout({ checkoutId });
    if (!finalized.ok) {
      return apiError(finalized.status, finalized.error, requestId);
    }

    return NextResponse.json(
      {
        ok: true,
        processed: true,
        alreadyProcessed: finalized.alreadyProcessed,
        planType: finalized.planType,
        requestId,
      },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "gcash/webhook", err);
    return apiError(500, "Failed to process GCash webhook", requestId);
  }
}
