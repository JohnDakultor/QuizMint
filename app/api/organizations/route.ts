import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildOrganizationReadableWhere,
  canAdministerOrganization,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";
import { sanitizeOrganizationSeatLimit } from "@/lib/organization-subscription";

function slugifyOrganizationName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function createUniqueOrganizationSlug(name: string) {
  const baseSlug = slugifyOrganizationName(name) || "organization";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function GET() {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await prisma.organization.findMany({
    where: buildOrganizationReadableWhere(user),
    orderBy: [{ updatedAt: "desc" }],
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
      members: {
        where: { status: "active" },
        select: {
          userId: true,
          role: true,
          status: true,
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
      invitations: {
        where: { status: "pending" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
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

  return NextResponse.json({
    organizations: organizations.map((organization) => {
      const currentMembership = organization.members.find((member) => member.userId === user.id);
      const currentRole =
        organization.ownerUserId === user.id ? "owner" : currentMembership?.role || "viewer";

      return {
        ...organization,
        currentRole,
        canAdminister: canAdministerOrganization(user, organization.id),
      };
    }),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        billingEmail?: string;
        seatLimit?: number;
      }
    | null;

  const name = String(body?.name || "").trim();
  const billingEmail = String(body?.billingEmail || "").trim().toLowerCase() || null;
  const seatLimit = sanitizeOrganizationSeatLimit(body?.seatLimit);

  if (!name) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const slug = await createUniqueOrganizationSlug(name);
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      billingEmail,
      tier: "organization",
      status: "inactive",
      seatLimit,
      ownerUserId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "owner",
          status: "active",
          joinedAt: new Date(),
        },
      },
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
    },
  });

  return NextResponse.json({ organization }, { status: 201 });
}
