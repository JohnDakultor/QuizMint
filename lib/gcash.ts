import { prisma } from "@/lib/prisma";
import { getPayMongoAuthHeader, getPayMongoBase } from "@/lib/paymongo";

type FinalizeInput = {
  checkoutId: string;
  expectedUserId?: string;
  expectedEmail?: string;
};

export function isPaidCheckout(attributes: any): boolean {
  if (!attributes) return false;
  if (attributes.status === "paid") return true;
  if (attributes.payment_intent?.status === "succeeded") return true;
  if (Array.isArray(attributes.payments)) {
    return attributes.payments.some((p: any) => {
      const s = p?.attributes?.status || p?.status;
      return s === "paid" || s === "succeeded";
    });
  }
  return false;
}

export async function fetchCheckoutSession(checkoutId: string) {
  const res = await fetch(`${getPayMongoBase()}/checkout_sessions/${checkoutId}`, {
    headers: {
      Authorization: getPayMongoAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function finalizeGcashCheckout(input: FinalizeInput) {
  const existing = await prisma.gCashPayment.findUnique({
    where: { checkoutId: input.checkoutId },
  });
  if (!existing) {
    return { ok: false as const, status: 404, error: "GCash checkout not found" };
  }

  if (input.expectedUserId && existing.userId !== input.expectedUserId) {
    return { ok: false as const, status: 403, error: "This checkout does not belong to your account" };
  }

  if (existing.status === "paid") {
    return {
      ok: true as const,
      alreadyProcessed: true,
      planType: existing.planType,
      subscriptionEnd: null,
    };
  }

  const checkoutResp = await fetchCheckoutSession(input.checkoutId);
  if (!checkoutResp.ok) {
    const msg =
      checkoutResp.json?.errors?.[0]?.detail ||
      checkoutResp.json?.errors?.[0]?.code ||
      `Failed to verify payment (${checkoutResp.status})`;
    return { ok: false as const, status: 502, error: msg };
  }

  const attrs = checkoutResp.json?.data?.attributes || {};
  const metadata = attrs?.metadata || {};
  if (!isPaidCheckout(attrs)) {
    return { ok: false as const, status: 400, error: "Payment is not completed yet" };
  }

  const metadataUserId = String(metadata.userId || existing.userId || "");
  const metadataEmail = String(metadata.email || "").toLowerCase();
  const planType = metadata.planType === "premium" ? "premium" : "pro";

  if (!metadataUserId) {
    return { ok: false as const, status: 400, error: "Missing payment metadata owner" };
  }

  if (input.expectedUserId && metadataUserId !== input.expectedUserId) {
    return { ok: false as const, status: 403, error: "Payment ownership mismatch" };
  }

  if (input.expectedEmail && metadataEmail && metadataEmail !== input.expectedEmail.toLowerCase()) {
    return { ok: false as const, status: 403, error: "Payment ownership mismatch" };
  }

  const user = await prisma.user.findUnique({
    where: { id: metadataUserId },
    select: { id: true, subscriptionEnd: true },
  });
  if (!user) {
    return { ok: false as const, status: 404, error: "User not found for payment" };
  }

  const paidPayment = Array.isArray(attrs.payments)
    ? attrs.payments.find((p: any) => {
        const s = p?.attributes?.status || p?.status;
        return s === "paid" || s === "succeeded";
      })
    : null;

  const paymentId = String(
    paidPayment?.id ||
      paidPayment?.attributes?.id ||
      attrs?.payment_intent?.id ||
      ""
  );

  const now = new Date();
  const baseDate =
    user.subscriptionEnd && user.subscriptionEnd > now ? new Date(user.subscriptionEnd) : now;
  const subscriptionEnd = new Date(baseDate);
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  await prisma.$transaction(async (tx) => {
    await tx.gCashPayment.update({
      where: { checkoutId: input.checkoutId },
      data: {
        status: "paid",
        paidAt: now,
        paymentId: paymentId || null,
        planType,
        metadata,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: planType,
        subscriptionStatus: "active",
        subscriptionStart: now,
        subscriptionEnd,
      },
    });
  });

  return {
    ok: true as const,
    alreadyProcessed: false,
    planType,
    subscriptionEnd,
  };
}
