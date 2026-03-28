import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { createQuizShareToken } from "@/lib/quiz-share";

export async function GET(req: NextRequest) {
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
      select: {
        id: true,
        title: true,
        createdAt: true,
        shareSettings: {
          select: {
            isOpen: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.lessonPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, subject: true, createdAt: true },
    }),
  ]);

  const recentQuizIds = recentQuizzes.map((quiz) => quiz.id);
  const shareEvents = recentQuizIds.length
    ? await prisma.generationEvent.findMany({
        where: {
          userId: user.id,
          eventType: "quiz_generated",
          status: "success",
          feature: "quiz_share_link",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          metadata: true,
          createdAt: true,
        },
      })
    : [];

  const latestShareUrlByQuizId = new Map<number, string>();
  for (const event of shareEvents) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const quizId =
      metadata && typeof metadata.quizId === "number"
        ? metadata.quizId
        : metadata && typeof metadata.quizId === "string"
        ? Number(metadata.quizId)
        : null;
    const shareUrl = metadata && typeof metadata.shareUrl === "string" ? metadata.shareUrl : null;
    if (!quizId || !shareUrl || latestShareUrlByQuizId.has(quizId)) continue;
    latestShareUrlByQuizId.set(quizId, shareUrl);
  }

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

  const recentQuizzesWithLinks = recentQuizzes.map((quiz) => {
    const expiresAt = quiz.shareSettings?.expiresAt ? new Date(quiz.shareSettings.expiresAt) : null;
    const ttlSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;
    const fallbackShareUrl =
      quiz.shareSettings?.isOpen && expiresAt && ttlSeconds > 0
        ? `${req.nextUrl.origin}/quiz/${encodeURIComponent(createQuizShareToken(quiz.id, ttlSeconds))}`
        : null;
    const persistedShareUrl =
      quiz.shareSettings?.isOpen && expiresAt && ttlSeconds > 0
        ? latestShareUrlByQuizId.get(quiz.id) || null
        : null;
    return {
      ...quiz,
      shareUrl: persistedShareUrl || fallbackShareUrl,
    };
  });

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
    recentQuizzes: recentQuizzesWithLinks,
    recentPlans,
  });
}
