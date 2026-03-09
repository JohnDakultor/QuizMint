import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

type SimpleQuiz = {
  id: number;
  title: string;
  createdAt: string;
  difficulty: string;
  adaptiveLearning: boolean;
  questions: { id: number; question: string; options: string[] }[];
};

type SimpleLessonPlan = {
  id: string;
  title: string;
  createdAt: string;
  subject: string;
  grade: string;
  days: number;
  minutesPerDay: number;
};

// detect question type helper
function detectQuestionType(text: string, options: string[] = []) {
  if (
    options.length === 2 &&
    options.some((o) => o.toLowerCase() === "true") &&
    options.some((o) => o.toLowerCase() === "false")
  ) {
    return "True/False";
  }
  if (options.length >= 3) return "Multiple Choice";
  if (!text) return "Other";
  const lower = text.toLowerCase();
  if (/\btrue\b.*\bfalse\b|\bfalse\b.*\btrue\b/.test(lower)) return "True/False";
  if (/_+|___/.test(text)) return "Fill-in-blank";
  if (/[A-D]\)|\boption\b|\bchoices\b/.test(text)) return "Multiple Choice";
  if (/\bshort answer\b|\bexplain\b|\bwhy\b|\bhow\b/.test(lower)) return "Short Answer";
  return "Other";
}

function extractTerms(value: string, max = 4) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, max);
}

