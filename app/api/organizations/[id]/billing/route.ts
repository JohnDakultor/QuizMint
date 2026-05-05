import { NextResponse } from "next/server";

import { buildOrganizationAdminWhere, getCurrentUserAccessContext } from "@/lib/organization-access";
import {
  cancelPayPalSubscription,
  isPayPalResourceNotFoundError,
  reconcileOrganizationPayPalSubscription,
} from "@/lib/paypal-subscriptions";
import { prisma } from "@/lib/prisma";

async function markOrganizationBillingCancelled(input: {
  organizationId: string;
  subscriptionId: string;
}) {
  const [subscription] = await prisma.$transaction([
    prisma.organizationSubscription.update({
      where: { id: input.subscriptionId },
      data: {
        status: "cancelled",
        updatedAt: new Date(),
      },
      select: {
        id: true,
        provider: true,
        plan: true,
        status: true,
        seatCount: true,
        billingEmail: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        providerSubscriptionId: true,
        updatedAt: true,
      },
    }),
    prisma.organization.update({
      where: { id: input.organizationId },
      data: { status: "inactive" },
    }),
  ]);

  return subscription;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: {
      id: true,
      name: true,
      subscriptions: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          provider: true,
          plan: true,
          status: true,
          seatCount: true,
          billingEmail: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          providerSubscriptionId: true,
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
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({
    organizationId: organization.id,
    subscriptions: organization.subscriptions,
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: {
      id: true,
      subscriptions: {
        where: {
          provider: "paypal",
          status: { in: ["approval_pending", "active", "trialing"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          providerSubscriptionId: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const currentSubscription = organization.subscriptions[0];
  if (!currentSubscription?.providerSubscriptionId) {
    return NextResponse.json({ error: "No cancellable organization subscription found" }, { status: 400 });
  }

  let paypalAlreadyMissing = false;
  try {
    await cancelPayPalSubscription(
      currentSubscription.providerSubscriptionId,
      `Cancelled by organization admin ${user.email}`
    );
  } catch (error) {
    if (!isPayPalResourceNotFoundError(error)) throw error;
    paypalAlreadyMissing = true;
  }

  const subscription = await markOrganizationBillingCancelled({
    organizationId: organization.id,
    subscriptionId: currentSubscription.id,
  });

  return NextResponse.json({
    message: paypalAlreadyMissing
      ? "Organization billing marked cancelled."
      : "Organization billing cancellation requested.",
    note: paypalAlreadyMissing
      ? "PayPal no longer has that subscription ID, so the local organization billing record was reconciled as cancelled."
      : "PayPal will handle the final subscription lifecycle timing.",
    subscription,
  });
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: {
      id: true,
      subscriptions: {
        where: {
          provider: "paypal",
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          providerSubscriptionId: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const providerSubscriptionId = organization.subscriptions[0]?.providerSubscriptionId;
  if (!providerSubscriptionId) {
    return NextResponse.json({ error: "No PayPal organization subscription found to reconcile" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof reconcileOrganizationPayPalSubscription>>;
  try {
    result = await reconcileOrganizationPayPalSubscription(providerSubscriptionId);
  } catch (error) {
    if (!isPayPalResourceNotFoundError(error)) throw error;
    const subscription = await markOrganizationBillingCancelled({
      organizationId: organization.id,
      subscriptionId: organization.subscriptions[0].id,
    });
    return NextResponse.json({
      message: "Organization billing marked cancelled.",
      paypalStatus: "RESOURCE_NOT_FOUND",
      note: "PayPal no longer has that subscription ID, so the local organization billing record was reconciled as cancelled.",
      subscription,
    });
  }

  return NextResponse.json({
    message: "Organization billing re-synced from PayPal.",
    paypalStatus: result.paypalStatus,
    organization: result.organization,
    subscription: result.subscription,
  });
}
