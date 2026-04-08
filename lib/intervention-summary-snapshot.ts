type InterventionSummarySnapshotEntry = {
  expiresAt: number;
  payload: unknown;
};

const INTERVENTION_SUMMARY_TTL_MS = Number(
  process.env.INTERVENTION_SUMMARY_TTL_MS || 30_000
);
const MAX_INTERVENTION_SUMMARY_ENTRIES = Number(
  process.env.INTERVENTION_SUMMARY_MAX_ENTRIES || 500
);

const interventionSummarySnapshotCache = new Map<
  string,
  InterventionSummarySnapshotEntry
>();

function buildInterventionSummarySnapshotKey(input: {
  kind: "class_overview" | "assignment_results";
  userId: string;
  entityId: string;
}) {
  return `${input.kind}:${input.userId}:${input.entityId}`;
}

function pruneInterventionSummarySnapshotCache(now = Date.now()) {
  for (const [key, entry] of interventionSummarySnapshotCache.entries()) {
    if (entry.expiresAt <= now) {
      interventionSummarySnapshotCache.delete(key);
    }
  }
  while (interventionSummarySnapshotCache.size > MAX_INTERVENTION_SUMMARY_ENTRIES) {
    const oldestKey = interventionSummarySnapshotCache.keys().next().value;
    if (!oldestKey) break;
    interventionSummarySnapshotCache.delete(oldestKey);
  }
}

function clonePayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}

export function getInterventionSummarySnapshot<T>(input: {
  kind: "class_overview" | "assignment_results";
  userId: string;
  entityId: string;
}) {
  const now = Date.now();
  pruneInterventionSummarySnapshotCache(now);
  const key = buildInterventionSummarySnapshotKey(input);
  const entry = interventionSummarySnapshotCache.get(key);
  if (!entry || entry.expiresAt <= now) {
    if (entry) interventionSummarySnapshotCache.delete(key);
    return null;
  }
  return clonePayload(entry.payload as T);
}

export function setInterventionSummarySnapshot<T>(input: {
  kind: "class_overview" | "assignment_results";
  userId: string;
  entityId: string;
  payload: T;
}) {
  pruneInterventionSummarySnapshotCache();
  interventionSummarySnapshotCache.set(buildInterventionSummarySnapshotKey(input), {
    expiresAt: Date.now() + INTERVENTION_SUMMARY_TTL_MS,
    payload: clonePayload(input.payload),
  });
}

export function invalidateInterventionSummarySnapshots(userId: string) {
  for (const key of interventionSummarySnapshotCache.keys()) {
    if (key.includes(`:${userId}:`)) {
      interventionSummarySnapshotCache.delete(key);
    }
  }
}
