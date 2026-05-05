import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import {
  fetchPayPalSubscriptionDetails,
  normalizePayPalSubscriptionStatus,
  reconcileOrganizationPayPalSubscription,
  resolvePayPalPlanType,
} from "@/lib/paypal-subscriptions";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, organizationId } = await req.json();
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

    const { accessToken, subscription } = await fetchPayPalSubscriptionDetails(subscriptionId);
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

    const planType = await resolvePayPalPlanType(accessToken, subscription.plan_id);
    const subscriptionEnd = subscription.billing_info?.next_billing_time
      ? new Date(subscription.billing_info.next_billing_time)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d;
        })();

    let organization: { id: string; seatLimit: number | null; billingEmail: string | null } | null =
      null;
    let organizationSubscription = null;
    if (planType === "organization") {
      const explicitOrganizationId = String(organizationId || "").trim() || null;
      const customOrganizationId = String(subscription?.custom_id || "").startsWith("organization:")
        ? String(subscription.custom_id).slice("organization:".length)
        : null;
      const resolvedOrganizationId = explicitOrganizationId || customOrganizationId;

      if (!resolvedOrganizationId) {
        return NextResponse.json(
          { error: "organizationId required to verify organization subscription" },
          { status: 400 }
        );
      }

      organization = await prisma.organization.findFirst({
        where: {
          id: resolvedOrganizationId,
          OR: [
            { ownerUserId: user.id },
            {
              members: {
                some: {
                  userId: user.id,
                  status: "active",
                  role: { in: ["owner", "admin"] },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          seatLimit: true,
          billingEmail: true,
        },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found or not administrable" },
          { status: 404 }
        );
      }
    }

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

    if (planType === "organization" && organization) {
      organizationSubscription = await prisma.organizationSubscription.upsert({
        where: { providerSubscriptionId: subscriptionId },
        update: {
          organizationId: organization.id,
          billingUserId: user.id,
          provider: "paypal",
          plan: "organization",
          status: normalizePayPalSubscriptionStatus(subscription.status),
          seatCount: organization.seatLimit,
          billingEmail: organization.billingEmail || payerEmail || user.email,
          currentPeriodStart: new Date(subscription.start_time || new Date()),
          currentPeriodEnd: subscriptionEnd,
          updatedAt: new Date(),
        },
        create: {
          organizationId: organization.id,
          billingUserId: user.id,
          provider: "paypal",
          providerSubscriptionId: subscriptionId,
          plan: "organization",
          status: normalizePayPalSubscriptionStatus(subscription.status),
          seatCount: organization.seatLimit,
          billingEmail: organization.billingEmail || payerEmail || user.email,
          currentPeriodStart: new Date(subscription.start_time || new Date()),
          currentPeriodEnd: subscriptionEnd,
        },
      });

      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          tier: "organization",
          status: "active",
          billingEmail: organization.billingEmail || payerEmail || user.email,
        },
      });

      organizationSubscription = (await reconcileOrganizationPayPalSubscription(subscriptionId)).subscription;
    }

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
      organizationSubscription,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Verification failed", message: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
