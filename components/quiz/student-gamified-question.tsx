"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Grid3X3, Puzzle, Sparkles, Timer, Trophy, Zap } from "lucide-react";
import { inferGamifiedMode } from "@/lib/quiz-question-types";

type Props = {
  questionId: number;
  question: string;
  options: string[];
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
  const { questionId, question, options, value, disabled, onChange } = props;
  const mode = inferGamifiedMode(question);
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const shuffled = useMemo(() => stableShuffle(safeOptions, questionId), [safeOptions, questionId]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [bingoMessage, setBingoMessage] = useState<string>("");
  const [hintedAnswer, setHintedAnswer] = useState<string>("");
  const [usedPowers, setUsedPowers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handlePick = (next: string) => {
    if (disabled) return;
    setMoves((prev) => prev + 1);
    setCombo((prev) => Math.min(prev + 1, 9));
    onChange(next);
  };

  const energy = Math.max(15, 100 - moves * 4);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const gameHud = (
    <div className="grid grid-cols-3 gap-2 text-[11px]">
      <div className="rounded-md border bg-white px-2 py-1 text-zinc-700 inline-flex items-center gap-1">
        <Timer className="h-3.5 w-3.5 text-blue-600" />
        {mm}:{ss}
      </div>
      <div className="rounded-md border bg-white px-2 py-1 text-zinc-700 inline-flex items-center gap-1">
        <Zap className="h-3.5 w-3.5 text-amber-600" />
        Combo x{combo}
      </div>
      <div className="rounded-md border bg-white px-2 py-1 text-zinc-700 inline-flex items-center gap-1">
        <Flame className="h-3.5 w-3.5 text-rose-600" />
        Moves {moves}
      </div>
      <div className="col-span-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${energy}%` }} />
      </div>
    </div>
  );

  if (mode === "bingo" && shuffled.length >= 4) {
    const cells = [...shuffled, "Free", "Bonus", "Hint", "Challenge"].slice(0, 9);
    const palette = [
      "from-pink-500 to-rose-500",
      "from-emerald-500 to-teal-500",
      "from-violet-500 to-indigo-500",
      "from-amber-500 to-orange-500",
      "from-sky-500 to-cyan-500",
    ];

    const handleBingoCellClick = (cell: string) => {
      if (disabled) return;

      if (cell === "Hint") {
        if (usedPowers.Hint) {
          setBingoMessage("Hint already used.");
          return;
        }
        const answer = safeOptions[0] || "";
        setHintedAnswer(answer);
        setUsedPowers((prev) => ({ ...prev, Hint: true }));
        setBingoMessage(answer ? `Hint: look closely at "${answer}".` : "No hint available.");
        return;
      }

      if (cell === "Bonus") {
        if (usedPowers.Bonus) {
          setBingoMessage("Bonus already used.");
          return;
        }
        setCombo((prev) => Math.min(prev + 2, 9));
        setUsedPowers((prev) => ({ ...prev, Bonus: true }));
        setBingoMessage("Bonus activated: combo boosted.");
        return;
      }

      if (cell === "Challenge") {
        if (usedPowers.Challenge) {
          setBingoMessage("Challenge already used.");
          return;
        }
        setCombo((prev) => Math.min(prev + 3, 9));
        setMoves((prev) => Math.max(prev - 1, 0));
        setUsedPowers((prev) => ({ ...prev, Challenge: true }));
        setBingoMessage("Challenge activated: combo up, move cost reduced.");
        return;
      }

      if (cell === "Free") {
        if (usedPowers.Free) {
          setBingoMessage("Free tile already claimed.");
          return;
        }
        setUsedPowers((prev) => ({ ...prev, Free: true }));
        setBingoMessage("Free tile claimed.");
        handlePick(cell);
        return;
      }

      setBingoMessage("");
      handlePick(cell);
    };

    return (
      <div className="space-y-3">
        <ModeBanner title="Bingo Challenge" subtitle="Pick the correct tile and clear this board." tone="emerald" />
        {gameHud}
        <div className="grid grid-cols-3 gap-2">
          {cells.map((cell, idx) => {
            const isAnswer = safeOptions.includes(cell);
            const isPower = cell === "Free" || cell === "Bonus" || cell === "Hint" || cell === "Challenge";
            const isHinted = hintedAnswer && cell === hintedAnswer;
            const selected = value === cell;
            return (
              <button
                key={`${questionId}-bingo-${idx}`}
                type="button"
                disabled={Boolean(disabled) || (!isAnswer && !isPower)}
                onClick={() => (isAnswer || isPower) && handleBingoCellClick(cell)}
                className={`group relative overflow-hidden rounded-lg border px-2 py-3 text-xs font-semibold transition-all ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-800 shadow-lg ring-2 ring-blue-200"
                    : isHinted
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200"
                    : "border-zinc-300 bg-white hover:-translate-y-0.5 hover:shadow-sm"
                } ${disabled || (!isAnswer && !isPower) ? "opacity-70" : ""}`}
              >
                <div
                  className={`absolute inset-0 -z-10 opacity-90 ${
                    selected ? "bg-blue-100" : `bg-gradient-to-br ${palette[idx % palette.length]}`
                  }`}
                />
                <div className={selected ? "" : "text-white"}>{cell}</div>
              </button>
            );
          })}
        </div>
        {bingoMessage ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
            {bingoMessage}
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === "sudoku" && shuffled.length >= 4) {
    return (
      <div className="space-y-3">
        <ModeBanner title="Sudoku Logic" subtitle="Find the best option that satisfies the pattern." tone="purple" />
        {gameHud}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-zinc-50 p-2">
            <div className="mb-2 inline-flex items-center gap-1 text-[11px] text-zinc-600">
              <Grid3X3 className="h-3.5 w-3.5" />
              Pattern Grid
            </div>
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={`sudoku-${i}`}
                  className="flex h-8 items-center justify-center rounded border bg-white text-xs font-semibold text-zinc-700"
                >
                  {i % 4 === 0 ? "?" : ((questionId + i) % 9) + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {shuffled.map((opt, idx) => (
              <label
                key={`${questionId}-sudoku-${idx}`}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  value === opt
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-zinc-300 bg-white hover:bg-zinc-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${questionId}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => handlePick(opt)}
                  disabled={Boolean(disabled)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (shuffled.length >= 2) {
    return (
      <div className="space-y-3">
        <ModeBanner title="Puzzle Stage" subtitle="Choose the best move to clear this level." tone="amber" />
        {gameHud}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shuffled.map((opt, idx) => (
            <button
              key={`${questionId}-puzzle-${idx}`}
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
                <span>Move {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Puzzle className="h-4 w-4 text-amber-500" />
                <span>{opt}</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Flame className="h-3.5 w-3.5" />
                Combo points on correct pick
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
      placeholder="Type your game answer"
      value={value}
      onChange={(e) => handlePick(e.target.value)}
      disabled={Boolean(disabled)}
      className="w-full rounded border px-3 py-2 text-sm"
    />
  );
}
