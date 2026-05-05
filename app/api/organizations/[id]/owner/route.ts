import { NextResponse } from "next/server";

import { getCurrentUserAccessContext } from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
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
      ownerUserId: true,
      members: {
        where: { status: "active" },
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
      },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Only the current organization owner can transfer ownership" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        memberId?: string;
      }
    | null;

  const memberId = String(body?.memberId || "").trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const nextOwnerMember = organization.members.find((member) => member.id === memberId);
  if (!nextOwnerMember) {
    return NextResponse.json(
      { error: "Choose an active organization member as the next owner" },
      { status: 400 }
    );
  }
  if (nextOwnerMember.userId === organization.ownerUserId) {
    return NextResponse.json({ error: "That member is already the owner" }, { status: 400 });
  }

  const previousOwnerMember = organization.members.find(
    (member) => member.userId === organization.ownerUserId
  );
  const effectiveJoinedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organization.id },
      data: {
        ownerUserId: nextOwnerMember.userId,
      },
    });

    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: nextOwnerMember.userId,
        },
      },
      update: {
        role: "owner",
        status: "active",
        joinedAt: nextOwnerMember.joinedAt || effectiveJoinedAt,
      },
      create: {
        organizationId: organization.id,
        userId: nextOwnerMember.userId,
        role: "owner",
        status: "active",
        joinedAt: effectiveJoinedAt,
      },
    });

    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: organization.ownerUserId,
        },
      },
      update: {
        role: "admin",
        status: "active",
        joinedAt: previousOwnerMember?.joinedAt || effectiveJoinedAt,
      },
      create: {
        organizationId: organization.id,
        userId: organization.ownerUserId,
        role: "admin",
        status: "active",
        joinedAt: effectiveJoinedAt,
      },
    });

    return tx.organization.findUnique({
      where: { id: organization.id },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
          },
        },
      },
    });
  });

  return NextResponse.json({
    message: `Ownership transferred to ${
      result?.ownerUser?.name || result?.ownerUser?.username || result?.ownerUser?.email || "the new owner"
    }.`,
    organization: result,
  });
}
