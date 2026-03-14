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

let upstashRedis: { incr: (key: string) => Promise<number>; pexpire: (key: string, ms: number) => Promise<unknown>; ttl: (key: string) => Promise<number> } | null = null;
let upstashInitDone = false;

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
  // Legacy sync signature kept for compatibility in case old imports exist.
  // New callers should use checkFeatureBurstLimitDistributed.
  return checkFeatureBurstLimitInMemory(input);
}

function checkFeatureBurstLimitInMemory(input: GuardInput): GuardResult {
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

function getUpstashRedis() {
  if (upstashInitDone) return upstashRedis;
  upstashInitDone = true;

  let url = process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Vercel/Upstash integrations sometimes provide only REDIS_URL (rediss://).
  // Convert it into REST credentials when explicit REST vars are not present.
  if ((!url || !token) && process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      const derivedToken = decodeURIComponent(parsed.password || "");
      const derivedHost = parsed.hostname;
      if (!url && derivedHost) {
        url = `https://${derivedHost}`;
      }
      if (!token && derivedToken) {
        token = derivedToken;
      }
    } catch {
      // Ignore parsing errors and fall back to in-memory limiter.
    }
  }

  if (!url || !token) {
    upstashRedis = null;
    return upstashRedis;
  }

  try {
    // Lazy import to avoid hard failure when env vars are not configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis") as { Redis: new (opts: { url: string; token: string }) => typeof upstashRedis };
    upstashRedis = new Redis({ url, token }) as typeof upstashRedis;
  } catch {
    upstashRedis = null;
  }
  return upstashRedis;
}

export async function checkFeatureBurstLimitDistributed(input: GuardInput): Promise<GuardResult> {
  const plan = normalizePlan(input.plan);
  const limit = limitByPlan(plan);
  const key = `abuse:burst:${input.feature}:${input.userId}`;
  const redis = getUpstashRedis();

  if (!redis) {
    return checkFeatureBurstLimitInMemory(input);
  }

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, WINDOW_MS);
      return { ok: true, limit, remaining: Math.max(limit - 1, 0) };
    }

    if (count > limit) {
      const ttlSec = await redis.ttl(key);
      return {
        ok: false,
        limit,
        retryAfterSec: Math.max(1, Number.isFinite(ttlSec) ? Math.ceil(ttlSec) : Math.ceil(WINDOW_MS / 1000)),
      };
    }

    return { ok: true, limit, remaining: Math.max(limit - count, 0) };
  } catch {
    // Safe fallback: never hard-fail user request because limiter backend is down.
    return checkFeatureBurstLimitInMemory(input);
  }
}