// OpenRouter fetch helper
async function callOpenRouterForInsights(payload: any) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000); // 20s timeout

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenRouter error:", res.status, text);
      return null;
    }

    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("OpenRouter fetch failed:", err);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "quiz").toLowerCase();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select:
        mode === "lesson"
          ? {
              id: true,
              subscriptionPlan: true,
              lessonPlans: {
                orderBy: { createdAt: "desc" },
                take: 200,
                select: {
                  id: true,
                  title: true,
                  subject: true,
                  grade: true,
                  days: true,
                  minutesPerDay: true,
                  createdAt: true,
                },
              },
            }
          : {
              id: true,
              subscriptionPlan: true,
              aiDifficulty: true,
              quizzes: {
                orderBy: { createdAt: "desc" },
                take: 200,
                select: {
                  id: true,
                  title: true,
                  createdAt: true,
                  questions: { select: { id: true, question: true, options: true, hint: true } },
                },
              },
            },
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.subscriptionPlan !== "premium") {
      return NextResponse.json(
        { error: "Premium required for analytics" },
        { status: 403 }
      );
    }

    if (mode === "lesson") {
      const plans = (user as any).lessonPlans ?? [];
      const allPlans: SimpleLessonPlan[] = plans.map((p: any) => ({
        id: p.id,
        title: p.title,
        createdAt: p.createdAt.toISOString(),
        subject: p.subject || "Unknown",
        grade: p.grade || "Unknown",
        days: Math.max(Number(p.days || 1), 1),
        minutesPerDay: Math.max(Number(p.minutesPerDay || 40), 1),
      }));

      const totalPlans = allPlans.length;
      const multiDayPlans = allPlans.filter((p) => p.days > 1).length;

      const subjectCounts: Record<string, number> = {};
      const gradeCounts: Record<string, number> = {};
      allPlans.forEach((p) => {
        subjectCounts[p.subject] = (subjectCounts[p.subject] || 0) + 1;
        gradeCounts[p.grade] = (gradeCounts[p.grade] || 0) + 1;
      });

      const daysDistribution = allPlans.map((p) => ({
        title: p.title,
        questions: p.days,
      }));

      const dayCounts = daysDistribution.map((d) => d.questions);
      const avgDays =
        dayCounts.length > 0
          ? Math.round(dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length)
          : 0;
      const medianDays =
        dayCounts.length > 0
          ? (() => {
              const s = [...dayCounts].sort((a, b) => a - b);
              const mid = Math.floor(s.length / 2);
              return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
            })()
          : 0;

      const avgMinutesPerDay =
        allPlans.length > 0
          ? Math.round(
              allPlans.reduce((sum, p) => sum + (p.minutesPerDay || 0), 0) / allPlans.length
            )
          : 0;

      const topPlans = [...allPlans]
        .sort((a, b) => b.days - a.days || b.minutesPerDay - a.minutesPerDay)
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          title: p.title,
          questions: new Array(p.days).fill(null),
        }));

      const radarProfile = [
        { metric: "Multi-Day Plans", score: totalPlans ? (multiDayPlans / totalPlans) * 10 : 0 },
        { metric: "Avg Days", score: avgDays },
        { metric: "Avg Minutes/Day", score: Math.min(avgMinutesPerDay / 10, 10) },
        { metric: "Subject Diversity", score: Object.keys(subjectCounts).length },
      ];

      const trendData: { date: string; quizzes: number }[] = [];
      const now = new Date();
      const dayMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (29 - i));
        const key = d.toLocaleDateString();
        dayMap.set(key, 0);
      }
      allPlans.forEach((p) => {
        const key = new Date(p.createdAt).toLocaleDateString();
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
      });
      dayMap.forEach((count, date) => trendData.push({ date, quizzes: count }));

      const insightPayload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an analytics assistant that summarizes lesson-plan creation behavior and gives actionable recommendations in formal language.",
          },
          {
            role: "user",
            content: `Analyze this lesson-plan analytics snapshot and provide:
1) Key Patterns (2-4 points)
2) Weaknesses or Gaps (2-3 points)
3) Actionable Recommendations (3 points)

Data:
${JSON.stringify(
  {
    totalPlans,
    multiDayPlans,
    avgDays,
    medianDays,
    avgMinutesPerDay,
    subjectCounts,
    gradeCounts,
    trendLast30: trendData,
  },
  null,
  2
)}`,
          },
        ],
      };

      const insights =
        (await callOpenRouterForInsights(insightPayload)) ||
        "No AI insights are available at this time.";

      return NextResponse.json({
        mode: "lesson",
        totalQuizzes: totalPlans,
        adaptiveQuizzes: multiDayPlans,
        difficultyDistribution: Object.entries(subjectCounts).map(([name, value]) => ({
          name,
          value,
        })),
        trendData,
        questionDistribution: daysDistribution,
        questionTypeData: Object.entries(gradeCounts).map(([type, count]) => ({
          type,
          count,
        })),
        avgQuestions: avgDays,
        medianQuestions: medianDays,
        allQuizzes: allPlans,
        topQuizzes: topPlans,
        radarProfile,
        insights,
      });
    }

    const difficultyRows = await prisma.$queryRaw<
      Array<{ quizId: number; difficulty: string | null }>
    >`
      SELECT "quizId", "difficulty"
      FROM (
        SELECT
          ("metadata"->>'quizId')::int AS "quizId",
          COALESCE("metadata"->>'difficulty', "metadata"->>'effectiveDifficulty') AS "difficulty",
          ROW_NUMBER() OVER (
            PARTITION BY ("metadata"->>'quizId')
            ORDER BY "createdAt" DESC
          ) AS rn
        FROM "GenerationEvent"
        WHERE "userId" = ${user.id}
          AND "eventType" = 'quiz_generated'
          AND "status" = 'success'
          AND ("feature" = 'quiz' OR "feature" = 'quiz_file_upload')
          AND ("metadata"->>'quizId') IS NOT NULL
      ) ranked
      WHERE rn = 1
    `;
    const difficultyByQuizId = new Map<number, string>();
    for (const row of difficultyRows) {
      const d = (row.difficulty || "").toLowerCase().trim();
      if (row.quizId && d) difficultyByQuizId.set(row.quizId, d);
    }

    const allQuizzes: SimpleQuiz[] = (user as any).quizzes.map((q: { id: number; title: string; createdAt: Date; questions: { id: number; question: string; options: string[]; hint: string | undefined; explanation: string | undefined; }[]; }) => ({
      id: q.id,
      title: q.title,
      createdAt: q.createdAt.toISOString(),
      difficulty: difficultyByQuizId.get(q.id) || "unknown",
      adaptiveLearning: q.questions.some((qq: { hint: string | undefined; }) => !!qq.hint),
      questions: q.questions.map((qq: { id: number | undefined; question: string | undefined; options: string[] | undefined; }) => ({
        id: qq.id,
        question: qq.question,
        options: Array.isArray(qq.options) ? qq.options : [],
      })),
    }));

    const totalQuizzes = allQuizzes.length;
    const adaptiveQuizzes = allQuizzes.filter((q) => q.adaptiveLearning).length;

    const difficultyCounts = { easy: 0, medium: 0, hard: 0, unknown: 0 };
    allQuizzes.forEach((q) => {
      const d = q.difficulty.toLowerCase();
      if (d === "easy" || d === "medium" || d === "hard") {
        difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;
      } else {
        difficultyCounts.unknown += 1;
      }
    });

    const questionTypeCounts: Record<string, number> = {};
    allQuizzes.forEach((q) => {
      q.questions.forEach((qq) => {
        const type = detectQuestionType(qq.question, qq.options);
        questionTypeCounts[type] = (questionTypeCounts[type] || 0) + 1;
      });
    });

    const questionDistribution = allQuizzes.map((q) => ({
      title: q.title,
      questions: q.questions.length,
    }));

    const questionCounts = questionDistribution.map((d) => d.questions);
    const avgQuestions =
      questionCounts.length > 0
        ? Math.round(questionCounts.reduce((a, b) => a + b, 0) / questionCounts.length)
        : 0;
    const medianQuestions =
      questionCounts.length > 0
        ? (() => {
            const s = [...questionCounts].sort((a, b) => a - b);
            const mid = Math.floor(s.length / 2);
            return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
          })()
        : 0;

    // Top 10 quizzes (most questions)
    const topQuizzes = allQuizzes
      .sort((a, b) => b.questions.length - a.questions.length)
      .slice(0, 10);

    // Radar profile metrics
    const radarProfile = [
      {
        metric: "Adaptive Learning",
        score: totalQuizzes ? (adaptiveQuizzes / totalQuizzes) * 10 : 0,
      },
      { metric: "Avg Questions", score: avgQuestions },
      { metric: "Median Questions", score: medianQuestions },
      { metric: "Question Type Diversity", score: Object.keys(questionTypeCounts).length },
    ];

    // Trend last 30 days
    const trendData: { date: string; quizzes: number }[] = [];
    const now = new Date();
    const dayMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (29 - i));
      const key = d.toLocaleDateString();
      dayMap.set(key, 0);
    }
    allQuizzes.forEach((q) => {
      const key = new Date(q.createdAt).toLocaleDateString();
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });
    dayMap.forEach((count, date) => trendData.push({ date, quizzes: count }));

    // AI Insights (formalized text)
    const systemPrompt =
      "You are an analytics assistant that summarizes quiz creation behavior and provides actionable recommendations in formal language suitable for end users.";

    const fullDataSnapshot = {
      totalQuizzes,
      adaptiveQuizzes,
      difficultyCounts,
      avgQuestions,
      medianQuestions,
      questionTypeCounts,
      trendLast30: trendData,
    };

    const userPrompt = `
Please analyze the following user quiz analytics and provide:
1) Key Patterns (2-4 points)
2) Weaknesses or Gaps (2-3 points)
3) Actionable Recommendations (3 points)

Format the output in formal language suitable for users.

Data snapshot:
${JSON.stringify(fullDataSnapshot, null, 2)}
`;

    const attemptRows = await prisma.$queryRaw<
      Array<{ scorePercent: number; result: unknown; title: string }>
    >`
      SELECT s."scorePercent", s."result", q."title"
      FROM "StudentQuizAttempt" s
      JOIN "Quiz" q ON q."id" = s."quizId"
      WHERE q."userId" = ${user.id}
      ORDER BY s."submittedAt" DESC
      LIMIT 200
    `;

    const lowScoreTopicCount: Record<string, number> = {};
    const missedTermCount: Record<string, number> = {};
    for (const row of attemptRows) {
      if ((row.scorePercent ?? 0) < 60) {
        const title = (row.title || "").trim() || "Untitled quiz";
        lowScoreTopicCount[title] = (lowScoreTopicCount[title] || 0) + 1;
      }
      const details = Array.isArray(row.result)
        ? (row.result as Array<Record<string, unknown>>)
        : [];
      for (const d of details) {
        if (d?.correct === false) {
          const selected = typeof d.selected === "string" ? d.selected : "";
          for (const term of extractTerms(selected, 4)) {
            missedTermCount[term] = (missedTermCount[term] || 0) + 1;
          }
        }
      }
    }

    const adaptiveInsights = {
      weakTopics: Object.entries(lowScoreTopicCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([title, count]) => ({ title, count })),
      missedTerms: Object.entries(missedTermCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([term, count]) => ({ term, count })),
      attemptCount: attemptRows.length,
    };

    const attemptQuestionTypeCounts: Record<string, number> = {};
    for (const row of attemptRows) {
      const details = Array.isArray(row.result)
        ? (row.result as Array<Record<string, unknown>>)
        : [];
      for (const d of details) {
        const qt = typeof d.questionType === "string" ? d.questionType : "";
        const normalized =
          qt === "true_false"
            ? "True/False"
            : qt === "fill_blank"
              ? "Fill-in-blank"
              : qt === "mcq"
                ? "Multiple Choice"
                : qt === "short_answer"
                  ? "Short Answer"
                  : "";
        if (normalized) {
          attemptQuestionTypeCounts[normalized] =
            (attemptQuestionTypeCounts[normalized] || 0) + 1;
        }
      }
    }
    const finalQuestionTypeCounts =
      Object.keys(attemptQuestionTypeCounts).length > 0
        ? attemptQuestionTypeCounts
        : questionTypeCounts;

    const adaptiveContext =
      adaptiveInsights.attemptCount > 0
        ? `\nAdaptive outcome signals:\n${JSON.stringify(adaptiveInsights, null, 2)}`
        : "\nAdaptive outcome signals: none available.";

    const aiPayload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${userPrompt}\n${adaptiveContext}` },
      ],
    };

    let insights =
      (await callOpenRouterForInsights(aiPayload)) || "No AI insights are available at this time.";

    return NextResponse.json({
      mode: "quiz",
      totalQuizzes,
      adaptiveQuizzes,
      difficultyDistribution: [
        { name: "Easy", value: difficultyCounts.easy },
        { name: "Medium", value: difficultyCounts.medium },
        { name: "Hard", value: difficultyCounts.hard },
        { name: "Unknown", value: difficultyCounts.unknown },
      ],
      trendData,
      questionDistribution,
      questionTypeData: Object.entries(finalQuestionTypeCounts).map(([type, count]) => ({
        type,
        count,
      })),
      avgQuestions,
      medianQuestions,
      allQuizzes,
      topQuizzes,
      radarProfile,
      adaptiveInsights,
      insights,
    });
  } catch (err: any) {
    console.error("Analytics API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
