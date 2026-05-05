import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { buildOrganizationAdminWhere, getCurrentUserAccessContext } from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";

const INVITATION_TTL_DAYS = 14;

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string; invitationId: string }> }
) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, invitationId } = await context.params;
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const invitation = await prisma.organizationInvitation.findFirst({
    where: {
      id: invitationId,
      organizationId: organization.id,
      status: "pending",
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const resentInvitation = await prisma.organizationInvitation.update({
    where: { id: invitation.id },
    data: {
      token: randomUUID(),
      invitedByUserId: user.id,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    message: "Fresh invitation link created.",
    invitation: resentInvitation,
  });
}
