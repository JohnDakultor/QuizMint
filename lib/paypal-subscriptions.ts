const PAYPAL_BASE =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PRO_PLAN_ID = process.env.PAYPAL_PRO_PLAN_ID || "";
const PREMIUM_PLAN_ID = process.env.PAYPAL_PREMIUM_PLAN_ID || "";
const ORGANIZATION_PLAN_ID = process.env.PAYPAL_ORGANIZATION_PLAN_ID || "";
const PREMIUM_FALLBACK_PRICE_USD = 39;

export type PayPalPlanType = "pro" | "premium" | "organization";

export class PayPalApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
    this.body = body;
  }
}

function buildPayPalError(context: string, status: number, body: string, statusText: string) {
  return new PayPalApiError(
    `PayPal ${context} failed (${status}): ${body || statusText}`,
    status,
    body
  );
}

export function isPayPalResourceNotFoundError(error: unknown) {
  if (!(error instanceof PayPalApiError)) return false;
  if (error.status === 404) return true;
  const body = error.body.toLowerCase();
  return body.includes("resource_not_found") || body.includes("invalid_resource_id");
}

export async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET_ID;

  if (!clientId || !secret) {
    throw new Error("PayPal credentials are not configured");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw buildPayPalError("auth", res.status, text, res.statusText);
  }

  const data = (await res.json()) as { access_token?: string };
  const accessToken = String(data.access_token || "").trim();
  if (!accessToken) {
    throw new Error("PayPal auth did not return an access token");
  }

  return accessToken;
}

export async function fetchPayPalSubscriptionDetails(subscriptionId: string) {
  const nextSubscriptionId = String(subscriptionId || "").trim();
  if (!nextSubscriptionId) {
    throw new Error("subscriptionId is required");
  }

  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${nextSubscriptionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw buildPayPalError("subscription fetch", res.status, text, res.statusText);
  }

  const subscription = (await res.json()) as Record<string, any>;
  return {
    accessToken,
    subscription,
  };
}

export async function resolvePayPalPlanType(
  accessToken: string,
  planId: string
): Promise<PayPalPlanType> {
  if (planId && PRO_PLAN_ID && planId === PRO_PLAN_ID) return "pro";
  if (planId && PREMIUM_PLAN_ID && planId === PREMIUM_PLAN_ID) return "premium";
  if (planId && ORGANIZATION_PLAN_ID && planId === ORGANIZATION_PLAN_ID) return "organization";

  const res = await fetch(`${PAYPAL_BASE}/v1/billing/plans/${planId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Unable to resolve PayPal plan type for plan ${planId || "unknown"}`);
  }

  const plan = (await res.json()) as Record<string, any>;
  const planLabel = `${String(plan?.name || "")} ${String(plan?.description || "")}`.toLowerCase();
  if (planLabel.includes("organization") || planLabel.includes("institution") || planLabel.includes("school")) {
    return "organization";
  }
  if (planLabel.includes("premium")) return "premium";
  if (planLabel.includes("pro")) return "pro";

  const value = Number(plan?.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value ?? "0");
  return value >= PREMIUM_FALLBACK_PRICE_USD ? "premium" : "pro";
}

export async function cancelPayPalSubscription(subscriptionId: string, reason: string) {
  const nextSubscriptionId = String(subscriptionId || "").trim();
  if (!nextSubscriptionId) {
    throw new Error("subscriptionId is required");
  }

  const accessToken = await getPayPalAccessToken();
  const cancelRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${nextSubscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: String(reason || "Cancelled by QuizMintAI"),
    }),
  });

  if (!cancelRes.ok) {
    const text = await cancelRes.text().catch(() => "");
    throw buildPayPalError("cancellation", cancelRes.status, text, cancelRes.statusText);
  }

  return true;
}

