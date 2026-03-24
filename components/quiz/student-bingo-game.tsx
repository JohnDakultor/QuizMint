"use client";

import { useMemo, useState } from "react";

type Props = {
  questionId: number;
  question: string;
  options: string[];
  answerKey?: string;
  value: string;
  disabled?: boolean;
  onPick: (next: string) => void;
};

export function StudentBingoGame({
  questionId,
  question,
  options,
  answerKey,
  value,
  disabled,
  onPick,
}: Props) {
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
    const core =
      safeOptions.length >= 4
        ? safeOptions
        : fallbackCells.length > 0
        ? fallbackCells
        : ["ATOM", "NUCLEAR", "CHAIN", "TRINITY"];
    return [...core].slice(0, 9);
  }, [safeOptions, fallbackCells]);
  const racers = useMemo(
    () =>
      cells.map((cell, idx) => {
        const seed = ((questionId + 7) * (idx + 11) * 17) % 100;
        const progress = 28 + (seed % 58); // 28%..85%
        return { cell, idx, progress };
      }),
    [cells, questionId]
  );

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
          Super Race Lanes
        </div>
        <div className="space-y-2">
          {racers.map(({ cell, idx, progress }) => {
          const hasKnownAnswer = Boolean(normalizedAnswerKey) || safeOptions.length > 0;
          const isAnswer =
            !hasKnownAnswer ||
            cell.toUpperCase() === normalizedAnswerKey ||
            safeOptions.includes(cell);
          const selected = value === cell;
          return (
            <div
              key={`${questionId}-race-${idx}`}
              className={`rounded-lg border p-2 transition-all ${
                selected ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 bg-zinc-50/60"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Lane {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-zinc-800">{cell}</span>
                </div>
                <button
                  type="button"
                  disabled={Boolean(disabled)}
                  onClick={() => handleBingoCellClick(cell)}
                  className={`rounded px-2 py-1 text-[11px] font-semibold transition ${
                    selected
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-900 text-white hover:bg-zinc-700"
                  } ${disabled ? "opacity-70" : ""}`}
                >
                  {selected ? "Chosen" : "Boost"}
                </button>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full ${
                    selected
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : isAnswer
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                      : "bg-gradient-to-r from-zinc-400 to-zinc-500"
                  }`}
                  style={{ width: `${selected ? 100 : progress}%` }}
                />
              </div>
            </div>
          );
        })}
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
