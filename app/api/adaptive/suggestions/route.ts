import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import {
  buildPromptProfile,
  buildQuizSuggestionsFromHistory,
} from "@/lib/adaptive-personalization";

function extractHistoryFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { topic: "", keywords: [] as string[] };
  }
  const meta = metadata as Record<string, unknown>;
  const topic = typeof meta.promptTopic === "string" ? meta.promptTopic.trim() : "";
  const keywords = Array.isArray(meta.promptKeywords)
    ? meta.promptKeywords.filter((item): item is string => typeof item === "string")
    : [];
  return { topic, keywords };
}

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

    const feature = (req.nextUrl.searchParams.get("feature") || "quiz").toLowerCase();
    if (feature !== "quiz") {
      return NextResponse.json({
        requestId,
        feature,
        suggestions: [],
        engine: "history_v1",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionPlan: true, adaptiveLearning: true },
    });
    if (!user) return apiError(404, "User not found", requestId);
    const isPremiumAdaptiveEnabled =
      user.subscriptionPlan === "premium" && user.adaptiveLearning === true;
    if (!isPremiumAdaptiveEnabled) {
      return apiError(
        403,
        "Adaptive suggestions are available for Premium users with adaptive learning enabled.",
        requestId
      );
    }

    const [eventRows, quizRows] = await Promise.all([
      prisma.generationEvent.findMany({
        where: {
          userId: user.id,
          eventType: "quiz_generated",
          status: "success",
          feature: "quiz",
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { metadata: true },
      }),
      prisma.quiz.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { title: true },
      }),
    ]);

    const topics: string[] = [];
    const keywords: string[] = [];

    for (const row of eventRows) {
      const parsed = extractHistoryFromMetadata(row.metadata);
      if (parsed.topic) topics.push(parsed.topic);
      if (parsed.keywords.length > 0) keywords.push(...parsed.keywords);
    }

    if (topics.length === 0) {
      for (const quiz of quizRows) {
        const profile = buildPromptProfile(quiz.title || "");
        if (profile.topic) topics.push(profile.topic);
        if (profile.keywords.length > 0) keywords.push(...profile.keywords);
      }
    }

    const suggestions = buildQuizSuggestionsFromHistory({
      topics,
      keywords,
      limit: 6,
    });

    return NextResponse.json({
      requestId,
      feature,
      suggestions,
      engine: "history_v1",
      hasHistory: topics.length > 0 || keywords.length > 0,
    });
  } catch (err: any) {
    logApiError(requestId, "adaptive-suggestions", err);
    return apiError(500, err?.message || "Internal server error", requestId);
  }
}
