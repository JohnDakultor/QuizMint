"use client";

import { useEffect, useMemo, useState } from "react";
import { Puzzle, Sparkles, Timer, Trophy } from "lucide-react";
import { inferGamifiedMode } from "@/lib/quiz-question-types";
import { StudentPuzzleGame } from "@/components/quiz/student-puzzle-game";
import { StudentBingoGame } from "@/components/quiz/student-bingo-game";
import { StudentSudokuGame } from "@/components/quiz/student-sudoku-game";

type Props = {
  questionId: number;
  question: string;
  options: string[];
  answerKey?: string;
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


function ModeBanner({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "amber" | "emerald" | "purple";
}) {
  const toneClasses =
    tone === "emerald"
      ? "from-emerald-500 to-teal-500"
      : tone === "purple"
      ? "from-violet-500 to-indigo-500"
      : "from-amber-500 to-orange-500";

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${toneClasses} p-3 text-white`}>
      <div className="pointer-events-none absolute -right-3 -top-3 opacity-25">
        <Sparkles className="h-10 w-10" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide">{title}</div>
          <div className="text-[11px] text-white/90">{subtitle}</div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px]">
          <Trophy className="h-3.5 w-3.5" />
          +25 XP
        </div>
      </div>
    </div>
  );
}

export function StudentGamifiedQuestion(props: Props) {
  const { questionId, question, options, answerKey, puzzleKey, value, disabled, onChange } = props;
  const mode = inferGamifiedMode(question);
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const shuffled = useMemo(() => stableShuffle(safeOptions, questionId), [safeOptions, questionId]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handlePick = (next: string) => {
    if (disabled) return;
    onChange(next);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const gameHud = (
    <div className="grid grid-cols-1 gap-2 text-[11px]">
      <div className="rounded-md border bg-white px-2 py-1 text-zinc-700 inline-flex items-center gap-1 w-fit">
        <Timer className="h-3.5 w-3.5 text-blue-600" />
        {mm}:{ss}
      </div>
    </div>
  );

  if (mode === "bingo") {
    return (
      <div className="space-y-3">
        <ModeBanner title="Super Race" subtitle="Choose the fastest correct lane to win this round." tone="emerald" />
        {gameHud}
        <StudentBingoGame
          questionId={questionId}
          question={question}
          options={shuffled}
          answerKey={answerKey}
          value={value}
          disabled={Boolean(disabled)}
          onPick={handlePick}
        />
      </div>
    );
  }

  if (mode === "sudoku" && shuffled.length >= 4) {
    return (
      <div className="space-y-3">
        <ModeBanner title="Sudoku Logic" subtitle="Find the best option that satisfies the pattern." tone="purple" />
        {gameHud}
        <StudentSudokuGame
          questionId={questionId}
          options={shuffled}
          value={value}
          disabled={Boolean(disabled)}
          onPick={handlePick}
        />
      </div>
    );
  }

  if (mode === "puzzle") {
    return (
      <div className="space-y-3">
        <ModeBanner
          title="Puzzle Stage"
          subtitle="Solve the puzzle, then answer the challenge."
          tone="amber"
        />
        {gameHud}
        <StudentPuzzleGame
          questionId={questionId}
          question={question}
          options={shuffled}
          puzzleKey={puzzleKey}
          value={value}
          disabled={Boolean(disabled)}
          onChange={handlePick}
        />
      </div>
    );
  }

  if (shuffled.length >= 2) {
    return (
      <div className="space-y-3">
        <ModeBanner title="Game Stage" subtitle="Choose the best move." tone="amber" />
        {gameHud}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shuffled.map((opt, idx) => (
            <button
              key={`${questionId}-choice-${idx}`}
              type="button"
              onClick={() => handlePick(opt)}
              disabled={Boolean(disabled)}
              className={`rounded-xl border p-3 text-left transition-all ${
                value === opt
                  ? "border-amber-500 bg-amber-50 shadow-lg ring-2 ring-amber-200"
                  : "border-zinc-300 bg-white hover:-translate-y-0.5 hover:shadow-sm"
              }`}
            >
              <div className="mb-1 inline-flex items-center gap-1 text-xs text-zinc-500">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Choice {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Puzzle className="h-4 w-4 text-amber-500" />
                <span>{opt}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <input
      type="text"
      placeholder="Type your race answer"
      value={value}
      onChange={(e) => handlePick(e.target.value)}
      disabled={Boolean(disabled)}
      className="w-full rounded border px-3 py-2 text-sm"
    />
  );
}
