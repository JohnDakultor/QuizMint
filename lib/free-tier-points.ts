import { prisma } from "@/lib/prisma";

export const FREE_QUIZ_POINTS_MAX = 100;
export const FREE_QUIZ_RECHARGE_HOURS = 12;
export const PROMPT_QUIZ_POINT_COST = 25;
export const UPLOAD_QUIZ_POINT_COST = 40;
export const FREE_LESSON_PLAN_POINTS_MAX = 100;
export const FREE_LESSON_PLAN_RECHARGE_HOURS = 12;
export const LESSON_PLAN_POINT_COST = 30;
export const LESSON_PLAN_UPLOAD_POINT_COST = 40;

type FreeQuizPlan = string | null | undefined;

export type FreeQuizPointUserState = {
  subscriptionPlan?: FreeQuizPlan;
  freeQuizPoints?: number | null;
  freeQuizPointsMax?: number | null;
  freeQuizPointsRechargeAt?: Date | string | null;
};

export type FreeQuizPointsSnapshot = {
  availablePoints: number;
  maxPoints: number;
  rechargeAt: Date | null;
  rechargeDue: boolean;
  isDepleted: boolean;
};

export type FreeQuizAffordability = FreeQuizPointsSnapshot & {
  requiredPoints: number;
  canAfford: boolean;
};

export type DeductFreeQuizPointsResult = FreeQuizPointsSnapshot & {
  userId: string;
  spentPoints: number;
};

type FreeLessonPlanPlan = string | null | undefined;

export type FreeLessonPlanPointUserState = {
  subscriptionPlan?: FreeLessonPlanPlan;
  freeLessonPlanPoints?: number | null;
  freeLessonPlanPointsMax?: number | null;
  freeLessonPlanPointsRechargeAt?: Date | string | null;
};

export type FreeLessonPlanPointsSnapshot = {
  availablePoints: number;
  maxPoints: number;
  rechargeAt: Date | null;
  rechargeDue: boolean;
  isDepleted: boolean;
};

export type FreeLessonPlanAffordability = FreeLessonPlanPointsSnapshot & {
  requiredPoints: number;
  canAfford: boolean;
};

