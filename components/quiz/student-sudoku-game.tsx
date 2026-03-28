"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Grid3X3 } from "lucide-react";

const StudentSudokuStage = dynamic(
  () => import("@/components/quiz/student-sudoku-stage"),
  { ssr: false }
);

type Props = {
  questionId: number;
  question: string;
  options: string[];
  difficulty?: "easy" | "medium" | "hard";
  answerKey?: string;
  timelineItems?: string[];
  value: string;
  disabled?: boolean;
  onPick: (next: string) => void;
};

function cleanTimelineText(value: string) {
  return String(value || "")
    .replace(/^\s*\d+[\)\.]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isModeIndicator(value: string) {
  const normalized = cleanTimelineText(value).replace(/\s+/g, "_").toUpperCase();
  return ["TIMELINE_ORDER", "TIMELINE", "SUPER_RACE", "PUZZLE", "BINGO", "SUDOKU"].includes(
    normalized
  );
}

function extractLetteredTimelinePairs(text: string) {
  const source = String(text || "").trim();
  const afterColon = source.includes(":") ? source.split(":").slice(1).join(":") : source;
  return [...afterColon.matchAll(/([A-Z])\)\s*(.*?)(?=\s+[A-Z]\)\s*|$)/g)]
    .map((match) => ({
      key: String(match[1] || "").trim().toUpperCase(),
      value: cleanTimelineText(String(match[2] || "")),
    }))
    .filter((item) => item.key && item.value && !isModeIndicator(item.value));
}

function buildShuffledTimelineOrder(
  cards: Array<{ id: string; value: string; label: string }>,
  seed: number
) {
  const arr = [...cards];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function extractTimelineItems(question: string) {
  const text = String(question || "").trim();
  const bracketed = [...text.matchAll(/\[([^\]]+)\]/g)]
    .map((match) => cleanTimelineText(String(match[1] || "")))
    .filter(Boolean)
    .filter((item) => !isModeIndicator(item));
  if (bracketed.length >= 3) return bracketed.slice(0, 5);

  const letteredPairs = extractLetteredTimelinePairs(text);
  if (letteredPairs.length >= 3) return letteredPairs.map((item) => item.value).slice(0, 5);

  const afterColon = text.includes(":") ? text.split(":").slice(1).join(":") : text;
  const matches = afterColon.match(/(?:^|\s)(\d+[\)\.]?\s*[^,]+(?:,[^,]+)*)/g);
  if (matches && matches.length >= 3) {
    return matches
      .map((item) => cleanTimelineText(item))
      .filter(Boolean)
      .slice(0, 5);
  }

  const splitByNumbering = afterColon
    .split(/\s+\d+[\)\.]\s+/)
    .map((item) => cleanTimelineText(item))
    .filter(Boolean);
  if (splitByNumbering.length >= 3) return splitByNumbering.slice(0, 5);

  const splitBySemicolon = text
    .split(/\s*;\s*/)
    .map((item) => cleanTimelineText(item))
    .filter(Boolean);
  if (splitBySemicolon.length >= 3) return splitBySemicolon.slice(0, 5);

  return [];
}

function resolveTimelineItems(question: string, answerKey?: string, fromStructure?: string[]) {
  const structureItems = Array.isArray(fromStructure)
    ? fromStructure
        .map((item) => cleanTimelineText(String(item || "")))
        .filter(Boolean)
        .filter((item) => !isModeIndicator(item))
    : [];
  if (structureItems.length >= 3) return structureItems;

  const questionPairs = extractLetteredTimelinePairs(question);
  if (questionPairs.length >= 3 && answerKey) {
    const questionMap = new Map(questionPairs.map((item) => [item.key, item.value]));
    let answerTokens = String(answerKey || "")
      .split(/\s*;\s*|\s*,\s*/)
      .map((item) => item.replace(/[^A-Za-z0-9]/g, "").trim().toUpperCase())
      .filter(Boolean);
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
    if (mapped.length >= 3) return mapped;
  }

  return extractTimelineItems(question);
}

export function StudentSudokuGame({
  questionId,
  question,
  options,
  difficulty = "medium",
  answerKey,
  timelineItems,
  value,
  disabled,
  onPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(520);
  const shuffled = Array.isArray(options) ? options : [];
  const normalizedTimelineItems = useMemo(() => {
    const source = resolveTimelineItems(question, answerKey, timelineItems);
    const unique = Array.from(new Set(source.filter(Boolean)));
    return unique.slice(0, difficulty === "hard" ? 5 : 4);
  }, [timelineItems, question, answerKey, difficulty]);
  const timelineCards = useMemo(() => {
    const base = normalizedTimelineItems.length >= 3
      ? normalizedTimelineItems
      : Array.from(
          new Set(
            [...shuffled.map((item) => cleanTimelineText(String(item || ""))), cleanTimelineText(String(answerKey || ""))]
              .filter(Boolean)
              .filter((item) => !isModeIndicator(item))
          )
        ).slice(0, 4);
    return base.map((item, idx) => ({
      id: `${questionId}-${idx}-${item}`,
      value: item,
      label: cleanTimelineText(item),
    }));
  }, [normalizedTimelineItems, shuffled, answerKey, questionId]);
  const timelineSignature = useMemo(
    () => timelineCards.map((card) => card.value).join("||"),
    [timelineCards]
  );
  const [cardOrder, setCardOrder] = useState(() =>
    buildShuffledTimelineOrder(timelineCards, questionId)
  );

  useEffect(() => {
    setCardOrder(buildShuffledTimelineOrder(timelineCards, questionId));
  }, [timelineSignature, questionId]);

  useEffect(() => {
    if (!cardOrder.length) return;
    const nextValue = JSON.stringify({
      kind: "timeline_order",
      order: cardOrder.map((card) => card.value),
    });
    if (value === nextValue) return;
    onPick(nextValue);
  }, [cardOrder, onPick, value]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateSize = () => {
      const next = Math.max(360, Math.min(900, node.clientWidth - 8));
      setStageWidth(next);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const stageHeight = Math.max(380, difficulty === "hard" ? 470 : 420);

  const handleMove = (fromIndex: number, toIndex: number) => {
    setCardOrder((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-zinc-50 p-2">
        <div className="mb-2 inline-flex items-center gap-1 text-[11px] text-zinc-600">
          <Grid3X3 className="h-3.5 w-3.5" />
          Timeline Order / {difficulty}
        </div>
        <div className="mb-2 text-xs text-zinc-500">
          Arrange the event cards in the correct chronological order.
        </div>
        <div ref={containerRef} className="flex justify-center">
          <StudentSudokuStage
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            cards={cardOrder}
            disabled={disabled}
            onMove={handleMove}
          />
        </div>
      </div>
    </div>
  );
}
