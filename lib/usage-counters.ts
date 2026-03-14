import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export const LESSON_PLAN_FREE_LIMIT = 3;
export const LESSON_PLAN_RESET_HOURS = 3;

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function hydrateLessonPlanUsageWindow(input: {
  userId: string;
  plan: string;
  isFree: boolean;
  debug?: boolean;
}) {
  if ((input.plan === "pro" || input.plan === "premium")) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { lessonPlanUsage: 0, lastLessonPlanAt: null },
    }).catch(() => undefined);
  }

  const usageRows = await prisma.$queryRaw<
    Array<{ lessonPlanUsage: number | null; secondsUntilReset: number | null }>
  >`
    SELECT
      COALESCE("lessonPlanUsage", 0) AS "lessonPlanUsage",
      CASE
        WHEN "lastLessonPlanAt" IS NULL THEN NULL
        ELSE CEIL(EXTRACT(EPOCH FROM (("lastLessonPlanAt" + INTERVAL '3 hours') - NOW())))
      END::int AS "secondsUntilReset"
    FROM "User"
    WHERE id = ${input.userId}
    LIMIT 1
  `;

  let currentLessonPlanUsage = Number(usageRows?.[0]?.lessonPlanUsage || 0);
  let secondsUntilReset = toInt(usageRows?.[0]?.secondsUntilReset);

  if (
    input.isFree &&
    currentLessonPlanUsage >= LESSON_PLAN_FREE_LIMIT &&
    secondsUntilReset !== null &&
    secondsUntilReset <= 0
  ) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { lessonPlanUsage: 0, lastLessonPlanAt: null },
    });
    currentLessonPlanUsage = 0;
    secondsUntilReset = null;
  }

  if (
    input.isFree &&
    currentLessonPlanUsage >= LESSON_PLAN_FREE_LIMIT &&
    secondsUntilReset === null
  ) {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "lastLessonPlanAt" = NOW()
      WHERE id = ${input.userId}
    `;
    secondsUntilReset = LESSON_PLAN_RESET_HOURS * 60 * 60;
  }

  if (input.debug) {
    log.info("lesson_plan_usage_window", {
      userId: input.userId,
      plan: input.plan,
      isFree: input.isFree,
      currentLessonPlanUsage,
      secondsUntilReset,
    });
  }

  return {
    currentLessonPlanUsage,
    freeResetInSeconds:
      secondsUntilReset === null ? null : Math.max(secondsUntilReset, 0),
  };
}

export async function incrementLessonPlanUsageAtomic(input: {
  userId: string;
  isFree: boolean;
}) {
  if (!input.isFree) {
    return { ok: true, nextUsage: 0, resetInSeconds: null };
  }

  const updatedRows = await prisma.$queryRaw<Array<{ lessonPlanUsage: number | null }>>`
    UPDATE "User"
    SET
      "lessonPlanUsage" = CASE
        WHEN "lastLessonPlanAt" IS NULL OR "lastLessonPlanAt" <= (NOW() - INTERVAL '3 hours') THEN 1
        ELSE COALESCE("lessonPlanUsage", 0) + 1
      END,
      "lastLessonPlanAt" = NOW()
    WHERE id = ${input.userId}
      AND (
        "lastLessonPlanAt" IS NULL
        OR "lastLessonPlanAt" <= (NOW() - INTERVAL '3 hours')
        OR COALESCE("lessonPlanUsage", 0) < ${LESSON_PLAN_FREE_LIMIT}
      )
    RETURNING COALESCE("lessonPlanUsage", 0) AS "lessonPlanUsage"
  `;

  if (!updatedRows[0]) {
    const resetRows = await prisma.$queryRaw<Array<{ secondsUntilReset: number | null }>>`
      SELECT
        CASE
          WHEN "lastLessonPlanAt" IS NULL THEN ${LESSON_PLAN_RESET_HOURS * 60 * 60}
          ELSE CEIL(EXTRACT(EPOCH FROM (("lastLessonPlanAt" + INTERVAL '3 hours') - NOW())))
        END::int AS "secondsUntilReset"
      FROM "User"
      WHERE id = ${input.userId}
      LIMIT 1
    `;
    const resetInSeconds = Math.max(Number(resetRows?.[0]?.secondsUntilReset || 0), 0);
    return { ok: false, nextUsage: null, resetInSeconds };
  }

  return {
    ok: true,
    nextUsage: Number(updatedRows[0].lessonPlanUsage || 0),
    resetInSeconds: null,
  };
}