export type DeductFreeLessonPlanPointsResult = FreeLessonPlanPointsSnapshot & {
  userId: string;
  spentPoints: number;
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeMaxPoints(value: number | null | undefined) {
  return clampInt(value ?? FREE_QUIZ_POINTS_MAX, 1, FREE_QUIZ_POINTS_MAX);
}

function normalizeStoredPoints(
  value: number | null | undefined,
  maxPoints: number
) {
  return clampInt(value ?? maxPoints, 0, maxPoints);
}

export function isFreeQuizPointLimited(plan: FreeQuizPlan) {
  return !plan || plan === "free";
}

export function getFreeQuizPointsConfig() {
  return {
    maxPoints: FREE_QUIZ_POINTS_MAX,
    rechargeHours: FREE_QUIZ_RECHARGE_HOURS,
    promptCost: PROMPT_QUIZ_POINT_COST,
    uploadCost: UPLOAD_QUIZ_POINT_COST,
  };
}

export function getFreeLessonPlanPointsConfig() {
  return {
    maxPoints: FREE_LESSON_PLAN_POINTS_MAX,
    rechargeHours: FREE_LESSON_PLAN_RECHARGE_HOURS,
    generationCost: LESSON_PLAN_POINT_COST,
    uploadCost: LESSON_PLAN_UPLOAD_POINT_COST,
  };
}

export function getQuizGenerationPointCost(input: { hasUploads?: boolean }) {
  return input.hasUploads ? UPLOAD_QUIZ_POINT_COST : PROMPT_QUIZ_POINT_COST;
}

export function isFreeLessonPlanPointLimited(plan: FreeLessonPlanPlan) {
  return !plan || plan === "free";
}

export function getLessonPlanGenerationPointCost(input?: { hasUpload?: boolean }) {
  return input?.hasUpload ? LESSON_PLAN_UPLOAD_POINT_COST : LESSON_PLAN_POINT_COST;
}

export function getNextFreeQuizRechargeAt(now: Date = new Date()) {
  return new Date(
    now.getTime() + FREE_QUIZ_RECHARGE_HOURS * 60 * 60 * 1000
  );
}

export function getNextFreeLessonPlanRechargeAt(now: Date = new Date()) {
  return new Date(
    now.getTime() + FREE_LESSON_PLAN_RECHARGE_HOURS * 60 * 60 * 1000
  );
}

export function getAvailableFreeQuizPoints(
  user: FreeQuizPointUserState,
  now: Date = new Date()
) {
  return getFreeQuizPointsSnapshot(user, now).availablePoints;
}

function normalizeLessonPlanMaxPoints(value: number | null | undefined) {
  return clampInt(value ?? FREE_LESSON_PLAN_POINTS_MAX, 1, FREE_LESSON_PLAN_POINTS_MAX);
}

function normalizeStoredLessonPlanPoints(
  value: number | null | undefined,
  maxPoints: number
) {
  return clampInt(value ?? maxPoints, 0, maxPoints);
}

export function getFreeLessonPlanPointsSnapshot(
  user: FreeLessonPlanPointUserState,
  now: Date = new Date()
): FreeLessonPlanPointsSnapshot {
  const maxPoints = normalizeLessonPlanMaxPoints(user.freeLessonPlanPointsMax);
  const storedPoints = normalizeStoredLessonPlanPoints(
    user.freeLessonPlanPoints,
    maxPoints
  );
  const rechargeAt = normalizeDate(user.freeLessonPlanPointsRechargeAt);
  const rechargeDue = Boolean(rechargeAt && rechargeAt.getTime() <= now.getTime());
  const availablePoints = rechargeDue ? maxPoints : storedPoints;
  const effectiveRechargeAt =
    rechargeDue || availablePoints > 0 ? null : rechargeAt;

  return {
    availablePoints,
    maxPoints,
    rechargeAt: effectiveRechargeAt,
    rechargeDue,
    isDepleted: availablePoints <= 0,
  };
}

export function canAffordLessonPlanGeneration(
  user: FreeLessonPlanPointUserState,
  cost: number,
  now: Date = new Date()
): FreeLessonPlanAffordability {
  const snapshot = getFreeLessonPlanPointsSnapshot(user, now);
  const requiredPoints = clampInt(cost, 0, FREE_LESSON_PLAN_POINTS_MAX);

  return {
    ...snapshot,
    requiredPoints,
    canAfford: snapshot.availablePoints >= requiredPoints,
  };
}

export function buildFreeLessonPlanPointsStatusPayload(
  user: FreeLessonPlanPointUserState,
  cost: number,
  now: Date = new Date()
) {
  const affordability = canAffordLessonPlanGeneration(user, cost, now);
  return {
    remainingPoints: affordability.availablePoints,
    requiredPoints: affordability.requiredPoints,
    maxPoints: affordability.maxPoints,
    nextRechargeAt: affordability.rechargeAt?.toISOString() ?? null,
    rechargeDue: affordability.rechargeDue,
    canAfford: affordability.canAfford,
  };
}

export function getFreeQuizPointsSnapshot(
  user: FreeQuizPointUserState,
  now: Date = new Date()
): FreeQuizPointsSnapshot {
  const maxPoints = normalizeMaxPoints(user.freeQuizPointsMax);
  const storedPoints = normalizeStoredPoints(user.freeQuizPoints, maxPoints);
  const rechargeAt = normalizeDate(user.freeQuizPointsRechargeAt);
  const rechargeDue = Boolean(rechargeAt && rechargeAt.getTime() <= now.getTime());
  const availablePoints = rechargeDue ? maxPoints : storedPoints;
  const effectiveRechargeAt =
    rechargeDue || availablePoints > 0 ? null : rechargeAt;

  return {
    availablePoints,
    maxPoints,
    rechargeAt: effectiveRechargeAt,
    rechargeDue,
    isDepleted: availablePoints <= 0,
  };
}

export function refreshFreeQuizPointsIfDue(
  user: FreeQuizPointUserState,
  now: Date = new Date()
): FreeQuizPointUserState & FreeQuizPointsSnapshot {
  const snapshot = getFreeQuizPointsSnapshot(user, now);
  return {
    ...user,
    freeQuizPoints: snapshot.availablePoints,
    freeQuizPointsMax: snapshot.maxPoints,
    freeQuizPointsRechargeAt: snapshot.rechargeAt,
    ...snapshot,
  };
}

export function canAffordQuizGeneration(
  user: FreeQuizPointUserState,
  cost: number,
  now: Date = new Date()
): FreeQuizAffordability {
  const snapshot = getFreeQuizPointsSnapshot(user, now);
  const requiredPoints = clampInt(cost, 0, FREE_QUIZ_POINTS_MAX);

  return {
    ...snapshot,
    requiredPoints,
    canAfford: snapshot.availablePoints >= requiredPoints,
  };
}

export function buildFreeQuizPointsStatusPayload(
  user: FreeQuizPointUserState,
  cost: number,
  now: Date = new Date()
) {
  const affordability = canAffordQuizGeneration(user, cost, now);
  return {
    remainingPoints: affordability.availablePoints,
    requiredPoints: affordability.requiredPoints,
    maxPoints: affordability.maxPoints,
    nextRechargeAt: affordability.rechargeAt?.toISOString() ?? null,
    rechargeDue: affordability.rechargeDue,
    canAfford: affordability.canAfford,
  };
}

export async function deductFreeQuizPoints(
  userId: string,
  cost: number,
  now: Date = new Date()
): Promise<DeductFreeQuizPointsResult | null> {
  const spentPoints = clampInt(cost, 0, FREE_QUIZ_POINTS_MAX);
  if (spentPoints <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        freeQuizPoints: true,
        freeQuizPointsMax: true,
        freeQuizPointsRechargeAt: true,
      },
    });
    if (!user) return null;
    const snapshot = getFreeQuizPointsSnapshot(user, now);
    return {
      userId: user.id,
      spentPoints: 0,
      ...snapshot,
    };
  }

  const rechargeAt = getNextFreeQuizRechargeAt(now);
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      freeQuizPoints: number;
      freeQuizPointsMax: number;
      freeQuizPointsRechargeAt: Date | null;
    }>
  >`
    UPDATE "User"
    SET
      "freeQuizPointsMax" = GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1),
      "freeQuizPoints" = CASE
        WHEN (
          CASE
            WHEN "freeQuizPointsRechargeAt" IS NOT NULL AND "freeQuizPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeQuizPoints", ${FREE_QUIZ_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            )
          END
        ) - ${spentPoints} <= 0
          THEN 0
        ELSE (
          CASE
            WHEN "freeQuizPointsRechargeAt" IS NOT NULL AND "freeQuizPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeQuizPoints", ${FREE_QUIZ_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            )
          END
        ) - ${spentPoints}
      END,
      "freeQuizPointsRechargeAt" = CASE
        WHEN (
          CASE
            WHEN "freeQuizPointsRechargeAt" IS NOT NULL AND "freeQuizPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeQuizPoints", ${FREE_QUIZ_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            )
          END
        ) - ${spentPoints} <= 0
          THEN ${rechargeAt}
        ELSE NULL
      END,
      "lastActiveAt" = ${now}
    WHERE id = ${userId}
      AND COALESCE("subscriptionPlan", 'free') = 'free'
      AND (
        CASE
          WHEN "freeQuizPointsRechargeAt" IS NOT NULL AND "freeQuizPointsRechargeAt" <= ${now}
            THEN GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
          ELSE LEAST(
            GREATEST(COALESCE("freeQuizPoints", ${FREE_QUIZ_POINTS_MAX}), 0),
            GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
          )
        END
      ) >= ${spentPoints}
    RETURNING
      id,
      "freeQuizPoints",
      "freeQuizPointsMax",
      "freeQuizPointsRechargeAt"
  `;

  const row = rows[0];
  if (!row) return null;

  const snapshot = getFreeQuizPointsSnapshot(
    {
      freeQuizPoints: row.freeQuizPoints,
      freeQuizPointsMax: row.freeQuizPointsMax,
      freeQuizPointsRechargeAt: row.freeQuizPointsRechargeAt,
    },
    now
  );

  return {
    userId: row.id,
    spentPoints,
    ...snapshot,
  };
}

