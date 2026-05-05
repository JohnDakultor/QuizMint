import { NextResponse } from "next/server";

import { assertAdminSession } from "@/lib/admin-auth";
import { reconcileOrganizationPayPalSubscription } from "@/lib/paypal-subscriptions";
import { prisma } from "@/lib/prisma";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = Math.min(2, local.length);
  const maskedLocal = `${local.slice(0, visible)}${"*".repeat(Math.max(0, local.length - visible))}`;
  return `${maskedLocal}@${domain}`;
}

export async function GET(req: Request) {
  const auth = await assertAdminSession();
  if (!auth.ok) {
    const status =
      auth.reason === "misconfigured" ? 500 : auth.reason === "challenge" ? 428 : 403;
    return NextResponse.json({ error: auth.reason }, { status });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
  const showSensitive = searchParams.get("showSensitive") === "true";
  const sanitizeEmail = (email: string | null | undefined) =>
    email ? (showSensitive ? email : maskEmail(email)) : null;

  const organizations = await prisma.organization.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      status: true,
      tier: true,
      seatLimit: true,
      billingEmail: true,
      createdAt: true,
      updatedAt: true,
      ownerUser: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
        },
      },
      members: {
        where: { status: "active" },
        select: { id: true, role: true },
      },
      invitations: {
        where: { status: "pending" },
        select: { id: true },
      },
      subscriptions: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          provider: true,
          providerSubscriptionId: true,
          plan: true,
          status: true,
          seatCount: true,
          billingEmail: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
          billingUser: {
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
            },
          },
        },
      },
      _count: {
        select: {
          classes: true,
          assignments: true,
          quizzes: true,
          lessonPlans: true,
        },
      },
    },
  });

  return NextResponse.json({
    organizations: organizations.map((organization) => ({
      ...organization,
      billingEmail: sanitizeEmail(organization.billingEmail),
      ownerUser: {
        ...organization.ownerUser,
        email: sanitizeEmail(organization.ownerUser.email) || "***",
      },
      subscriptions: organization.subscriptions.map((subscription) => ({
        ...subscription,
        billingEmail: sanitizeEmail(subscription.billingEmail),
        billingUser: subscription.billingUser
          ? {
              ...subscription.billingUser,
              email: sanitizeEmail(subscription.billingUser.email) || "***",
            }
          : null,
      })),
      activeMemberCount: organization.members.length,
      adminMemberCount: organization.members.filter((member) =>
        ["owner", "admin"].includes(String(member.role || "").toLowerCase())
      ).length,
      pendingInviteCount: organization.invitations.length,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await assertAdminSession();
  if (!auth.ok) {
    const status =
      auth.reason === "misconfigured" ? 500 : auth.reason === "challenge" ? 428 : 403;
    return NextResponse.json({ error: auth.reason }, { status });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        organizationId?: string;
        providerSubscriptionId?: string;
      }
    | null;

  const organizationId = String(body?.organizationId || "").trim();
  const providerSubscriptionId = String(body?.providerSubscriptionId || "").trim();

  if (!organizationId && !providerSubscriptionId) {
    return NextResponse.json(
      { error: "organizationId or providerSubscriptionId is required" },
      { status: 400 }
    );
  }

  const organization = organizationId
    ? await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          subscriptions: {
            where: { provider: "paypal" },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              providerSubscriptionId: true,
            },
          },
        },
      })
    : null;

  const resolvedProviderSubscriptionId =
    providerSubscriptionId || organization?.subscriptions[0]?.providerSubscriptionId || "";

  if (!resolvedProviderSubscriptionId) {
    return NextResponse.json(
      { error: "No PayPal organization subscription found to reconcile" },
      { status: 400 }
    );
  }

  const result = await reconcileOrganizationPayPalSubscription(resolvedProviderSubscriptionId);

  return NextResponse.json({
    message: "Organization billing re-synced from PayPal.",
    paypalStatus: result.paypalStatus,
    organization: result.organization,
    subscription: result.subscription,
  });
}
