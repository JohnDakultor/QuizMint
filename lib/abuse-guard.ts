type PlanType = "free" | "pro" | "premium";

type GuardInput = {
  userId: string;
  plan: string | null | undefined;
  feature: string;
};

type GuardResult = {
  ok: true;
  limit: number;
  remaining: number;
} | {
  ok: false;
  limit: number;
  retryAfterSec: number;
};

const WINDOW_MS = 60 * 1000;
const CLEANUP_EVERY_MS = 5 * 60 * 1000;
const lastSeenByKey = new Map<string, { count: number; windowStartedAt: number }>();
let lastCleanupAt = 0;

function normalizePlan(plan: string | null | undefined): PlanType {
  if (plan === "pro") return "pro";
  if (plan === "premium") return "premium";
  return "free";
}

function limitByPlan(plan: PlanType) {
  if (plan === "premium") return 24;
  if (plan === "pro") return 18;
  return 8;
}

function cleanupExpired(now: number) {
  if (now - lastCleanupAt < CLEANUP_EVERY_MS) return;
  for (const [key, value] of lastSeenByKey.entries()) {
    if (now - value.windowStartedAt >= WINDOW_MS) {
      lastSeenByKey.delete(key);
    }
  }
  lastCleanupAt = now;
}

export function checkFeatureBurstLimit(input: GuardInput): GuardResult {
  const now = Date.now();
  cleanupExpired(now);

  const plan = normalizePlan(input.plan);
  const limit = limitByPlan(plan);
  const key = `${input.userId}:${input.feature}`;
  const existing = lastSeenByKey.get(key);

  if (!existing || now - existing.windowStartedAt >= WINDOW_MS) {
    lastSeenByKey.set(key, { count: 1, windowStartedAt: now });
    return { ok: true, limit, remaining: Math.max(limit - 1, 0) };
  }

  if (existing.count >= limit) {
    const retryAfterMs = WINDOW_MS - (now - existing.windowStartedAt);
    return {
      ok: false,
      limit,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  existing.count += 1;
  lastSeenByKey.set(key, existing);
  return { ok: true, limit, remaining: Math.max(limit - existing.count, 0) };
}