export async function restoreFreeQuizPoints(
  userId: string,
  points: number,
  now: Date = new Date()
): Promise<FreeQuizPointsSnapshot | null> {
  const restorePoints = clampInt(points, 0, FREE_QUIZ_POINTS_MAX);
  if (restorePoints <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        freeQuizPoints: true,
        freeQuizPointsMax: true,
        freeQuizPointsRechargeAt: true,
      },
    });
    return user ? getFreeQuizPointsSnapshot(user, now) : null;
  }

  const rows = await prisma.$queryRaw<
    Array<{
      freeQuizPoints: number;
      freeQuizPointsMax: number;
      freeQuizPointsRechargeAt: Date | null;
    }>
  >`
    UPDATE "User"
    SET
      "freeQuizPointsMax" = GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1),
      "freeQuizPoints" = LEAST(
        GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1),
        (
          CASE
            WHEN "freeQuizPointsRechargeAt" IS NOT NULL AND "freeQuizPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeQuizPoints", ${FREE_QUIZ_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeQuizPointsMax", ${FREE_QUIZ_POINTS_MAX}), 1)
            )
          END
        ) + ${restorePoints}
      ),
      "freeQuizPointsRechargeAt" = NULL,
      "lastActiveAt" = ${now}
    WHERE id = ${userId}
      AND COALESCE("subscriptionPlan", 'free') = 'free'
    RETURNING
      "freeQuizPoints",
      "freeQuizPointsMax",
      "freeQuizPointsRechargeAt"
  `;

  const row = rows[0];
  return row ? getFreeQuizPointsSnapshot(row, now) : null;
}

