import { prisma } from "@/lib/prisma";
import { buildPromptProfile, extractKeywordTokens } from "@/lib/adaptive-personalization";

function hasTokenOverlap(a: string[], b: string[]) {
  if (!a.length || !b.length) return false;
  const setA = new Set(a.map((t) => t.toLowerCase()));
  return b.some((t) => setA.has(t.toLowerCase()));
}

export async function buildQuizAdaptiveGuidance(
  userId: string,
  currentPrompt: string
): Promise<string> {
  const currentProfile = buildPromptProfile(currentPrompt || "");
  const currentTokens = [
    ...extractKeywordTokens(currentPrompt || "", 12),
    ...extractKeywordTokens(currentProfile.topic || "", 6),
    ...currentProfile.keywords,
  ]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const recentHistory = await prisma.generationEvent.findMany({
    where: {
      userId,
      eventType: "quiz_generated",
      status: "success",
      OR: [{ feature: "quiz" }, { feature: "quiz_file_upload" }],
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { metadata: true },
  });

  const topicFrequency = new Map<string, number>();
  for (const row of recentHistory) {
    if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) {
      continue;
    }
    const meta = row.metadata as Record<string, unknown>;
    const topic = typeof meta.promptTopic === "string" ? meta.promptTopic.trim() : "";
    if (topic) {
      topicFrequency.set(topic, (topicFrequency.get(topic) ?? 0) + 1);
    }
  }

  const frequentTopics = Array.from(topicFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  const attemptRows = await prisma.$queryRaw<
    Array<{ scorePercent: number; result: unknown; title: string }>
  >`
    SELECT s."scorePercent", s."result", q."title"
    FROM "StudentQuizAttempt" s
    JOIN "Quiz" q ON q."id" = s."quizId"
    WHERE q."userId" = ${userId}
    ORDER BY s."submittedAt" DESC
    LIMIT 120
  `;

  const lowScoreTopics: string[] = [];
  const missedAnswerTerms: string[] = [];
  for (const row of attemptRows) {
    if ((row.scorePercent ?? 0) < 60) {
      const profile = buildPromptProfile(row.title || "");
      if (profile.topic) lowScoreTopics.push(profile.topic);
    }
    const details = Array.isArray(row.result)
      ? (row.result as Array<Record<string, unknown>>)
      : [];
    for (const detail of details) {
      if (detail?.correct === false) {
        const selected = typeof detail.selected === "string" ? detail.selected.trim() : "";
        if (selected) {
          missedAnswerTerms.push(...extractKeywordTokens(selected, 3));
        }
      }
    }
  }

  const topLowTopics = Array.from(new Set(lowScoreTopics)).slice(0, 3);
  const topMissedTerms = Array.from(new Set(missedAnswerTerms)).slice(0, 5);

  const relevantFrequentTopics =
    currentTokens.length === 0
      ? frequentTopics.slice(0, 3)
      : frequentTopics.filter((topic) =>
          hasTokenOverlap(extractKeywordTokens(topic, 8), currentTokens)
        );

  const relevantLowTopics =
    currentTokens.length === 0
      ? topLowTopics.slice(0, 3)
      : topLowTopics.filter((topic) =>
          hasTokenOverlap(extractKeywordTokens(topic, 8), currentTokens)
        );

  const relevantMissedTerms =
    currentTokens.length === 0
      ? topMissedTerms.slice(0, 5)
      : topMissedTerms.filter((term) => hasTokenOverlap([term], currentTokens));

  if (
    relevantFrequentTopics.length === 0 &&
    relevantLowTopics.length === 0 &&
    relevantMissedTerms.length === 0
  ) {
    return "";
  }

  const guidanceLines = ["Teacher Intent Personalization:"];
  if (relevantFrequentTopics.length > 0) {
    guidanceLines.push(
      `- Teacher frequently generates quizzes on related topics: ${relevantFrequentTopics.join(", ")}.`
    );
  }
  if (relevantLowTopics.length > 0) {
    guidanceLines.push(
      `- Student outcomes indicate remediation focus on related areas: ${relevantLowTopics.join(", ")}.`
    );
  }
  if (relevantMissedTerms.length > 0) {
    guidanceLines.push(
      `- Common wrong-answer terms in this same topic area: ${relevantMissedTerms.join(", ")}.`
    );
  }
  guidanceLines.push(
    "- Keep requested topic primary and ignore unrelated past topics, terms, or examples."
  );
  return guidanceLines.join("\n");
}

