export type MatchingPublicStructure = {
  type: "matching";
  left: Array<{ id: string; text: string }>;
  right: Array<{ id: string; text: string }>;
};

export type WorksheetPublicStructure = {
  type: "worksheet";
  instructions?: string;
  parts: Array<{ id: string; prompt: string }>;
};

export type GamifiedPublicStructure = {
  type: "gamified";
  mode?: "bingo" | "timeline" | "puzzle";
};

type MatchingStoredStructure = MatchingPublicStructure & {
  pairs: Array<{ leftId: string; rightId: string }>;
};

type WorksheetStoredStructure = WorksheetPublicStructure & {
  parts: Array<{ id: string; prompt: string; answer?: string }>;
};

type GamifiedStoredStructure = GamifiedPublicStructure & {
  puzzleKey?: string;
  answerKey?: string;
  timelineItems?: string[];
};

export type StoredQuestionStructure =
  | MatchingStoredStructure
  | WorksheetStoredStructure
  | GamifiedStoredStructure;

const META_PREFIX = "__QMETA_V1__";

function toBase64(input: string) {
  return Buffer.from(input, "utf8").toString("base64");
}

function fromBase64(input: string) {
  return Buffer.from(input, "base64").toString("utf8");
}

export function encodeAnswerWithStructure(answer: string, structure?: StoredQuestionStructure | null) {
  if (!structure) return answer;
  const payload = toBase64(JSON.stringify(structure));
  return `${answer}\n${META_PREFIX}${payload}`;
}

export function decodeStoredAnswer(answerRaw: string): {
  answer: string;
  structure: StoredQuestionStructure | null;
} {
  const text = String(answerRaw || "");
  const markerIdx = text.lastIndexOf(META_PREFIX);
  if (markerIdx < 0) return { answer: text.trim(), structure: null };
  const answer = text.slice(0, markerIdx).trim();
  const encoded = text.slice(markerIdx + META_PREFIX.length).trim();
  try {
    const decoded = JSON.parse(fromBase64(encoded)) as StoredQuestionStructure;
    return { answer, structure: decoded };
  } catch {
    return { answer: text.trim(), structure: null };
  }
}

export function stripStructuredMeta(answerRaw: string) {
  const text = String(answerRaw || "");
  const markerIdx = text.lastIndexOf(META_PREFIX);
  if (markerIdx < 0) return text.trim();
  return text.slice(0, markerIdx).trim();
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return String(value || "").trim();
}

function extractBracketedItems(text: string) {
  return [...String(text || "").matchAll(/\[([^\]]+)\]/g)]
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.replace(/\s+/g, "_").toUpperCase();
      return !["TIMELINE_ORDER", "TIMELINE", "SUPER_RACE", "PUZZLE", "BINGO", "SUDOKU"].includes(
        normalized
      );
    });
}

function extractLetteredTimelinePairs(text: string) {
  const source = String(text || "").trim();
  const afterColon = source.includes(":") ? source.split(":").slice(1).join(":") : source;
  const pairs = [...afterColon.matchAll(/([A-Z])\)\s*(.*?)(?=\s+[A-Z]\)\s*|$)/g)]
    .map((match) => ({
      key: String(match[1] || "").trim().toUpperCase(),
      value: String(match[2] || "")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((item) => item.key && item.value);
  return pairs;
}

function extractTimelineItems(text: string) {
  const source = String(text || "").trim();
  const bracketed = extractBracketedItems(source);
  if (bracketed.length >= 3) return bracketed.slice(0, 5);

  const letteredPairs = extractLetteredTimelinePairs(source);
  if (letteredPairs.length >= 3) {
    return letteredPairs.map((item) => item.value).slice(0, 5);
  }

  const afterColon = source.includes(":") ? source.split(":").slice(1).join(":") : source;
  const matches = [...afterColon.matchAll(/(?:^|,\s*|\s+)(\d+[\)\.]?\s*[^,]+)/g)]
    .map((match) => String(match[1] || "").replace(/^\d+[\)\.]?\s*/, "").trim())
    .filter(Boolean);
  if (matches.length >= 3) return matches.slice(0, 5);

  const splitByNumbering = afterColon
    .split(/\s+\d+[\)\.]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (splitByNumbering.length >= 3) return splitByNumbering.slice(0, 5);

  return [];
}

