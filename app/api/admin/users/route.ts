import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminSession } from "@/lib/admin-auth";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = Math.min(2, local.length);
  const maskedLocal = `${local.slice(0, visible)}${"*".repeat(Math.max(0, local.length - visible))}`;
  return `${maskedLocal}@${domain}`;
}

function getProviderFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const meta = metadata as Record<string, unknown>;
  const provider = meta.provider;
  if (typeof provider === "string" && provider.trim().length > 0) {
    return provider.trim();
  }
  return null;
}

export async function GET(req: Request) {
  const auth = await assertAdminSession();
  if (!auth.ok) {
    const status =
      auth.reason === "misconfigured"
          ? 500
          : auth.reason === "challenge"
            ? 428
            : 403;
    return NextResponse.json({ error: auth.reason }, { status });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
  const showSensitive = searchParams.get("showSensitive") === "true";

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, freeUsers, proUsers, premiumUsers, newUsers, users, latestQuizUsers, latestLessonUsers, latestSignups, activeUsersLast7DaysRows, generationEvents] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { OR: [{ subscriptionPlan: null }, { subscriptionPlan: "free" }] } }),
    prisma.user.count({ where: { subscriptionPlan: "pro" } }),
    prisma.user.count({ where: { subscriptionPlan: "premium" } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        quizUsage: true,
        lessonPlanUsage: true,
        lastQuizAt: true,
        lastLessonPlanAt: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { lastQuizAt: { not: null } },
      orderBy: { lastQuizAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        lastQuizAt: true,
      },
    }),
    prisma.user.findMany({
      where: { lastLessonPlanAt: { not: null } },
      orderBy: { lastLessonPlanAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        lastLessonPlanAt: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "userId")::int AS count
      FROM "GenerationEvent"
      WHERE "userId" IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
    `,
    prisma.generationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        userId: true,
        eventType: true,
        feature: true,
        status: true,
        plan: true,
        latencyMs: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);
  const activeUsersLast7Days = activeUsersLast7DaysRows[0]?.count ?? 0;

  const sanitizeEmail = (email: string) => (showSensitive ? email : maskEmail(email));

  const safeUsers = users.map((u) => ({
    ...u,
    email: sanitizeEmail(u.email),
  }));

  const safeLatestQuizUsers = latestQuizUsers.map((u) => ({
    ...u,
    email: sanitizeEmail(u.email),
  }));

  const safeLatestLessonUsers = latestLessonUsers.map((u) => ({
    ...u,
    email: sanitizeEmail(u.email),
  }));

  const safeLatestSignups = latestSignups.map((u) => ({
    ...u,
    email: sanitizeEmail(u.email),
  }));

  const eventUserIds = Array.from(
    new Set(generationEvents.map((event) => event.userId).filter((id): id is string => Boolean(id)))
  );

  const eventUsers = eventUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: eventUserIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailByUserId = new Map(eventUsers.map((u) => [u.id, u.email]));

  const safeGenerationEvents = generationEvents.map((event) => {
    const rawEmail = event.userId ? emailByUserId.get(event.userId) : null;
    const provider = getProviderFromMetadata(event.metadata);
    return {
      ...event,
      email: rawEmail ? sanitizeEmail(rawEmail) : null,
      provider,
    };
  });

  return NextResponse.json({
    summary: {
      totalUsers,
      paidUsers: proUsers + premiumUsers,
      freeUsers,
      proUsers,
      premiumUsers,
      newUsersLast7Days: newUsers,
      activeUsersLast7Days,
    },
    users: safeUsers,
    latestActivity: {
      quiz: safeLatestQuizUsers,
      lessonPlan: safeLatestLessonUsers,
    },
    latestSignups: safeLatestSignups,
    generationEvents: safeGenerationEvents,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
