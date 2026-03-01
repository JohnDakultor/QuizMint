import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const base =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PRO_PLAN_ID = process.env.PAYPAL_PRO_PLAN_ID || "";
const PREMIUM_PLAN_ID = process.env.PAYPAL_PREMIUM_PLAN_ID || "";

async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET_ID;
  if (!clientId || !secret) throw new Error("PayPal credentials missing");

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token error (${res.status})`);
  const data = await res.json();
  return data.access_token as string;
}

async function verifyWebhook(headers: Headers, rawBody: string) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const accessToken = await getAccessToken();
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

async function resolvePlanTypeFromSubscription(accessToken: string, planId: string) {
  if (planId && PRO_PLAN_ID && planId === PRO_PLAN_ID) return "pro";
  if (planId && PREMIUM_PLAN_ID && planId === PREMIUM_PLAN_ID) return "premium";

  const planRes = await fetch(`${base}/v1/billing/plans/${planId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!planRes.ok) return "pro";
  const plan = await planRes.json();
  const amount = Number(plan?.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value ?? "0");
  return amount >= 15 ? "premium" : "pro";
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const isValid = await verifyWebhook(req.headers, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const eventType = body.event_type as string;
    const resource = body.resource as any;

    if (!eventType?.startsWith("BILLING.SUBSCRIPTION")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const subscriptionId = resource?.id as string;
    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
    }

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const payerEmail = String(resource?.subscriber?.email_address || "").toLowerCase();
      if (!payerEmail) return NextResponse.json({ success: true, ignored: "missing payer email" });

      const user = await prisma.user.findUnique({ where: { email: payerEmail } });
      if (!user) return NextResponse.json({ success: true, ignored: "user not found" });

      const accessToken = await getAccessToken();
      const planType = await resolvePlanTypeFromSubscription(accessToken, resource.plan_id);

      await prisma.payPalSubscription.upsert({
        where: { subscriptionId },
        update: {
          status: "ACTIVE",
          planType,
          planId: resource.plan_id,
          nextBillingTime: resource.billing_info?.next_billing_time
            ? new Date(resource.billing_info.next_billing_time)
            : null,
          updatedAt: new Date(),
        },
        create: {
          subscriptionId,
          planId: resource.plan_id,
          planType,
          status: "ACTIVE",
          userId: user.id,
          startTime: new Date(resource.start_time || new Date()),
          nextBillingTime: resource.billing_info?.next_billing_time
            ? new Date(resource.billing_info.next_billing_time)
            : null,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: planType,
          subscriptionStatus: "active",
          subscriptionStart: new Date(resource.start_time || new Date()),
          subscriptionEnd: resource.billing_info?.next_billing_time
            ? new Date(resource.billing_info.next_billing_time)
            : null,
          paypalCustomerId: resource?.subscriber?.payer_id || null,
        },
      });
    }

    if (
      eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
      eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
      eventType === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      const status =
        eventType === "BILLING.SUBSCRIPTION.CANCELLED"
          ? "CANCELLED"
          : eventType === "BILLING.SUBSCRIPTION.SUSPENDED"
          ? "SUSPENDED"
          : "EXPIRED";

      const sub = await prisma.payPalSubscription.update({
        where: { subscriptionId },
        data: { status, updatedAt: new Date() },
        select: { userId: true },
      }).catch(() => null);

      if (sub?.userId) {
        await prisma.user.update({
          where: { id: sub.userId },
          data: {
            subscriptionStatus: status.toLowerCase(),
            subscriptionPlan: status === "EXPIRED" ? "free" : undefined,
            subscriptionEnd: new Date(),
          },
        });
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED") {
      const next = resource?.billing_info?.next_billing_time
        ? new Date(resource.billing_info.next_billing_time)
        : null;
      if (next) {
        const sub = await prisma.payPalSubscription.update({
          where: { subscriptionId },
          data: { nextBillingTime: next, status: "ACTIVE", updatedAt: new Date() },
          select: { userId: true },
        }).catch(() => null);
        if (sub?.userId) {
          await prisma.user.update({
            where: { id: sub.userId },
            data: { subscriptionEnd: next, subscriptionStatus: "active" },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Webhook processing failed", message: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
