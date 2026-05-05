export type StudentAnswerQuestion = {
  questionType: string;
  options?: string[];
  structure?:
    | {
        type: "matching";
        left: Array<{ id: string; text: string }>;
        right: Array<{ id: string; text: string }>;
      }
    | {
        type: "worksheet";
        parts: Array<{ id: string; prompt: string }>;
      }
    | {
        type: "gamified";
        mode?: "bingo" | "timeline" | "puzzle";
      }
    | null;
};

export function isStudentAnswerComplete(question: StudentAnswerQuestion, value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;

  if (question.questionType === "matching") {
    try {
      const parsed = JSON.parse(trimmed) as { kind?: string; map?: Record<string, string> };
      if (parsed?.kind === "matching_map") {
        const map = parsed.map && typeof parsed.map === "object" ? parsed.map : {};
        const leftCount = question.structure?.type === "matching" ? question.structure.left.length : 0;
        const expectedCount = leftCount || Object.keys(map).length;
        const answeredCount = Object.values(map).filter((answer) => String(answer || "").trim()).length;
        return expectedCount > 0 && answeredCount >= expectedCount;
      }
    } catch {
      // Plain text matching is handled below.
    }
    const lines = trimmed.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean);
    return lines.length > 0 && lines.every((line) => /\S+\s*(?:->|:|-|=)\s*\S+/.test(line));
  }

  if (question.questionType === "worksheet") {
    try {
      const parsed = JSON.parse(trimmed) as { kind?: string; answers?: Record<string, string> };
      if (parsed?.kind === "worksheet_parts") {
        const answers = parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {};
        const parts = question.structure?.type === "worksheet" ? question.structure.parts : [];
        if (!parts.length) {
          return Object.values(answers).some((answer) => String(answer || "").trim());
        }
        return parts.every((part) => String(answers[part.id] || "").trim());
      }
    } catch {
      // Plain text worksheet fallback below.
    }
    return trimmed.length > 0;
  }

  if (question.questionType === "gamified") {
    try {
      const parsed = JSON.parse(trimmed) as { kind?: string; order?: unknown[] };
      if (parsed?.kind === "timeline_order") {
        const optionCount = Array.isArray(question.options) ? question.options.filter(Boolean).length : 0;
        return Array.isArray(parsed.order) && parsed.order.filter(Boolean).length >= Math.max(3, optionCount);
      }
    } catch {
      // Normal selected-answer fallback below.
    }
  }

  return trimmed.length > 0;
}
