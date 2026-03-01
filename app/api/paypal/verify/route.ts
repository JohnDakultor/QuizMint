import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";

const base =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PRO_PLAN_ID = process.env.PAYPAL_PRO_PLAN_ID || "";
const PREMIUM_PLAN_ID = process.env.PAYPAL_PREMIUM_PLAN_ID || "";

async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET_ID;

  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status})`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function resolvePlanType(accessToken: string, planId: string): Promise<"pro" | "premium"> {
  if (planId && PRO_PLAN_ID && planId === PRO_PLAN_ID) return "pro";
  if (planId && PREMIUM_PLAN_ID && planId === PREMIUM_PLAN_ID) return "premium";

  const res = await fetch(`${base}/v1/billing/plans/${planId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return "pro";

  const plan = await res.json();
  const value = Number(
    plan?.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value ?? "0"
  );
  return value >= 15 ? "premium" : "pro";
}

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, paypalCustomerId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accessToken = await getAccessToken();
    const subRes = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!subRes.ok) {
      const txt = await subRes.text();
      return NextResponse.json(
        { error: "Failed to verify subscription", details: txt.slice(0, 500) },
        { status: 400 }
      );
    }

    const subscription = await subRes.json();
    const payerEmail = String(subscription?.subscriber?.email_address || "").toLowerCase();
    const payerId = String(subscription?.subscriber?.payer_id || "");

    // Ownership validation: session user must match subscription payer email.
    if (!payerEmail || payerEmail !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Subscription does not belong to the authenticated user" },
        { status: 403 }
      );
    }

    // If user already has a bound PayPal payer ID, enforce consistency.
    if (user.paypalCustomerId && payerId && user.paypalCustomerId !== payerId) {
      return NextResponse.json(
        { error: "Subscription payer mismatch" },
        { status: 403 }
      );
    }

    const planType = await resolvePlanType(accessToken, subscription.plan_id);
    const subscriptionEnd = subscription.billing_info?.next_billing_time
      ? new Date(subscription.billing_info.next_billing_time)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d;
        })();

    const paypalSubscription = await prisma.payPalSubscription.upsert({
      where: { subscriptionId },
      update: {
        status: subscription.status,
        planType,
        planId: subscription.plan_id,
        updatedAt: new Date(),
        nextBillingTime: subscription.billing_info?.next_billing_time
          ? new Date(subscription.billing_info.next_billing_time)
          : subscriptionEnd,
      },
      create: {
        subscriptionId,
        planId: subscription.plan_id,
        planType,
        status: subscription.status,
        userId: user.id,
        startTime: new Date(subscription.start_time || new Date()),
        nextBillingTime: subscription.billing_info?.next_billing_time
          ? new Date(subscription.billing_info.next_billing_time)
          : subscriptionEnd,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: planType,
        subscriptionStatus: "active",
        subscriptionStart: new Date(subscription.start_time || new Date()),
        subscriptionEnd,
        paypalCustomerId: payerId || null,
      },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription verified and upgraded to ${planType}`,
      user: updatedUser,
      subscription: {
        id: paypalSubscription.subscriptionId,
        planType: paypalSubscription.planType,
        status: paypalSubscription.status,
        planId: paypalSubscription.planId,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Verification failed", message: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
