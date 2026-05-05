"use client";

import { useMemo } from "react";
import { MathText } from "@/components/quiz/math-text";

type Props = {
  structure?:
    | {
        type: "worksheet";
        instructions?: string;
        parts: Array<{ id: string; prompt: string }>;
      }
    | null;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function StudentWorksheetQuestion({ structure, value, disabled, onChange }: Props) {
  const quickKeys = useMemo(
    () => ["+", "-", "x", "/", "=", "^", "(", ")", ".", ","],
    []
  );
  const partAnswers = useMemo(() => {
    try {
      const parsed = JSON.parse(String(value || "")) as {
        kind?: string;
        answers?: Record<string, string>;
      };
      if (parsed?.kind === "worksheet_parts" && parsed.answers && typeof parsed.answers === "object") {
        return parsed.answers;
      }
    } catch {
      // ignore
    }
    return {} as Record<string, string>;
  }, [value]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 rounded-xl border bg-amber-50/60 p-4 md:p-5">
      {structure?.instructions && (
        <div className="rounded-xl border bg-white p-3 text-sm text-amber-900 shadow-sm">
          <MathText>{structure.instructions}</MathText>
        </div>
      )}

      {structure?.parts?.length ? (
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {structure.parts.map((part, index) => (
            <div key={part.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-start gap-2">
                <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  {index + 1}
                </span>
                <div className="pt-1 text-sm font-semibold leading-relaxed text-amber-950">
                  <MathText>{part.prompt}</MathText>
                </div>
              </div>
              <input
                type="text"
                placeholder="Enter your answer"
                value={partAnswers[part.id] || ""}
                onChange={(e) => {
                  const nextAnswers = { ...partAnswers, [part.id]: e.target.value };
                  onChange(JSON.stringify({ kind: "worksheet_parts", answers: nextAnswers }));
                }}
                disabled={disabled}
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
          Quick Keys
        </div>
        <div className="flex flex-wrap gap-1.5">
        {quickKeys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (structure?.parts?.length) {
                const firstId = structure.parts[0]?.id;
                if (!firstId) return;
                const nextAnswers = {
                  ...partAnswers,
                  [firstId]: `${partAnswers[firstId] || ""}${k}`,
                };
                onChange(JSON.stringify({ kind: "worksheet_parts", answers: nextAnswers }));
                return;
              }
              onChange(`${value || ""}${k}`);
            }}
            className="rounded-md border bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {k}
          </button>
        ))}
        </div>
      </div>

      {!structure?.parts?.length && (
        <input
          type="text"
          placeholder="Enter your answer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium shadow-sm"
        />
      )}
    </div>
  );
}
