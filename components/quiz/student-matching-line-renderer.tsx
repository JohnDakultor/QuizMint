"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseMatchingAnswer,
  parseMatchingColumns,
  serializeMatchingAnswer,
} from "@/lib/matching-renderer";

type Props = {
  question: string;
  options: string[];
  structure?:
    | {
        type: "matching";
        left: Array<{ id: string; text: string }>;
        right: Array<{ id: string; text: string }>;
      }
    | null;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

type Line = { leftKey: string; x1: number; y1: number; x2: number; y2: number };

export function StudentMatchingLineRenderer({
  question,
  options,
  structure,
  value,
  disabled,
  onChange,
}: Props) {
  const { left, right } = useMemo(
    () =>
      structure?.type === "matching"
        ? {
            left: structure.left.map((x) => ({
              key: String(x.id),
              label: String(x.id),
              text: String(x.text),
            })),
            right: structure.right.map((x) => ({
              key: String(x.id),
              label: String(x.id),
              text: String(x.text),
            })),
          }
        : parseMatchingColumns(question, options),
    [question, options, structure]
  );
  const parsed = useMemo(() => parseMatchingAnswer(value), [value]);

  const [selectedLeft, setSelectedLeft] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>([]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const seeded: Record<string, string> = {};
    for (const l of left) {
      const raw = parsed[l.key] || parsed[l.label] || parsed[l.text];
      if (!raw) continue;
      const found = right.find(
        (r) => raw === r.key || raw.includes(r.label) || raw.includes(r.text)
      );
      if (found) seeded[l.key] = found.key;
    }
    setMapping(seeded);
  }, [left, right, parsed]);

  useEffect(() => {
    if (structure?.type === "matching") {
      const selected = JSON.stringify({
        kind: "matching_map",
        map: mapping,
      });
      onChangeRef.current(selected);
      return;
    }
    onChangeRef.current(serializeMatchingAnswer(mapping, left, right));
  }, [mapping, left, right, structure]);

  useEffect(() => {
    const recalc = () => {
      const rootRect = rootRef.current?.getBoundingClientRect();
      if (!rootRect) return;
      const next: Line[] = [];
      for (const l of left) {
        const rightKey = mapping[l.key];
        if (!rightKey) continue;
        const lRect = leftRefs.current[l.key]?.getBoundingClientRect();
        const rRect = rightRefs.current[rightKey]?.getBoundingClientRect();
        if (!lRect || !rRect) continue;
        next.push({
          leftKey: l.key,
          x1: lRect.right - rootRect.left,
          y1: lRect.top + lRect.height / 2 - rootRect.top,
          x2: rRect.left - rootRect.left,
          y2: rRect.top + rRect.height / 2 - rootRect.top,
        });
      }
      setLines(next);
    };

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [left, mapping]);

  if (left.length < 2 || right.length < 2) {
    return (
      <textarea
        placeholder="Enter matches one per line, e.g. 1 -> A"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full rounded border px-3 py-2 text-sm"
      />
    );
  }

  return (
    <div ref={rootRef} className="relative rounded-lg border bg-sky-50/60 p-3">
      <div className="mb-2 rounded border bg-white p-2 text-xs text-sky-900">
        Tap an item on the left, then tap its match on the right. Lines will connect automatically.
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {lines.map((line) => (
          <path
            key={line.leftKey}
            d={`M ${line.x1} ${line.y1} C ${line.x1 + 40} ${line.y1}, ${line.x2 - 40} ${line.y2}, ${line.x2} ${line.y2}`}
            stroke="#0284c7"
            strokeWidth="2.5"
            fill="none"
          />
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="rounded bg-white px-2 py-1 text-xs font-semibold text-sky-800">Column A</div>
          {left.map((l) => (
            <button
              key={l.key}
              ref={(el) => {
                leftRefs.current[l.key] = el;
              }}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedLeft((prev) => (prev === l.key ? "" : l.key))}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${
                selectedLeft === l.key ? "border-sky-500 bg-sky-100" : "bg-white"
              }`}
            >
              <span className="mr-1 font-semibold text-sky-700">{l.label}.</span>
              {l.text}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="rounded bg-white px-2 py-1 text-xs font-semibold text-sky-800">Column B</div>
          {right.map((r) => (
            <button
              key={r.key}
              ref={(el) => {
                rightRefs.current[r.key] = el;
              }}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!selectedLeft) return;
                setMapping((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => {
                    if (next[k] === r.key) delete next[k];
                  });
                  next[selectedLeft] = r.key;
                  return next;
                });
                setSelectedLeft("");
              }}
              className="w-full rounded border bg-white px-3 py-2 text-left text-sm"
            >
              <span className="mr-1 font-semibold text-indigo-700">{r.label}.</span>
              {r.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
