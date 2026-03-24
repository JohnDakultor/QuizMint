"use client";

import { Grid3X3 } from "lucide-react";

type Props = {
  questionId: number;
  options: string[];
  value: string;
  disabled?: boolean;
  onPick: (next: string) => void;
};

export function StudentSudokuGame({ questionId, options, value, disabled, onPick }: Props) {
  const shuffled = Array.isArray(options) ? options : [];

  return (
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
              onChange={() => onPick(opt)}
              disabled={Boolean(disabled)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

