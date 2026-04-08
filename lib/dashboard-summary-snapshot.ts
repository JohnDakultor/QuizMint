type DashboardSummarySnapshotEntry = {
  expiresAt: number;
  payload: unknown;
};

const DASHBOARD_SUMMARY_TTL_MS = Number(
  process.env.DASHBOARD_SUMMARY_TTL_MS || 30_000
);
const MAX_DASHBOARD_SUMMARY_ENTRIES = Number(
  process.env.DASHBOARD_SUMMARY_MAX_ENTRIES || 500
);

const dashboardSummarySnapshotCache = new Map<string, DashboardSummarySnapshotEntry>();

function buildDashboardSummarySnapshotKey(userId: string, origin: string) {
  return `${userId}:${origin.trim().toLowerCase()}`;
}

function pruneDashboardSummarySnapshotCache(now = Date.now()) {
  for (const [key, entry] of dashboardSummarySnapshotCache.entries()) {
    if (entry.expiresAt <= now) {
      dashboardSummarySnapshotCache.delete(key);
    }
  }
  while (dashboardSummarySnapshotCache.size > MAX_DASHBOARD_SUMMARY_ENTRIES) {
    const oldestKey = dashboardSummarySnapshotCache.keys().next().value;
    if (!oldestKey) break;
    dashboardSummarySnapshotCache.delete(oldestKey);
  }
}

function clonePayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}

export function getDashboardSummarySnapshot<T>(input: {
  userId: string;
  origin: string;
}) {
  const now = Date.now();
  pruneDashboardSummarySnapshotCache(now);
  const entry = dashboardSummarySnapshotCache.get(
    buildDashboardSummarySnapshotKey(input.userId, input.origin)
  );
  if (!entry || entry.expiresAt <= now) {
    if (entry) {
      dashboardSummarySnapshotCache.delete(
        buildDashboardSummarySnapshotKey(input.userId, input.origin)
      );
    }
    return null;
  }
  return clonePayload(entry.payload as T);
}

export function setDashboardSummarySnapshot<T>(input: {
  userId: string;
  origin: string;
  payload: T;
}) {
  pruneDashboardSummarySnapshotCache();
  dashboardSummarySnapshotCache.set(
    buildDashboardSummarySnapshotKey(input.userId, input.origin),
    {
      expiresAt: Date.now() + DASHBOARD_SUMMARY_TTL_MS,
      payload: clonePayload(input.payload),
    }
  );
}

export function invalidateDashboardSummarySnapshot(userId: string) {
  for (const key of dashboardSummarySnapshotCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      dashboardSummarySnapshotCache.delete(key);
    }
  }
}
