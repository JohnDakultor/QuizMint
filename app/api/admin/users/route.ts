import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminSession } from "@/lib/admin-auth";

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

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, freeUsers, proUsers, premiumUsers, newUsers, users, latestQuizUsers, latestLessonUsers] = await Promise.all([
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
  ]);

  return NextResponse.json({
    summary: {
      totalUsers,
      paidUsers: proUsers + premiumUsers,
      freeUsers,
      proUsers,
      premiumUsers,
      newUsersLast7Days: newUsers,
    },
    users,
    latestActivity: {
      quiz: latestQuizUsers,
      lessonPlan: latestLessonUsers,
    },
  });
}
