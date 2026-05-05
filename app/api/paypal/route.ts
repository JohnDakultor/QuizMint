import { authOptions } from "@/lib/auth-option";
import { assertAdminSession } from "@/lib/admin-auth";
import { buildOrganizationAdminWhere, getCurrentUserAccessContext } from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const base =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getConfiguredPlanId(planType: "pro" | "premium" | "organization") {
  const id =
    planType === "pro"
      ? process.env.PAYPAL_PRO_PLAN_ID
      : planType === "premium"
      ? process.env.PAYPAL_PREMIUM_PLAN_ID
      : process.env.PAYPAL_ORGANIZATION_PLAN_ID;

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

    const { planType, organizationId } = await req.json();
    if (planType !== "pro" && planType !== "premium" && planType !== "organization") {
      return NextResponse.json(
        { error: "Valid planType required", validValues: ["pro", "premium", "organization"] },
        { status: 400 }
      );
    }

    let organization:
      | {
          id: string;
          name: string;
          billingEmail: string | null;
          seatLimit: number | null;
        }
      | null = null;

    if (planType === "organization") {
      const access = await getCurrentUserAccessContext();
      if (!access) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const nextOrganizationId = String(organizationId || "").trim();
      if (!nextOrganizationId) {
        return NextResponse.json(
          { error: "organizationId is required for the organization plan" },
          { status: 400 }
        );
      }

      organization = await prisma.organization.findFirst({
        where: {
          id: nextOrganizationId,
          ...buildOrganizationAdminWhere(access),
        },
        select: {
          id: true,
          name: true,
          billingEmail: true,
          seatLimit: true,
        },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found or not administrable" },
          { status: 404 }
        );
      }
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
        custom_id:
          planType === "organization" && organization
            ? `organization:${organization.id}`
            : undefined,
        application_context: {
          brand_name: "QuizMintAI",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${baseUrl}/success/paypal?planType=${planType}${
            planType === "organization" && organization
              ? `&organizationId=${encodeURIComponent(organization.id)}`
              : ""
          }`,
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

    if (planType === "organization" && organization) {
      await prisma.organizationSubscription.upsert({
        where: { providerSubscriptionId: subscriptionId },
        update: {
          provider: "paypal",
          billingUserId: user.id,
          plan: "organization",
          status: String(result.status || "APPROVAL_PENDING").toLowerCase(),
          seatCount: organization.seatLimit,
          billingEmail: organization.billingEmail || user.email,
          updatedAt: new Date(),
        },
        create: {
          organizationId: organization.id,
          billingUserId: user.id,
          provider: "paypal",
          providerSubscriptionId: subscriptionId,
          plan: "organization",
          status: String(result.status || "APPROVAL_PENDING").toLowerCase(),
          seatCount: organization.seatLimit,
          billingEmail: organization.billingEmail || user.email,
        },
      });
    }

    return NextResponse.json({
      subscriptionId,
      approvalLink: approvalLink || null,
      status: result.status || "APPROVAL_PENDING",
      planId,
      planType,
      organizationId: organization?.id || null,
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
