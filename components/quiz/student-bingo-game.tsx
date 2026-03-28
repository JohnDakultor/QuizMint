"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const StudentBingoStage = dynamic(
  () => import("@/components/quiz/student-bingo-stage"),
  { ssr: false }
);

type Props = {
  questionId: number;
  question: string;
  options: string[];
  difficulty?: "easy" | "medium" | "hard";
  answerKey?: string;
  value: string;
  disabled?: boolean;
  onPick: (next: string) => void;
};

export function StudentBingoGame({
  questionId,
  question,
  options,
  difficulty = "medium",
  answerKey,
  value,
  disabled,
  onPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(520);
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const normalizedAnswerKey = String(answerKey || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toUpperCase();
  const questionTerms = String(question || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(
      (w) =>
        w.length >= 4 &&
        !["GAME", "SUPER", "RACE", "CASE", "CHALLENGE", "BINGO", "WHAT", "WHICH", "USING", "REVEAL", "THE", "AND"].includes(
          w
        )
    );

  const fallbackCells = Array.from(new Set([normalizedAnswerKey, ...questionTerms]))
    .filter(Boolean)
    .slice(0, 6);
  const [raceMessage, setRaceMessage] = useState<string>("");

  const cells = useMemo(() => {
    const desiredCount = difficulty === "easy" ? 4 : difficulty === "hard" ? 8 : 6;
    const pool = [
      ...safeOptions,
      ...fallbackCells,
      "ATOM",
      "NUCLEAR",
      "CHAIN",
      "TRINITY",
      "ORBIT",
      "IONIC",
      "CELL",
    ];
    return Array.from(new Set(pool.filter(Boolean))).slice(0, Math.min(9, desiredCount));
  }, [safeOptions, fallbackCells, difficulty]);
  const racers = useMemo(
    () =>
      cells.map((cell, idx) => {
        const seed = ((questionId + 7) * (idx + 11) * 17) % 100;
        const progress =
          difficulty === "easy"
            ? 22 + (seed % 42)
            : difficulty === "hard"
            ? 54 + (seed % 24)
            : 34 + (seed % 42);
        return { cell, idx, progress };
      }),
    [cells, questionId, difficulty]
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateSize = () => {
      const width = Math.max(280, Math.min(560, node.clientWidth - 8));
      setStageWidth(width);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const stageHeight = Math.max(240, 70 + racers.length * 58);

  const handleBingoCellClick = (cell: string) => {
    if (disabled) return;
    const hasKnownAnswer = Boolean(normalizedAnswerKey) || safeOptions.length > 0;
    const isCorrectCandidate =
      !hasKnownAnswer ||
      cell.toUpperCase() === normalizedAnswerKey ||
      safeOptions.includes(cell);
    setRaceMessage(isCorrectCandidate ? "Lane locked in." : "Wrong lane. Pick again.");
    onPick(cell);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-200 bg-white p-2">
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          Super Race Lanes / {difficulty}
        </div>
        <div ref={containerRef} className="flex justify-center">
          <StudentBingoStage
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            racers={racers}
            selectedValue={value}
            disabled={disabled}
            onPick={handleBingoCellClick}
          />
        </div>
      </div>
      {raceMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          {raceMessage}
        </div>
      ) : null}
    </div>
  );
}
