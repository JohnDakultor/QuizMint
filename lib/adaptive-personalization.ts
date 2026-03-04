const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "generate",
  "give",
  "in",
  "is",
  "it",
  "make",
  "me",
  "of",
  "on",
  "or",
  "quiz",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

function normalizeText(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPromptProfile(prompt: string) {
  const normalized = normalizeText(prompt);
  const tokens = normalized
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
  const uniqueKeywords = Array.from(new Set(tokens)).slice(0, 8);
  const topic = uniqueKeywords.slice(0, 4).join(" ");

  return {
    topic: topic || "general practice",
    keywords: uniqueKeywords,
    preview: prompt.slice(0, 140),
  };
}

function titleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sanitizeTopicForSuggestion(input: string): string {
  return input
    .replace(/\b\d+\s*(easy|medium|hard)\b/gi, " ")
    .replace(/\b(easy|medium|hard)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildQuizSuggestionsFromHistory(input: {
  topics: string[];
  keywords: string[];
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 6, 3), 10);
  const topics = input.topics
    .map((topic) => sanitizeTopicForSuggestion(topic))
    .filter(Boolean);
  const keywordSet = Array.from(new Set(input.keywords.filter(Boolean)));
  const topKeywords = keywordSet.slice(0, 6);

  const templates: string[] = [];

  if (topics[0]) {
    templates.push(
      `Create a 10-item quiz about ${topics[0]} with multiple choice and true/false.`,
      `Create an exit-ticket quiz on ${topics[0]} for Grade 8 with answer key.`
    );
  }

  if (topics[1]) {
    templates.push(
      `Create a spiral review quiz combining ${topics[0] || "recent topics"} and ${topics[1]}.`
    );
  }

  if (topKeywords.length >= 2) {
    templates.push(
      `Create a competency quiz covering ${titleCase(topKeywords[0])} and ${titleCase(topKeywords[1])}.`
    );
  }

  if (topKeywords.length >= 3) {
    templates.push(
      `Generate 15 items on ${titleCase(topKeywords[0])}, ${titleCase(topKeywords[1])}, and ${titleCase(topKeywords[2])} with mixed question types.`
    );
  }

  if (templates.length < limit) {
    templates.push(
      "Create a 10-item formative quiz with 7 multiple choice and 3 true/false questions.",
      "Generate a remediation quiz focused on common misconceptions for the current unit.",
      "Create a short pre-assessment quiz aligned to today's lesson objective."
    );
  }

  return Array.from(new Set(templates)).slice(0, limit);
}