function resolveTimelineItems(question: string, answer: string) {
  const questionText = String(question || "").trim();
  const answerText = String(answer || "").trim();
  const questionLetteredPairs = extractLetteredTimelinePairs(questionText);
  if (questionLetteredPairs.length >= 3) {
    let answerTokens = answerText
      .split(/\s*;\s*|\s*,\s*/)
      .map((item) => item.replace(/[^A-Za-z0-9]/g, "").trim().toUpperCase())
      .filter(Boolean);
    const questionMap = new Map(questionLetteredPairs.map((item) => [item.key, item.value]));
    if (
      answerTokens.length === 1 &&
      answerTokens[0].length >= 3 &&
      answerTokens[0].length <= 5 &&
      answerTokens[0].split("").every((token) => questionMap.has(token))
    ) {
      answerTokens = answerTokens[0].split("");
    }
    const mapped = answerTokens
      .map((token) => questionMap.get(token))
      .filter((item): item is string => Boolean(item));
    if (mapped.length >= 3) return mapped.slice(0, 5);
  }

  const fromAnswer = extractTimelineItems(answerText).slice(0, 5);
  if (fromAnswer.length >= 3) return fromAnswer;

  return extractTimelineItems(questionText).slice(0, 5);
}

export function buildStoredStructureFromAI(input: {
  question: string;
  answer: string;
  questionType?: string | null;
  structure?: unknown;
}): StoredQuestionStructure | null {
  const hintedType = asString(input.questionType).toLowerCase();
  const structure = asObject(input.structure);
  const questionText = asString(input.question).toLowerCase();
  const inferredGamified = /game challenge|super race|case challenge|\[puzzle\]|\[super_race\]|\[case_challenge\]|\[bingo\]|\[timeline\]|\[timeline_order\]|\[sudoku\]|puzzle|bingo|timeline|sudoku/.test(
    questionText
  );
  const effectiveHintType = hintedType || (inferredGamified ? "gamified" : "");
  const type = asString((structure?.type as string | undefined) || effectiveHintType).toLowerCase();

  if (type === "matching" && structure) {
    const left = Array.isArray(structure.left)
      ? structure.left
          .map((x) => asObject(x))
          .filter((x): x is Record<string, unknown> => Boolean(x))
          .map((x, idx) => ({
            id: asString(x.id || String(idx + 1)),
            text: asString(x.text),
          }))
          .filter((x) => x.text)
      : [];
    const right = Array.isArray(structure.right)
      ? structure.right
          .map((x) => asObject(x))
          .filter((x): x is Record<string, unknown> => Boolean(x))
          .map((x, idx) => ({
            id: asString(x.id || String.fromCharCode(65 + idx)),
            text: asString(x.text),
          }))
          .filter((x) => x.text)
      : [];
    const pairs = Array.isArray(structure.pairs)
      ? structure.pairs
          .map((x) => asObject(x))
          .filter((x): x is Record<string, unknown> => Boolean(x))
          .map((x) => ({
            leftId: asString(x.leftId),
            rightId: asString(x.rightId),
          }))
          .filter((x) => x.leftId && x.rightId)
      : [];

    if (left.length >= 2 && right.length >= 2 && pairs.length >= 1) {
      return { type: "matching", left, right, pairs };
    }
  }

  if (type === "worksheet" && structure) {
    const instructions = asString(structure.instructions);
    const parts = Array.isArray(structure.parts)
      ? structure.parts
          .map((x) => asObject(x))
          .filter((x): x is Record<string, unknown> => Boolean(x))
          .map((x, idx) => ({
            id: asString(x.id || `p${idx + 1}`),
            prompt: asString(x.prompt),
            answer: asString(x.answer),
          }))
          .filter((x) => x.prompt)
      : [];
    if (parts.length >= 1) {
      return { type: "worksheet", instructions: instructions || undefined, parts };
    }
  }

  if (type === "gamified" || effectiveHintType === "gamified") {
    const q = String(input.question || "").toLowerCase();
    const mode = /\[puzzle\]|puzzle/.test(q)
      ? "puzzle"
      : /\[timeline\]|\[timeline_order\]|\[timeline order\]|timeline order|timeline|\[sudoku\]|sudoku/.test(q)
      ? "timeline"
      : /\[super_race\]|\[super race\]|super race/.test(q)
      ? "bingo"
      : /\[case_challenge\]|\[case challenge\]|case challenge/.test(q)
      ? "bingo"
      : /\[bingo\]|bingo/.test(q)
      ? "bingo"
      : undefined;

    const rawAnswer = asString(input.answer).replace(/\s+/g, "");
    const answerKey = rawAnswer
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toUpperCase()
      .slice(0, 24);
    const puzzleKey =
      mode === "puzzle"
        ? answerKey
        : undefined;
    const timelineItems =
      mode === "timeline"
        ? resolveTimelineItems(input.question, input.answer)
        : undefined;

    return {
      type: "gamified",
      mode,
      ...(answerKey ? { answerKey } : {}),
      ...(puzzleKey ? { puzzleKey } : {}),
      ...(timelineItems && timelineItems.length >= 3 ? { timelineItems } : {}),
    };
  }

  return null;
}

