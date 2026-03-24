"use client";

import { useEffect, useMemo, useState } from "react";
import { Puzzle, Sparkles } from "lucide-react";
import { buildSolvablePuzzle, canMoveTile, isSolvedPuzzle } from "@/lib/puzzle-game";

type Props = {
  questionId: number;
  question: string;
  options: string[];
  puzzleKey?: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
};

function stableShuffle(items: string[], seed: number) {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "from",
  "this",
  "what",
  "which",
  "when",
  "where",
  "why",
  "how",
  "into",
  "about",
  "project",
  "challenge",
  "game",
  "puzzle",
  "identify",
  "primary",
  "concern",
  "led",
]);

function pickPuzzleKeyword(question: string, options: string[]) {
  const optionCandidates = options
    .map((o) => String(o || "").trim())
    .filter(Boolean)
    .flatMap((o) =>
      o
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
        .filter((w) => w.length >= 4 && w.length <= 8)
    );
  if (optionCandidates.length > 0) {
    // Prefer answer-like compact token from options for puzzle relevance.
    return optionCandidates.sort((a, b) => b.length - a.length)[0].toUpperCase();
  }

  const optionWords = options
    .flatMap((x) => String(x || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/))
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const q = String(question || "").toLowerCase();
  const words = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

  // Prefer words that also appear in at least one option (more contextual).
  const optionText = options.join(" ").toLowerCase();
  const allCandidates = [...optionWords, ...words];
  const scored = allCandidates.map((w) => ({
    word: w,
    score:
      (optionText.includes(w) ? 3 : 0) +
      (w.length === 8 ? 4 : 0) +
      (w.length === 15 ? 3 : 0) +
      (w.length <= 15 ? 2 : -5) +
      Math.min(w.length, 12),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.word || words[0] || optionWords[0] || "quizmint";
  const normalized = best.replace(/[^a-z0-9]/g, "").toUpperCase();
  if (!normalized) return "TRINITY";
  if (normalized.length <= 8) return normalized;

  // Avoid clipped words like "SUCCESSF"; always choose full compact token.
  const fallback = [...optionWords, ...words].find((w) => w.length >= 4 && w.length <= 8);
  if (fallback) return fallback.toUpperCase();
  return normalized.slice(0, 8);
}

export function StudentPuzzleGame({
  questionId,
  question,
  options,
  puzzleKey,
  value,
  disabled,
  onChange,
}: Props) {
  const shuffled = useMemo(
    () => stableShuffle((Array.isArray(options) ? options : []).filter(Boolean), questionId),
    [options, questionId]
  );
  const puzzleWord = useMemo(
    () =>
      String(puzzleKey || "").trim()
        ? String(puzzleKey).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8)
        : pickPuzzleKeyword(question, shuffled),
    [question, shuffled, puzzleKey]
  );
  const boardSize = 3;
  const tileCount = 8;
  const tiles = useMemo(
    () =>
      (puzzleWord + puzzleWord + "QUIZ")
        .slice(0, tileCount)
        .split(""),
    [puzzleWord, tileCount]
  );
  const [board, setBoard] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [draggingTile, setDraggingTile] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const initial = buildSolvablePuzzle(questionId + shuffled.length, boardSize);
    setBoard(initial);
    setSolved(isSolvedPuzzle(initial));
  }, [questionId, shuffled.length, boardSize]);

  useEffect(() => {
    if (!solved) return;
    if (value === puzzleWord) return;
    onChange(puzzleWord);
  }, [solved, value, puzzleWord, onChange]);

  const moveTile = (idx: number) => {
    if (disabled || solved || !canMoveTile(board, idx)) return;
    const blank = board.indexOf(0);
    const next = [...board];
    [next[idx], next[blank]] = [next[blank], next[idx]];
    setBoard(next);
    setSolved(isSolvedPuzzle(next));
  };

  const getDirectionToBlank = (tileIndex: number) => {
    const blank = board.indexOf(0);
    const tr = Math.floor(tileIndex / boardSize);
    const tc = tileIndex % boardSize;
    const br = Math.floor(blank / boardSize);
    const bc = blank % boardSize;
    if (tr === br && tc + 1 === bc) return "right";
    if (tr === br && tc - 1 === bc) return "left";
    if (tc === bc && tr + 1 === br) return "down";
    if (tc === bc && tr - 1 === br) return "up";
    return null;
  };

  const handleTilePointerDown = (idx: number, x: number, y: number) => {
    if (disabled || solved || !canMoveTile(board, idx)) return;
    setDraggingTile(idx);
    setDragStart({ x, y });
  };

  const handleTilePointerUp = (idx: number, x: number, y: number) => {
    if (disabled || solved || !canMoveTile(board, idx)) {
      setDraggingTile(null);
      setDragStart(null);
      return;
    }
    const expected = getDirectionToBlank(idx);
    if (!expected) {
      setDraggingTile(null);
      setDragStart(null);
      return;
    }
    if (!dragStart) {
      moveTile(idx);
      return;
    }

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const clickLike = absX < 8 && absY < 8;
    const direction = absX >= absY ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";

    if (clickLike || direction === expected) moveTile(idx);
    setDraggingTile(null);
    setDragStart(null);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-amber-50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-amber-800">
          <span>Solve the board to unlock answer controls.</span>
          <span>{solved ? "Solved" : "In Progress"}</span>
        </div>
        <div className="mb-2 text-[11px] text-amber-700">
          Topic key: arrange <strong>{puzzleWord}</strong> left-to-right using slide moves.
        </div>
        <div
          className="relative mx-auto aspect-square w-full rounded-2xl border bg-zinc-900 p-2 shadow-inner"
          style={{ maxWidth: boardSize === 3 ? 320 : 420 }}
        >
          <div
            className="grid h-full w-full gap-2"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: boardSize * boardSize }).map((_, i) => (
              <div
                key={`${questionId}-slot-${i}`}
                className="rounded-lg border border-zinc-700/60 bg-zinc-800/70"
              />
            ))}
          </div>
          {board.map((tile, idx) => {
            if (tile === 0) return null;
            const row = Math.floor(idx / 3);
            const col = idx % 3;
            const movable = canMoveTile(board, idx);
            return (
              <div
                key={`${questionId}-tile-${tile}`}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onPointerDown={(e) => handleTilePointerDown(idx, e.clientX, e.clientY)}
                onPointerUp={(e) => handleTilePointerUp(idx, e.clientX, e.clientY)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    moveTile(idx);
                  }
                }}
                className={`absolute flex items-center justify-center rounded-xl border text-lg font-black select-none transition-all duration-200 ${
                  movable
                    ? "cursor-grab border-amber-400 bg-linear-to-br from-amber-300 to-orange-400 text-amber-950 shadow-lg"
                    : "cursor-default border-zinc-500 bg-linear-to-br from-zinc-200 to-zinc-300 text-zinc-700"
                } ${draggingTile === idx ? "scale-95 shadow-xl" : ""}`}
                style={{
                  width: `calc(${100 / boardSize}% - 10px)`,
                  height: `calc(${100 / boardSize}% - 10px)`,
                  left: `calc(${col * (100 / boardSize)}% + 5px)`,
                  top: `calc(${row * (100 / boardSize)}% + 5px)`,
                }}
                aria-label={`Puzzle tile ${tile}`}
              >
                {tiles[tile - 1] || tile}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-lg border px-3 py-2 text-sm ${
          solved
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-zinc-300 bg-zinc-50 text-zinc-600"
        }`}
      >
        {solved ? (
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Puzzle solved. Your answer is recorded automatically as <strong>{puzzleWord}</strong>.
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            Solve the board to submit this puzzle answer.
          </span>
        )}
      </div>
    </div>
  );
}
