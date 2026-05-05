import { inferQuizQuestionType } from "@/lib/quiz-question-types";
import {
  decodeStoredAnswer,
  gradeMatchingFromStructure,
  gradeWorksheetFromStructure,
} from "@/lib/quiz-structured";

export type ScoredQuestionInput = {
  id: number;
  question: string;
  options: string[];
  answer: string;
};

export type ScoredQuestionDetail = {
  questionId: number;
  question: string;
  questionType: string;
  selected: string;
  correctAnswer: string;
  correct: boolean;
};

function normalizeForCompare(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/["'“”‘’]/g, "")
    .replace(/[.,!?;:()]/g, "")
    .replace(/\s+/g, " ");
}

function answersMatch(selected: string, expected: string) {
  const a = normalizeForCompare(selected);
  const b = normalizeForCompare(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.replace(/[^a-z0-9]/g, "") === b.replace(/[^a-z0-9]/g, "");
}

function shortAnswerMatches(selected: string, expected: string) {
  const a = normalizeForCompare(selected);
  const b = normalizeForCompare(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;

  const stopwords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "to",
    "of",
    "and",
    "or",
    "in",
    "on",
    "for",
    "with",
    "by",
    "from",
    "that",
    "this",
    "it",
    "as",
    "at",
  ]);
  const toKeyTokens = (text: string) =>
    text
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !stopwords.has(t));

  const selectedTokens = toKeyTokens(a);
  const expectedTokens = toKeyTokens(b);
  if (!selectedTokens.length || !expectedTokens.length) return false;

  const selectedSet = new Set(selectedTokens);
  const expectedSet = new Set(expectedTokens);
  let overlap = 0;
  expectedSet.forEach((token) => {
    if (selectedSet.has(token)) overlap += 1;
  });

  return overlap / expectedSet.size >= 0.6 || overlap / selectedSet.size >= 0.6;
}

function parsePairs(value: string) {
  return String(value || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*(?:->|:|-|=)\s*/);
      if (parts.length < 2) return null;
      const left = normalizeForCompare(parts[0]);
      const right = normalizeForCompare(parts.slice(1).join(" "));
      if (!left || !right) return null;
      return `${left}=>${right}`;
    })
    .filter((x): x is string => Boolean(x));
}

function matchingAnswersMatch(selected: string, expected: string) {
  const selectedPairs = parsePairs(selected);
  const expectedPairs = parsePairs(expected);
  if (!selectedPairs.length || !expectedPairs.length) return shortAnswerMatches(selected, expected);

  const selectedSet = new Set(selectedPairs);
  const expectedSet = new Set(expectedPairs);
  let overlap = 0;
  expectedSet.forEach((pair) => {
    if (selectedSet.has(pair)) overlap += 1;
  });
  return overlap / expectedSet.size >= 0.6;
}

function worksheetMatches(selected: string, expected: string) {
  const a = normalizeForCompare(selected).replace(/\s+/g, "");
  const b = normalizeForCompare(expected).replace(/\s+/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    return Math.abs(an - bn) <= 0.001;
  }
  return shortAnswerMatches(selected, expected);
}

function gradeTimelineOrder(selectedRaw: string, timelineItems: string[]) {
  if (!Array.isArray(timelineItems) || timelineItems.length < 3) return false;
  const normalizedExpected = timelineItems.map((item) => normalizeForCompare(item));
  if (normalizedExpected.some((item) => !item)) return false;

  try {
    const parsed = JSON.parse(String(selectedRaw || "")) as { order?: unknown[] };
    const order = Array.isArray(parsed?.order) ? parsed.order : [];
    const normalizedSelected = order.map((item) => normalizeForCompare(String(item || "")));
    if (normalizedSelected.length !== normalizedExpected.length) return false;
    return normalizedSelected.every((item, idx) => item === normalizedExpected[idx]);
  } catch {
    return false;
  }
}

export function scoreQuizAnswers(
  questions: ScoredQuestionInput[],
  answersInput: Record<string, string>
) {
  const details: ScoredQuestionDetail[] = questions.map((q) => {
    const raw = answersInput[String(q.id)];
    const selected = typeof raw === "string" ? raw : "";
    const decoded = decodeStoredAnswer(q.answer);
    const questionType = decoded.structure?.type ?? inferQuizQuestionType(q.question, q.options);
    const expectedAnswer = decoded.answer;
    let correct = false;

    if (questionType === "short_answer" || questionType === "essay_rubric") {
      correct = shortAnswerMatches(selected, expectedAnswer);
    } else if (questionType === "matching") {
      correct =
        decoded.structure?.type === "matching"
          ? gradeMatchingFromStructure(selected, decoded.structure)
          : matchingAnswersMatch(selected, expectedAnswer);
    } else if (
      decoded.structure?.type === "gamified" &&
      decoded.structure.mode === "timeline" &&
      Array.isArray(decoded.structure.timelineItems)
    ) {
      correct = gradeTimelineOrder(selected, decoded.structure.timelineItems);
    } else if (questionType === "worksheet") {
      correct =
        decoded.structure?.type === "worksheet"
          ? gradeWorksheetFromStructure(selected, decoded.structure, worksheetMatches)
          : worksheetMatches(selected, expectedAnswer);
    } else {
      correct = answersMatch(selected, expectedAnswer);
    }

    return {
      questionId: q.id,
      question: q.question,
      questionType,
      selected,
      correctAnswer: expectedAnswer,
      correct,
    };
  });

  const total = details.length;
  const correct = details.filter((d) => d.correct).length;
  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    details,
    total,
    correct,
    scorePercent,
  };
}
