// import {prisma} from "@/lib/prisma";

// export async function getUserSubscription(userId: number) {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: {
//       subscriptionPlan: true,
//       subscriptionStatus: true,
//       subscriptionEnd: true,
//     },
//   });

//   if (!user) return { isPro: false };

//   const isActive =
//     user.subscriptionStatus === "active" &&
//     (!user.subscriptionEnd || new Date() < user.subscriptionEnd);

//   return {
//     isPro: user.subscriptionPlan === "pro" && isActive,
//   };
// }

import { prisma } from "@/lib/prisma";
import { resolvePlanEntitlements } from "@/lib/plan-entitlements";
import { isOrganizationSubscriptionActive } from "@/lib/organization-subscription";

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionEnd: true,
      organizationMemberships: {
        where: { status: "active" },
        select: {
          organization: {
            select: {
              status: true,
              subscriptions: {
                where: { status: { in: ["active", "trialing"] } },
                orderBy: { updatedAt: "desc" },
                select: { status: true, currentPeriodEnd: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      plan: null,
      normalizedPlan: "free" as const,
      scope: "individual" as const,
      isPro: false,
      isPremium: false,
      isOrganizationTier: false,
      canManageOrganization: false,
      active: false,
    };
  }

  const personalEntitlements = resolvePlanEntitlements({
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    subscriptionEnd: user.subscriptionEnd,
  });
  const hasActiveOrganizationMembership = user.organizationMemberships.some((membership) => {
    const organizationStatus = String(membership.organization.status || "").toLowerCase();
    return (
      (organizationStatus === "active" || organizationStatus === "trialing") &&
      membership.organization.subscriptions.some((subscription) =>
        isOrganizationSubscriptionActive(subscription.status, subscription.currentPeriodEnd)
      )
    );
  });
  const entitlements = hasActiveOrganizationMembership
    ? resolvePlanEntitlements({ plan: "organization", status: "active" })
    : personalEntitlements;

  return {
    plan: user.subscriptionPlan,
    normalizedPlan: entitlements.normalizedPlan,
    scope: entitlements.scope,
    isPro: entitlements.isPro,
    isPremium: entitlements.isPremium,
    isOrganizationTier: entitlements.isOrganizationTier,
    canManageOrganization: entitlements.canManageOrganization,
    active: entitlements.active,
  };
}
