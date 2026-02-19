import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      subscriptionPlan: true,
      quizUsage: true,
      lastQuizAt: true,
      quizAdResetCount: true,
      quizAdResetWindowAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [quizCount, lessonPlanCount, todayQuizCount, todayLessonPlanCount, recentQuizzes, recentPlans] = await Promise.all([
    prisma.quiz.count({ where: { userId: user.id } }),
    prisma.lessonPlan.count({ where: { userId: user.id } }),
    prisma.quiz.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.lessonPlan.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.quiz.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.lessonPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, subject: true, createdAt: true },
    }),
  ]);

  const latestQuizAt = recentQuizzes[0]?.createdAt ? new Date(recentQuizzes[0].createdAt) : null;
  const latestLessonAt = recentPlans[0]?.createdAt ? new Date(recentPlans[0].createdAt) : null;
  const lastActivityAt =
    latestQuizAt && latestLessonAt
      ? latestQuizAt > latestLessonAt
        ? latestQuizAt
        : latestLessonAt
      : latestQuizAt || latestLessonAt;

  const AD_RESET_LIMIT = 5;
  const adResetRemaining = Math.max(AD_RESET_LIMIT - (user.quizAdResetCount ?? 0), 0);

  return NextResponse.json({
    subscriptionPlan: user.subscriptionPlan || "free",
    quizUsage: user.quizUsage,
    lastQuizAt: user.lastQuizAt,
    adResetRemaining,
    lastActivityAt,
    quizCount,
    lessonPlanCount,
    todayQuizCount,
    todayLessonPlanCount,
    recentQuizzes,
    recentPlans,
  });
}
