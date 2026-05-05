import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAccessContext } from "@/lib/organization-access";
import {
  isOrganizationOperational,
  isOrganizationSubscriptionActive,
} from "@/lib/organization-subscription";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  return NextResponse.json({
    invitation,
    matchesCurrentUser:
      invitation.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
    expired: Boolean(invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()),
  });
}

export async function POST(_: Request, context: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          id: true,
          status: true,
          seatLimit: true,
          subscriptions: {
            where: { status: { in: ["active", "trialing"] } },
            orderBy: { updatedAt: "desc" },
            select: { status: true, currentPeriodEnd: true },
            take: 1,
          },
          members: {
            where: {
              OR: [{ status: "active" }, { userId: user.id }],
            },
            select: { id: true, userId: true, status: true },
          },
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invitation.status !== "pending") {
    return NextResponse.json({ error: "Invitation is no longer active" }, { status: 400 });
  }
  if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }
  if (invitation.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Sign in with the invited email address to accept this invitation" },
      { status: 403 }
    );
  }
  const hasActiveSubscription = invitation.organization.subscriptions.some((subscription) =>
    isOrganizationSubscriptionActive(subscription.status, subscription.currentPeriodEnd)
  );
  if (!isOrganizationOperational(invitation.organization.status) || !hasActiveSubscription) {
    return NextResponse.json(
      { error: "Organization subscription is not active" },
      { status: 402 }
    );
  }
  const alreadyActiveMember = invitation.organization.members.some(
    (member) => member.userId === user.id && member.status === "active"
  );
  if (
    invitation.organization.seatLimit &&
    invitation.organization.members.filter((member) => member.status === "active").length >=
      invitation.organization.seatLimit &&
    !alreadyActiveMember
  ) {
    return NextResponse.json({ error: "Seat limit reached" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
        status: "active",
        joinedAt: new Date(),
      },
      create: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
        status: "active",
        joinedAt: new Date(),
      },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
      },
    });

    const acceptedInvitation = await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        acceptedAt: true,
      },
    });

    return {
      membership,
      invitation: acceptedInvitation,
    };
  });

  return NextResponse.json(result, { status: 201 });
}
