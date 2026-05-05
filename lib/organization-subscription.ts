export const DEFAULT_ORGANIZATION_SEAT_LIMIT = 5;
export const MAX_ORGANIZATION_SEAT_LIMIT = 500;

export const ACTIVE_ORGANIZATION_STATUSES = new Set(["active", "trialing"]);
export const ACTIVE_ORGANIZATION_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function normalizeOrganizationStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase();
}

export function isOrganizationOperational(status: string | null | undefined) {
  return ACTIVE_ORGANIZATION_STATUSES.has(normalizeOrganizationStatus(status));
}

export function isOrganizationSubscriptionActive(
  status: string | null | undefined,
  currentPeriodEnd?: Date | null
) {
  return (
    ACTIVE_ORGANIZATION_SUBSCRIPTION_STATUSES.has(normalizeOrganizationStatus(status)) &&
    (!currentPeriodEnd || currentPeriodEnd.getTime() > Date.now())
  );
}

export function sanitizeOrganizationSeatLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_ORGANIZATION_SEAT_LIMIT;
  }
  return Math.min(MAX_ORGANIZATION_SEAT_LIMIT, Math.max(1, Math.trunc(value)));
}

export function hasPremiumFeaturePlan(plan: string | null | undefined) {
  const normalized = String(plan || "").trim().toLowerCase();
  return normalized === "premium" || normalized === "organization" || normalized === "enterprise";
}
