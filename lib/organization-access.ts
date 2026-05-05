import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_CONTENT_WRITE_ROLES = new Set(["owner", "admin", "teacher"]);
const ORGANIZATION_ADMIN_ROLES = new Set(["owner", "admin"]);

export type CurrentUserAccessContext = {
  id: string;
  email: string;
  subscriptionPlan: string | null;
  organizationMemberships: Array<{
    organizationId: string;
    role: string;
  }>;
  organizationIds: string[];
  writableOrganizationIds: string[];
  administrableOrganizationIds: string[];
};

export async function getCurrentUserAccessContext(): Promise<CurrentUserAccessContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      subscriptionPlan: true,
      organizationMemberships: {
        where: { status: "active" },
        select: {
          organizationId: true,
          role: true,
        },
      },
    },
  });

  if (!user) return null;

  const organizationMemberships = user.organizationMemberships.map((membership) => ({
    organizationId: membership.organizationId,
    role: String(membership.role || "").trim().toLowerCase() || "teacher",
  }));

  return {
    id: user.id,
    email: user.email,
    subscriptionPlan: user.subscriptionPlan,
    organizationMemberships,
    organizationIds: organizationMemberships.map((membership) => membership.organizationId),
    writableOrganizationIds: organizationMemberships
      .filter((membership) => ORGANIZATION_CONTENT_WRITE_ROLES.has(membership.role))
      .map((membership) => membership.organizationId),
    administrableOrganizationIds: organizationMemberships
      .filter((membership) => ORGANIZATION_ADMIN_ROLES.has(membership.role))
      .map((membership) => membership.organizationId),
  };
}

function buildScopeWhere(
  userIdKey: string,
  organizationIdKey: string,
  userId: string,
  organizationIds: string[]
) {
  if (!organizationIds.length) {
    return { [userIdKey]: userId };
  }

  return {
    OR: [{ [userIdKey]: userId }, { [organizationIdKey]: { in: organizationIds } }],
  };
}

export function buildOwnedOrMemberWhere(access: CurrentUserAccessContext) {
  return buildScopeWhere("userId", "organizationId", access.id, access.organizationIds);
}

export function buildOwnedOrWritableWhere(access: CurrentUserAccessContext) {
  return buildScopeWhere("userId", "organizationId", access.id, access.writableOrganizationIds);
}

export function canWriteToOrganization(
  access: CurrentUserAccessContext,
  organizationId: string | null | undefined
) {
  if (!organizationId) return true;
  return access.writableOrganizationIds.includes(organizationId);
}

export function canAdministerOrganization(
  access: CurrentUserAccessContext,
  organizationId: string | null | undefined
) {
  if (!organizationId) return false;
  return access.administrableOrganizationIds.includes(organizationId);
}

export function buildOrganizationReadableWhere(access: CurrentUserAccessContext) {
  return {
    OR: [
      { ownerUserId: access.id },
      {
        members: {
          some: {
            userId: access.id,
            status: "active",
          },
        },
      },
    ],
  };
}

export function buildOrganizationAdminWhere(access: CurrentUserAccessContext) {
  return {
    OR: [
      { ownerUserId: access.id },
      {
        members: {
          some: {
            userId: access.id,
            status: "active",
            role: { in: Array.from(ORGANIZATION_ADMIN_ROLES) },
          },
        },
      },
    ],
  };
}
