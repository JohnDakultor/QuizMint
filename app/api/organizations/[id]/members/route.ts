import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildOrganizationReadableWhere,
  buildOrganizationAdminWhere,
  canAdministerOrganization,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";
import {
  isOrganizationOperational,
  isOrganizationSubscriptionActive,
} from "@/lib/organization-subscription";

const VALID_MEMBER_ROLES = new Set(["admin", "teacher"]);
const INVITATION_TTL_DAYS = 14;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
      ownerUserId: true,
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
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({
    members: organization.members,
    invitations: organization.invitations.map((invitation) => ({
      ...invitation,
      token: canAdminister ? invitation.token : null,
    })),
    canAdminister,
  });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
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
      ownerUserId: true,
      status: true,
      seatLimit: true,
      members: {
        where: { status: "active" },
        select: { id: true },
      },
      invitations: {
        where: { status: "pending" },
        select: { id: true },
      },
      subscriptions: {
        where: { status: { in: ["active", "trialing"] } },
        orderBy: { updatedAt: "desc" },
        select: { status: true, currentPeriodEnd: true },
        take: 1,
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const hasActiveSubscription = organization.subscriptions.some((subscription) =>
    isOrganizationSubscriptionActive(subscription.status, subscription.currentPeriodEnd)
  );
  if (!isOrganizationOperational(organization.status) || !hasActiveSubscription) {
    return NextResponse.json(
      { error: "Organization subscription is not active" },
      { status: 402 }
    );
  }

  const reservedSeats = organization.members.length + organization.invitations.length;

  const body = (await req.json().catch(() => null)) as
    | {
        email?: string;
        role?: string;
      }
    | null;

  const email = String(body?.email || "").trim().toLowerCase();
  const role = String(body?.role || "teacher").trim().toLowerCase() || "teacher";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!VALID_MEMBER_ROLES.has(role)) {
    return NextResponse.json(
      { error: "Invalid member role. Use the owner transfer flow to change ownership." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, username: true },
  });

  if (existingUser) {
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: existingUser.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (
      organization.seatLimit &&
      organization.members.length >= organization.seatLimit &&
      existingMembership?.status !== "active"
    ) {
      return NextResponse.json({ error: "Seat limit reached" }, { status: 400 });
    }

    const membership = await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: existingUser.id,
        },
      },
      update: {
        role,
        status: "active",
        joinedAt: new Date(),
      },
      create: {
        organizationId: organization.id,
        userId: existingUser.id,
        role,
        status: "active",
        joinedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
          },
        },
      },
    });

    await prisma.organizationInvitation.updateMany({
      where: {
        organizationId: organization.id,
        email,
        status: "pending",
      },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json({ member: membership, invitation: null }, { status: 201 });
  }

  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: organization.id,
      email,
      status: "pending",
    },
    select: {
      id: true,
    },
  });

  if (!existingInvitation && organization.seatLimit && reservedSeats >= organization.seatLimit) {
    return NextResponse.json({ error: "Seat limit reached" }, { status: 400 });
  }

  const invitation = existingInvitation
    ? await prisma.organizationInvitation.update({
        where: { id: existingInvitation.id },
        data: {
          role,
          invitedByUserId: user.id,
          expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      })
    : await prisma.organizationInvitation.create({
        data: {
          organizationId: organization.id,
          email,
          role,
          status: "pending",
          token: randomUUID(),
          invitedByUserId: user.id,
          expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });

  return NextResponse.json({ member: null, invitation }, { status: 201 });
}
