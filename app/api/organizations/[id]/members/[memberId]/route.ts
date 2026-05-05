import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildOrganizationAdminWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

const MANAGEABLE_MEMBER_ROLES = new Set(["admin", "teacher"]);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await context.params;
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.userId === organization.ownerUserId) {
    return NextResponse.json(
      { error: "Use owner transfer flow to change the organization owner" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        role?: string;
        status?: string;
      }
    | null;

  const role = body?.role === undefined ? undefined : String(body.role || "").trim().toLowerCase();
  const status =
    body?.status === undefined ? undefined : String(body.status || "").trim().toLowerCase();

  if (role !== undefined && !MANAGEABLE_MEMBER_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid member role" }, { status: 400 });
  }
  if (status !== undefined && !["active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "Invalid member status" }, { status: 400 });
  }

  const updatedMember = await prisma.organizationMember.update({
    where: { id: member.id },
    data: {
      role,
      status,
    },
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
      joinedAt: true,
      createdAt: true,
      updatedAt: true,
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
  });

  return NextResponse.json({ member: updatedMember });
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await context.params;
  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...buildOrganizationAdminWhere(user),
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.userId === organization.ownerUserId) {
    return NextResponse.json(
      { error: "The organization owner cannot be removed from membership" },
      { status: 400 }
    );
  }

  await prisma.organizationMember.delete({
    where: { id: member.id },
  });

  return NextResponse.json({ ok: true, memberId: member.id });
}
