export type IndividualPlan = "free" | "pro" | "premium";
export type OrganizationPlan = "organization" | "enterprise";
export type SubscriptionPlan = IndividualPlan | OrganizationPlan;
export type PlanScope = "individual" | "organization";

export type ResolvePlanEntitlementsInput = {
  plan: string | null | undefined;
  status?: string | null | undefined;
  subscriptionEnd?: Date | null | undefined;
};

export type PlanEntitlements = {
  rawPlan: string | null;
  normalizedPlan: SubscriptionPlan;
  scope: PlanScope;
  active: boolean;
  isFree: boolean;
  isPaid: boolean;
  isPro: boolean;
  isPremium: boolean;
  isOrganizationTier: boolean;
  canManageOrganization: boolean;
  burstLimit: number;
};

const PLAN_ALIASES: Record<string, SubscriptionPlan> = {
  free: "free",
  pro: "pro",
  premium: "premium",
  organization: "organization",
  org: "organization",
  institution: "organization",
  institutional: "organization",
  school: "organization",
  enterprise: "enterprise",
};

export const INDIVIDUAL_SUBSCRIPTION_PLANS: readonly IndividualPlan[] = ["free", "pro", "premium"];
export const ORGANIZATION_SUBSCRIPTION_PLANS: readonly OrganizationPlan[] = [
  "organization",
  "enterprise",
];
export const ALL_SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  ...INDIVIDUAL_SUBSCRIPTION_PLANS,
  ...ORGANIZATION_SUBSCRIPTION_PLANS,
];

export function normalizeSubscriptionPlan(plan: string | null | undefined): SubscriptionPlan {
  const normalized = String(plan || "").trim().toLowerCase();
  return PLAN_ALIASES[normalized] || "free";
}

export function getPlanScope(plan: string | null | undefined): PlanScope {
  const normalizedPlan = normalizeSubscriptionPlan(plan);
  return normalizedPlan === "organization" || normalizedPlan === "enterprise"
    ? "organization"
    : "individual";
}

export function isPaidSubscriptionPlan(plan: string | null | undefined) {
  return normalizeSubscriptionPlan(plan) !== "free";
}

export function getBurstLimitForPlan(plan: string | null | undefined) {
  const normalizedPlan = normalizeSubscriptionPlan(plan);
  if (normalizedPlan === "enterprise") return 32;
  if (normalizedPlan === "premium" || normalizedPlan === "organization") return 24;
  if (normalizedPlan === "pro") return 18;
  return 8;
}

export function resolvePlanEntitlements(
  input: ResolvePlanEntitlementsInput
): PlanEntitlements {
  const rawPlan = input.plan ? String(input.plan).trim() : null;
  const normalizedPlan = normalizeSubscriptionPlan(rawPlan);
  const active =
    input.status === "active" &&
    (!input.subscriptionEnd || new Date() < input.subscriptionEnd);
  const isOrganizationTier =
    normalizedPlan === "organization" || normalizedPlan === "enterprise";

  return {
    rawPlan,
    normalizedPlan,
    scope: getPlanScope(normalizedPlan),
    active,
    isFree: normalizedPlan === "free" || !active,
    isPaid: normalizedPlan !== "free" && active,
    isPro: normalizedPlan === "pro" && active,
    isPremium: normalizedPlan === "premium" && active,
    isOrganizationTier: isOrganizationTier && active,
    canManageOrganization: isOrganizationTier && active,
    burstLimit: getBurstLimitForPlan(normalizedPlan),
  };
}
