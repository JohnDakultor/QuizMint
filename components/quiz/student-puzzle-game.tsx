"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Puzzle, Sparkles } from "lucide-react";
import { buildSolvablePuzzle, canMoveTile, isSolvedPuzzle } from "@/lib/puzzle-game";

const StudentPuzzleStage = dynamic(
  () => import("@/components/quiz/student-puzzle-stage"),
  { ssr: false }
);

type Props = {
  questionId: number;
  question: string;
  options: string[];
  difficulty?: "easy" | "medium" | "hard";
  puzzleKey?: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
};

type Point = { x: number; y: number };

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

  const fallback = [...optionWords, ...words].find((w) => w.length >= 4 && w.length <= 8);
  if (fallback) return fallback.toUpperCase();
  return normalized.slice(0, 8);
}

function getPuzzleBoardSize(wordLength: number) {
  if (wordLength <= 8) return 3;
  if (wordLength <= 15) return 4;
  return 5;
}

function buildTileLetters(word: string, tileCount: number) {
  const normalized = String(word || "")
    .replace(/[^A-Z0-9]/g, "")
    .toUpperCase();
  const seed = (normalized + "QUIZMINTPUZZLE").repeat(
    Math.ceil(tileCount / Math.max(normalized.length, 1))
  );
  return seed.slice(0, tileCount).split("");
}

function getDirectionToBlank(board: number[], tileIndex: number, boardSize: number) {
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
}

function isDragTowardBlank(
  movement: Point,
  expected: "up" | "down" | "left" | "right" | null,
  threshold: number
) {
  if (!expected) return false;
  const { x, y } = movement;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  switch (expected) {
    case "right":
      return x > threshold && absX >= absY;
    case "left":
      return x < -threshold && absX >= absY;
    case "down":
      return y > threshold && absY >= absX;
    case "up":
      return y < -threshold && absY >= absX;
    default:
      return false;
  }
}

export function StudentPuzzleGame({
  questionId,
  question,
  options,
  difficulty = "medium",
  puzzleKey,
  value,
  disabled,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState(320);
  const shuffled = useMemo(
    () => stableShuffle((Array.isArray(options) ? options : []).filter(Boolean), questionId),
    [options, questionId]
  );
  const puzzleWord = useMemo(
    () =>
      String(puzzleKey || "").trim()
        ? String(puzzleKey).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 24)
        : pickPuzzleKeyword(question, shuffled),
    [question, shuffled, puzzleKey]
  );
  const boardSize = useMemo(() => getPuzzleBoardSize(puzzleWord.length), [puzzleWord.length]);
  const tileCount = boardSize * boardSize - 1;
  const tileLetters = useMemo(
    () => buildTileLetters(puzzleWord, tileCount),
    [puzzleWord, tileCount]
  );
  const [board, setBoard] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const maxStageSize = boardSize === 3 ? 360 : boardSize === 4 ? 420 : 500;
      const styles = window.getComputedStyle(node);
      const paddingLeft = Number.parseFloat(styles.paddingLeft || "0") || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight || "0") || 0;
      const innerWidth = node.clientWidth - paddingLeft - paddingRight;
      const safeInnerWidth = innerWidth - 10;
      const next = Math.max(214, Math.min(maxStageSize, Math.floor(safeInnerWidth)));
      setStageSize(next);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [boardSize]);

  useEffect(() => {
    const moveCount =
      difficulty === "easy" ? 14 : difficulty === "hard" ? 34 : 24;
    const initial = buildSolvablePuzzle(
      questionId + shuffled.length,
      boardSize,
      moveCount
    );
    setBoard(initial);
    setSolved(isSolvedPuzzle(initial));
  }, [questionId, shuffled.length, boardSize, difficulty]);

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

  const gap = boardSize >= 5 ? 7 : 8;
  const outerMargin = boardSize === 3 ? 18 : boardSize === 4 ? 16 : 14;
  const usablePixels = stageSize - outerMargin * 2;
  const rawCellSize = (usablePixels - gap * (boardSize - 1)) / boardSize;
  const cellSize = Math.max(42, Math.floor(rawCellSize - 4));
  const dragThreshold = Math.max(18, cellSize * 0.22);
  const totalBoardWidth = cellSize * boardSize + gap * (boardSize - 1);
  const boardOffset = Math.floor((stageSize - totalBoardWidth) / 2);

  const tilePosition = (idx: number) => {
    const row = Math.floor(idx / boardSize);
    const col = idx % boardSize;
    return {
      x: boardOffset + col * (cellSize + gap),
      y: boardOffset + row * (cellSize + gap),
    };
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-amber-50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-amber-800">
          <span>Solve the board to unlock answer controls.</span>
          <span>{solved ? "Solved" : "In Progress"}</span>
        </div>
        <div className="mb-3 text-[11px] font-semibold text-amber-700">
          {difficulty === "easy"
            ? "Easy scramble"
            : difficulty === "hard"
            ? "Hard scramble"
            : "Medium scramble"}
          {` · ${boardSize}x${boardSize}`}
        </div>

        <div
          ref={containerRef}
          className={`mx-auto w-full rounded-[28px] border border-zinc-800 bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-2 shadow-[0_22px_60px_-24px_rgba(15,23,42,0.9)] ${
            boardSize === 3
              ? "max-w-[360px]"
              : boardSize === 4
              ? "max-w-[420px]"
              : "max-w-[500px]"
          }`}
        >
          {mounted ? (
            <div className="flex justify-center">
              <StudentPuzzleStage
                board={board}
                boardSize={boardSize}
                stageSize={stageSize}
                questionId={questionId}
                cellSize={cellSize}
                tileLetters={tileLetters}
                disabled={disabled}
                solved={solved}
                dragThreshold={dragThreshold}
                blankIndex={board.indexOf(0)}
                canMove={(idx) => canMoveTile(board, idx)}
                getTilePosition={tilePosition}
                getDirectionToBlank={(idx) =>
                  getDirectionToBlank(board, idx, boardSize) as
                    | "up"
                    | "down"
                    | "left"
                    | "right"
                    | null
                }
                moveTile={moveTile}
                isDragTowardBlank={isDragTowardBlank}
              />
            </div>
          ) : (
            <div className="aspect-square w-full rounded-[22px] bg-zinc-900" />
          )}
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
            Drag a glowing tile toward the empty slot, or tap it, to solve the board.
          </span>
        )}
      </div>
    </div>
  );
}
