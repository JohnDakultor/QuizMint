"use client";

import { useMemo } from "react";

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
    <div className="space-y-3 rounded-lg border bg-amber-50/60 p-3">
      {structure?.instructions && (
        <div className="rounded border bg-white p-2 text-xs text-amber-900">
          {structure.instructions}
        </div>
      )}

      {structure?.parts?.length ? (
        <div className="space-y-2">
          {structure.parts.map((part) => (
            <div key={part.id} className="rounded border bg-white p-2">
              <div className="mb-1 text-xs font-semibold text-amber-900">{part.prompt}</div>
              <input
                type="text"
                placeholder="Enter your answer"
                value={partAnswers[part.id] || ""}
                onChange={(e) => {
                  const nextAnswers = { ...partAnswers, [part.id]: e.target.value };
                  onChange(JSON.stringify({ kind: "worksheet_parts", answers: nextAnswers }));
                }}
                disabled={disabled}
                className="w-full rounded border bg-white px-3 py-2 text-sm font-medium"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
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
            className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
          >
            {k}
          </button>
        ))}
      </div>

      {!structure?.parts?.length && (
        <input
          type="text"
          placeholder="Enter your answer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded border bg-white px-3 py-2 text-sm font-medium"
        />
      )}
    </div>
  );
}