export async function deductFreeLessonPlanPoints(
  userId: string,
  cost: number,
  now: Date = new Date()
): Promise<DeductFreeLessonPlanPointsResult | null> {
  const spentPoints = clampInt(cost, 0, FREE_LESSON_PLAN_POINTS_MAX);
  if (spentPoints <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        freeLessonPlanPoints: true,
        freeLessonPlanPointsMax: true,
        freeLessonPlanPointsRechargeAt: true,
      },
    });
    if (!user) return null;
    const snapshot = getFreeLessonPlanPointsSnapshot(user, now);
    return {
      userId: user.id,
      spentPoints: 0,
      ...snapshot,
    };
  }

  const rechargeAt = getNextFreeLessonPlanRechargeAt(now);
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      freeLessonPlanPoints: number;
      freeLessonPlanPointsMax: number;
      freeLessonPlanPointsRechargeAt: Date | null;
    }>
  >`
    UPDATE "User"
    SET
      "freeLessonPlanPointsMax" = GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1),
      "freeLessonPlanPoints" = CASE
        WHEN (
          CASE
            WHEN "freeLessonPlanPointsRechargeAt" IS NOT NULL AND "freeLessonPlanPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeLessonPlanPoints", ${FREE_LESSON_PLAN_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            )
          END
        ) - ${spentPoints} <= 0
          THEN 0
        ELSE (
          CASE
            WHEN "freeLessonPlanPointsRechargeAt" IS NOT NULL AND "freeLessonPlanPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeLessonPlanPoints", ${FREE_LESSON_PLAN_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            )
          END
        ) - ${spentPoints}
      END,
      "freeLessonPlanPointsRechargeAt" = CASE
        WHEN (
          CASE
            WHEN "freeLessonPlanPointsRechargeAt" IS NOT NULL AND "freeLessonPlanPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeLessonPlanPoints", ${FREE_LESSON_PLAN_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            )
          END
        ) - ${spentPoints} <= 0
          THEN ${rechargeAt}
        ELSE NULL
      END,
      "lastActiveAt" = ${now}
    WHERE id = ${userId}
      AND COALESCE("subscriptionPlan", 'free') = 'free'
      AND (
        CASE
          WHEN "freeLessonPlanPointsRechargeAt" IS NOT NULL AND "freeLessonPlanPointsRechargeAt" <= ${now}
            THEN GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
          ELSE LEAST(
            GREATEST(COALESCE("freeLessonPlanPoints", ${FREE_LESSON_PLAN_POINTS_MAX}), 0),
            GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
          )
        END
      ) >= ${spentPoints}
    RETURNING
      id,
      "freeLessonPlanPoints",
      "freeLessonPlanPointsMax",
      "freeLessonPlanPointsRechargeAt"
  `;

  const row = rows[0];
  if (!row) return null;

  const snapshot = getFreeLessonPlanPointsSnapshot(
    {
      freeLessonPlanPoints: row.freeLessonPlanPoints,
      freeLessonPlanPointsMax: row.freeLessonPlanPointsMax,
      freeLessonPlanPointsRechargeAt: row.freeLessonPlanPointsRechargeAt,
    },
    now
  );

  return {
    userId: row.id,
    spentPoints,
    ...snapshot,
  };
}