export function toPublicStructure(structure: StoredQuestionStructure | null):
  | MatchingPublicStructure
  | WorksheetPublicStructure
  | GamifiedPublicStructure
  | null {
  if (!structure) return null;
  if (structure.type === "matching") {
    return {
      type: "matching",
      left: structure.left,
      right: structure.right,
    };
  }
  if (structure.type === "gamified") {
    return {
      type: "gamified",
      mode: structure.mode,
    };
  }
  return {
    type: "worksheet",
    instructions: structure.instructions,
    parts: structure.parts.map((p) => ({ id: p.id, prompt: p.prompt })),
  };
}

export function gradeMatchingFromStructure(
  selectedRaw: string,
  structure: MatchingStoredStructure
) {
  const selected = String(selectedRaw || "").trim();
  if (!selected) return false;

  let selectedPairs: Array<{ leftId: string; rightId: string }> = [];
  try {
    const parsed = JSON.parse(selected) as {
      kind?: string;
      map?: Record<string, string>;
    };
    if (parsed?.kind === "matching_map" && parsed.map && typeof parsed.map === "object") {
      selectedPairs = Object.entries(parsed.map).map(([leftId, rightId]) => ({
        leftId: String(leftId),
        rightId: String(rightId),
      }));
    }
  } catch {
    selectedPairs = String(selected)
      .split(/\r?\n|;/)
      .map((line) => line.split(/\s*(?:->|:|-|=)\s*/))
      .filter((parts) => parts.length >= 2)
      .map((parts) => ({
        leftId: String(parts[0] || "").trim(),
        rightId: String(parts[1] || "").trim(),
      }))
      .filter((x) => x.leftId && x.rightId);
  }

  if (!selectedPairs.length || !structure.pairs.length) return false;
  const selectedSet = new Set(selectedPairs.map((p) => `${p.leftId}=>${p.rightId}`));
  const expectedSet = new Set(structure.pairs.map((p) => `${p.leftId}=>${p.rightId}`));
  let overlap = 0;
  expectedSet.forEach((pair) => {
    if (selectedSet.has(pair)) overlap += 1;
  });
  return overlap / expectedSet.size >= 0.8;
}

export function gradeWorksheetFromStructure(
  selectedRaw: string,
  structure: WorksheetStoredStructure,
  matcher: (a: string, b: string) => boolean
) {
  const selected = String(selectedRaw || "").trim();
  if (!selected) return false;

  let answersByPart: Record<string, string> = {};
  try {
    const parsed = JSON.parse(selected) as {
      kind?: string;
      answers?: Record<string, string>;
    };
    if (parsed?.kind === "worksheet_parts" && parsed.answers && typeof parsed.answers === "object") {
      answersByPart = parsed.answers;
    }
  } catch {
    answersByPart = { p1: selected };
  }

  const parts = (structure.parts as Array<{ id: string; prompt: string; answer?: string }>).filter((p) =>
    String(p.answer || "").trim()
  );
  if (parts.length === 0) return false;
  let correct = 0;
  for (const part of parts) {
    const candidate =
      String(answersByPart[part.id] || "").trim() ||
      (part.id === "p1" ? String(selectedRaw || "").trim() : "");
    if (matcher(candidate, String(part.answer || ""))) correct += 1;
  }
  return correct / parts.length >= 0.8;
}
