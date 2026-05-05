import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildOrganizationReadableWhere,
  buildOrganizationAdminWhere,
  canAdministerOrganization,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";
import {
  isOrganizationSubscriptionActive,
  sanitizeOrganizationSeatLimit,
} from "@/lib/organization-subscription";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const canAdminister = canAdministerOrganization(user, id);
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationReadableWhere(user),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      billingEmail: true,
      status: true,
      tier: true,
      seatLimit: true,
      createdAt: true,
      updatedAt: true,
      ownerUserId: true,
      ownerUser: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
        },
      },
      members: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          userId: true,
          role: true,
          status: true,
          joinedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
              subscriptionPlan: true,
            },
          },
        },
      },
      invitations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
        },
      },
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
          members: true,
          invitations: true,
          classes: true,
          assignments: true,
          quizzes: true,
          lessonPlans: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const currentMembership = organization.members.find((member) => member.userId === user.id);
  const currentRole =
    organization.ownerUserId === user.id ? "owner" : currentMembership?.role || "viewer";

  return NextResponse.json({
    organization: {
      ...organization,
      canAdminister,
      currentRole,
      canTransferOwnership: organization.ownerUserId === user.id,
      invitations: organization.invitations.map((invitation) => ({
        ...invitation,
        token: canAdminister ? invitation.token : null,
      })),
      subscriptions: organization.subscriptions.map((subscription) => ({
        ...subscription,
        billingEmail: canAdminister ? subscription.billingEmail : null,
        providerSubscriptionId: canAdminister ? subscription.providerSubscriptionId : null,
        billingUser: canAdminister ? subscription.billingUser : null,
      })),
    },
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        billingEmail?: string | null;
        seatLimit?: number | null;
      }
    | null;

  const nextName = body?.name === undefined ? undefined : String(body.name || "").trim();
  if (nextName !== undefined && !nextName) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const organization = await prisma.organization.update({
    where: { id: existing.id },
    data: {
      name: nextName,
      billingEmail:
        body?.billingEmail === undefined
          ? undefined
          : String(body.billingEmail || "").trim().toLowerCase() || null,
      seatLimit:
        body?.seatLimit === undefined
          ? undefined
          : sanitizeOrganizationSeatLimit(body.seatLimit),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      billingEmail: true,
      status: true,
      tier: true,
      seatLimit: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ organization });
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
      ownerUserId: user.id,
    },
    select: {
      id: true,
      name: true,
      subscriptions: {
        where: {
          provider: "paypal",
          status: { in: ["approval_pending", "active", "trialing"] },
        },
        select: {
          status: true,
          currentPeriodEnd: true,
          providerSubscriptionId: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Only the current organization owner can delete this organization" },
      { status: 404 }
    );
  }

  const activeSubscription = organization.subscriptions.find((subscription) =>
    isOrganizationSubscriptionActive(subscription.status, subscription.currentPeriodEnd)
  );
  if (activeSubscription?.providerSubscriptionId) {
    return NextResponse.json(
      { error: "Cancel organization billing before deleting this organization." },
      { status: 409 }
    );
  }

  await prisma.organization.delete({
    where: { id: organization.id },
  });

  return NextResponse.json({
    ok: true,
    deletedOrganizationId: organization.id,
    message: `${organization.name} deleted.`,
  });
}