export async function restoreFreeLessonPlanPoints(
  userId: string,
  points: number,
  now: Date = new Date()
): Promise<FreeLessonPlanPointsSnapshot | null> {
  const restorePoints = clampInt(points, 0, FREE_LESSON_PLAN_POINTS_MAX);
  if (restorePoints <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        freeLessonPlanPoints: true,
        freeLessonPlanPointsMax: true,
        freeLessonPlanPointsRechargeAt: true,
      },
    });
    return user ? getFreeLessonPlanPointsSnapshot(user, now) : null;
  }

  const rows = await prisma.$queryRaw<
    Array<{
      freeLessonPlanPoints: number;
      freeLessonPlanPointsMax: number;
      freeLessonPlanPointsRechargeAt: Date | null;
    }>
  >`
    UPDATE "User"
    SET
      "freeLessonPlanPointsMax" = GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1),
      "freeLessonPlanPoints" = LEAST(
        GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1),
        (
          CASE
            WHEN "freeLessonPlanPointsRechargeAt" IS NOT NULL AND "freeLessonPlanPointsRechargeAt" <= ${now}
              THEN GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            ELSE LEAST(
              GREATEST(COALESCE("freeLessonPlanPoints", ${FREE_LESSON_PLAN_POINTS_MAX}), 0),
              GREATEST(COALESCE("freeLessonPlanPointsMax", ${FREE_LESSON_PLAN_POINTS_MAX}), 1)
            )
          END
        ) + ${restorePoints}
      ),
      "freeLessonPlanPointsRechargeAt" = NULL,
      "lastActiveAt" = ${now}
    WHERE id = ${userId}
      AND COALESCE("subscriptionPlan", 'free') = 'free'
    RETURNING
      "freeLessonPlanPoints",
      "freeLessonPlanPointsMax",
      "freeLessonPlanPointsRechargeAt"
  `;

  const row = rows[0];
  return row ? getFreeLessonPlanPointsSnapshot(row, now) : null;
}
