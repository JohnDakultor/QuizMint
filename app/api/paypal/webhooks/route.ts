import { NextRequest, NextResponse } from "next/server";

import {
  getPayPalAccessToken,
  normalizePayPalSubscriptionStatus,
  reconcileOrganizationPayPalSubscription,
  resolvePayPalPlanType,
} from "@/lib/paypal-subscriptions";
import { prisma } from "@/lib/prisma";

const base =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

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

  const accessToken = await getPayPalAccessToken();
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const isValid = await verifyWebhook(req.headers, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const eventType = String(body.event_type || "");
    const resource = body.resource as Record<string, any> | undefined;

    if (!eventType.startsWith("BILLING.SUBSCRIPTION")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const subscriptionId = String(resource?.id || "").trim();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
    }
    if (!resource) {
      return NextResponse.json({ error: "Missing subscription resource" }, { status: 400 });
    }

    const linkedOrganizationSubscription = await prisma.organizationSubscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
      select: { organizationId: true },
    });

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const payerEmail = String(resource?.subscriber?.email_address || "").trim().toLowerCase();
      if (!payerEmail) {
        return NextResponse.json({ success: true, ignored: "missing payer email" });
      }

      const user = await prisma.user.findUnique({ where: { email: payerEmail } });
      if (!user) {
        return NextResponse.json({ success: true, ignored: "user not found" });
      }

      const accessToken = await getPayPalAccessToken();
      const planType = await resolvePayPalPlanType(accessToken, String(resource?.plan_id || ""));
      const nextBillingTime = resource?.billing_info?.next_billing_time
        ? new Date(resource.billing_info.next_billing_time)
        : null;
      const customOrganizationId = String(resource?.custom_id || "").startsWith("organization:")
        ? String(resource.custom_id).slice("organization:".length)
        : null;
      const resolvedOrganizationId =
        linkedOrganizationSubscription?.organizationId || customOrganizationId;

      let organization: { id: string; seatLimit: number | null; billingEmail: string | null } | null =
        null;
      if (planType === "organization") {
        if (!resolvedOrganizationId) {
          return NextResponse.json({ success: true, ignored: "missing organization link" });
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
          select: { id: true, seatLimit: true, billingEmail: true },
        });

        if (!organization) {
          return NextResponse.json({
            success: true,
            ignored: "organization not found or not administrable",
          });
        }
      }

      await prisma.payPalSubscription.upsert({
        where: { subscriptionId },
        update: {
          status: "ACTIVE",
          planType,
          planId: String(resource?.plan_id || ""),
          nextBillingTime,
          updatedAt: new Date(),
        },
        create: {
          subscriptionId,
          planId: String(resource?.plan_id || ""),
          planType,
          status: "ACTIVE",
          userId: user.id,
          startTime: new Date(resource?.start_time || new Date()),
          nextBillingTime,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: planType,
          subscriptionStatus: "active",
          subscriptionStart: new Date(resource?.start_time || new Date()),
          subscriptionEnd: nextBillingTime,
          paypalCustomerId: String(resource?.subscriber?.payer_id || "").trim() || null,
        },
      });

      if (planType === "organization" || linkedOrganizationSubscription?.organizationId) {
        if (organization) {
          await prisma.organizationSubscription.upsert({
            where: { providerSubscriptionId: subscriptionId },
            update: {
              organizationId: organization.id,
              billingUserId: user.id,
              provider: "paypal",
              plan: "organization",
              status: "active",
              seatCount: organization.seatLimit,
              billingEmail: organization.billingEmail || payerEmail || user.email,
              currentPeriodStart: new Date(resource?.start_time || new Date()),
              currentPeriodEnd: nextBillingTime,
              updatedAt: new Date(),
            },
            create: {
              organizationId: organization.id,
              billingUserId: user.id,
              provider: "paypal",
              providerSubscriptionId: subscriptionId,
              plan: "organization",
              status: "active",
              seatCount: organization.seatLimit,
              billingEmail: organization.billingEmail || payerEmail || user.email,
              currentPeriodStart: new Date(resource?.start_time || new Date()),
              currentPeriodEnd: nextBillingTime,
            },
          });
        }
        await reconcileOrganizationPayPalSubscription(subscriptionId);
      }
    }

    if (
      eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
      eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
      eventType === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      const normalizedStatus = normalizePayPalSubscriptionStatus(
        eventType === "BILLING.SUBSCRIPTION.CANCELLED"
          ? "CANCELLED"
          : eventType === "BILLING.SUBSCRIPTION.SUSPENDED"
          ? "SUSPENDED"
          : "EXPIRED"
      );

      const nextBillingTime = resource?.billing_info?.next_billing_time
        ? new Date(resource.billing_info.next_billing_time)
        : new Date();

      const sub = await prisma.payPalSubscription
        .update({
          where: { subscriptionId },
          data: { status: normalizedStatus.toUpperCase(), nextBillingTime, updatedAt: new Date() },
          select: { userId: true },
        })
        .catch(() => null);

      if (sub?.userId) {
        await prisma.user.update({
          where: { id: sub.userId },
          data: {
            subscriptionStatus: normalizedStatus,
            subscriptionPlan: normalizedStatus === "expired" ? "free" : undefined,
            subscriptionEnd: nextBillingTime,
          },
        });
      }

      if (linkedOrganizationSubscription?.organizationId) {
        await reconcileOrganizationPayPalSubscription(subscriptionId);
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED") {
      const nextBillingTime = resource?.billing_info?.next_billing_time
        ? new Date(resource.billing_info.next_billing_time)
        : null;
      if (nextBillingTime) {
        const sub = await prisma.payPalSubscription
          .update({
            where: { subscriptionId },
            data: { nextBillingTime, status: "ACTIVE", updatedAt: new Date() },
            select: { userId: true },
          })
          .catch(() => null);

        if (sub?.userId) {
          await prisma.user.update({
            where: { id: sub.userId },
            data: { subscriptionEnd: nextBillingTime, subscriptionStatus: "active" },
          });
        }

        if (linkedOrganizationSubscription?.organizationId) {
          await reconcileOrganizationPayPalSubscription(subscriptionId);
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