export function normalizePayPalSubscriptionStatus(rawStatus: string | null | undefined) {
  const normalized = String(rawStatus || "").trim().toUpperCase();
  switch (normalized) {
    case "APPROVAL_PENDING":
      return "approval_pending";
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "suspended";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    default:
      return normalized ? normalized.toLowerCase() : "unknown";
  }
}

function mapOrganizationStatusFromSubscription(subscriptionStatus: string) {
  switch (subscriptionStatus) {
    case "approval_pending":
      return "trialing";
    case "active":
      return "active";
    case "suspended":
      return "suspended";
    case "cancelled":
    case "expired":
      return "inactive";
    default:
      return "active";
  }
}

export async function reconcileOrganizationPayPalSubscription(providerSubscriptionId: string) {
  const nextSubscriptionId = String(providerSubscriptionId || "").trim();
  if (!nextSubscriptionId) {
    throw new Error("providerSubscriptionId is required");
  }

  const [existingSubscription, details] = await Promise.all([
    import("@/lib/prisma").then(({ prisma }) =>
      prisma.organizationSubscription.findUnique({
        where: { providerSubscriptionId: nextSubscriptionId },
        select: {
          id: true,
          organizationId: true,
          billingUserId: true,
          billingEmail: true,
          seatCount: true,
        },
      })
    ),
    fetchPayPalSubscriptionDetails(nextSubscriptionId),
  ]);

  if (!existingSubscription) {
    throw new Error("Organization subscription record not found");
  }

  const { prisma } = await import("@/lib/prisma");
  const planType = await resolvePayPalPlanType(details.accessToken, String(details.subscription?.plan_id || ""));
  const subscriptionStatus = normalizePayPalSubscriptionStatus(details.subscription?.status);
  const payerEmail = String(details.subscription?.subscriber?.email_address || "").trim().toLowerCase() || null;
  const payerId = String(details.subscription?.subscriber?.payer_id || "").trim() || null;
  const startTime = details.subscription?.start_time
    ? new Date(details.subscription.start_time)
    : null;
  const nextBillingTime = details.subscription?.billing_info?.next_billing_time
    ? new Date(details.subscription.billing_info.next_billing_time)
    : null;
  const organizationStatus = mapOrganizationStatusFromSubscription(subscriptionStatus);

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrganizationSubscription = await tx.organizationSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        provider: "paypal",
        plan: planType,
        status: subscriptionStatus,
        billingEmail: payerEmail || existingSubscription.billingEmail,
        currentPeriodStart: startTime,
        currentPeriodEnd: nextBillingTime,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        organizationId: true,
        billingUserId: true,
        provider: true,
        providerSubscriptionId: true,
        plan: true,
        status: true,
        seatCount: true,
        billingEmail: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        updatedAt: true,
      },
    });

    const updatedOrganization = await tx.organization.update({
      where: { id: existingSubscription.organizationId },
      data: {
        tier: "organization",
        status: organizationStatus,
        billingEmail: payerEmail || undefined,
      },
      select: {
        id: true,
        name: true,
        tier: true,
        status: true,
        billingEmail: true,
        seatLimit: true,
        ownerUserId: true,
      },
    });

    if (existingSubscription.billingUserId || payerEmail || payerId) {
      const userUpdateData = {
        subscriptionPlan: planType,
        subscriptionStatus: subscriptionStatus,
        subscriptionStart: startTime,
        subscriptionEnd: nextBillingTime,
        paypalCustomerId: payerId || undefined,
      };

      if (existingSubscription.billingUserId) {
        await tx.user
          .update({
            where: { id: existingSubscription.billingUserId },
            data: userUpdateData,
          })
          .catch(() => null);
      } else if (payerEmail) {
        await tx.user
          .update({
            where: { email: payerEmail },
            data: userUpdateData,
          })
          .catch(() => null);
      }
    }

    return {
      organization: updatedOrganization,
      subscription: updatedOrganizationSubscription,
    };
  });

  return {
    ...result,
    paypalStatus: String(details.subscription?.status || "").trim() || "UNKNOWN",
  };
}
