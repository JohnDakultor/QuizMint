import { authOptions } from "@/lib/auth-option";
import { assertAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const base =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getConfiguredPlanId(planType: "pro" | "premium") {
  const id =
    planType === "pro"
      ? process.env.PAYPAL_PRO_PLAN_ID
      : process.env.PAYPAL_PREMIUM_PLAN_ID;

  if (!id) {
    throw new Error(`Missing PayPal plan ID for ${planType}`);
  }

  return id;
}

async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET_ID;

  if (!clientId || !secret) {
    throw new Error("PayPal credentials are not configured");
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
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { planType } = await req.json();
    if (planType !== "pro" && planType !== "premium") {
      return NextResponse.json(
        { error: "Valid planType required", validValues: ["pro", "premium"] },
        { status: 400 }
      );
    }

    const planId = getConfiguredPlanId(planType);
    const accessToken = await getAccessToken();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.quizmintai.com";

    const subscriptionRes = await fetch(`${base}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "PayPal-Request-Id": `sub-${Date.now()}-${user.id}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          brand_name: "QuizMintAI",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${baseUrl}/success/paypal?planType=${planType}`,
          cancel_url: `${baseUrl}/cancel`,
        },
      }),
    });

    const responseText = await subscriptionRes.text();
    if (!subscriptionRes.ok) {
      return NextResponse.json(
        {
          error: "Failed to create subscription",
          message: responseText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const result = JSON.parse(responseText);
    const subscriptionId = result.id as string;
    const approvalLink = result.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;

    await prisma.payPalSubscription.upsert({
      where: { subscriptionId },
      update: {
        planId,
        planType,
        status: result.status || "APPROVAL_PENDING",
        updatedAt: new Date(),
      },
      create: {
        subscriptionId,
        planId,
        planType,
        status: result.status || "APPROVAL_PENDING",
        userId: user.id,
        startTime: new Date(result.create_time || new Date()),
        nextBillingTime: result.billing_info?.next_billing_time
          ? new Date(result.billing_info.next_billing_time)
          : null,
      },
    });

    return NextResponse.json({
      subscriptionId,
      approvalLink: approvalLink || null,
      status: result.status || "APPROVAL_PENDING",
      planId,
      planType,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        message: err?.message || "Unknown PayPal error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const admin = await assertAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const accessToken = await getAccessToken();

    const [productsRes, plansRes] = await Promise.all([
      fetch(`${base}/v1/catalogs/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${base}/v1/billing/plans?page_size=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const products = productsRes.ok ? await productsRes.json() : { products: [] };
    const plans = plansRes.ok ? await plansRes.json() : { plans: [] };

    return NextResponse.json({
      success: true,
      products: products.products || [],
      plans: plans.plans || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to list PayPal resources", message: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
