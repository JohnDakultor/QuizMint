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
type DraftLine = { x1: number; y1: number; x2: number; y2: number } | null;

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
  const [draftLine, setDraftLine] = useState<DraftLine>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getLeftAnchor = (leftKey: string) => {
    const rootRect = rootRef.current?.getBoundingClientRect();
    const leftRect = leftRefs.current[leftKey]?.getBoundingClientRect();
    if (!rootRect || !leftRect) return null;
    return {
      x: leftRect.right - rootRect.left,
      y: leftRect.top + leftRect.height / 2 - rootRect.top,
    };
  };

  const connectLeftToRight = (leftKey: string, rightKey: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === rightKey) delete next[k];
      });
      next[leftKey] = rightKey;
      return next;
    });
    setSelectedLeft("");
    setDraftLine(null);
  };

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

  useEffect(() => {
    if (!selectedLeft || disabled) {
      setDraftLine(null);
      return;
    }

    const anchor = getLeftAnchor(selectedLeft);
    if (!anchor) return;
    setDraftLine((prev) =>
      prev && prev.x1 === anchor.x && prev.y1 === anchor.y
        ? prev
        : { x1: anchor.x, y1: anchor.y, x2: anchor.x, y2: anchor.y }
    );

    const handlePointerMove = (event: PointerEvent) => {
      const rootRect = rootRef.current?.getBoundingClientRect();
      if (!rootRect) return;
      setDraftLine({
        x1: anchor.x,
        y1: anchor.y,
        x2: event.clientX - rootRect.left,
        y2: event.clientY - rootRect.top,
      });
    };

    const handlePointerUp = () => {
      setDraftLine(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [selectedLeft, disabled]);

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
    <div ref={rootRef} className="relative mx-auto w-full max-w-5xl rounded-xl border bg-sky-50/60 p-4 md:p-5">
      <div className="mb-2 rounded border bg-white p-2 text-xs text-sky-900">
        Drag from a left item to the correct right item, or tap left then right. Matching is scored automatically.
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
        {draftLine && (
          <path
            d={`M ${draftLine.x1} ${draftLine.y1} C ${draftLine.x1 + 40} ${draftLine.y1}, ${draftLine.x2 - 40} ${draftLine.y2}, ${draftLine.x2} ${draftLine.y2}`}
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="7 6"
            fill="none"
          />
        )}
      </svg>

      <div className="grid grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)] items-start gap-2 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] md:gap-4">
        <div className="flex flex-col items-end space-y-2">
          <div className="rounded bg-white px-2 py-1 text-xs font-semibold text-sky-800">Column A</div>
          {left.map((l) => (
            <button
              key={l.key}
              ref={(el) => {
                leftRefs.current[l.key] = el;
              }}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedLeft((prev) => (prev === l.key ? "" : l.key));
                const anchor = getLeftAnchor(l.key);
                if (anchor) {
                  setDraftLine({ x1: anchor.x, y1: anchor.y, x2: anchor.x, y2: anchor.y });
                }
              }}
              onPointerDown={(e) => {
                if (disabled) return;
                setSelectedLeft(l.key);
                const rootRect = rootRef.current?.getBoundingClientRect();
                const anchor = getLeftAnchor(l.key);
                if (anchor && rootRect) {
                  setDraftLine({
                    x1: anchor.x,
                    y1: anchor.y,
                    x2: e.clientX - rootRect.left,
                    y2: e.clientY - rootRect.top,
                  });
                }
              }}
              className={`w-fit max-w-full rounded-lg border px-4 py-3 text-left text-sm ${
                selectedLeft === l.key ? "border-sky-500 bg-sky-100" : "bg-white"
              }`}
              style={{ minWidth: "min(100%, 220px)" }}
            >
              <span className="mr-1 font-semibold text-sky-700">{l.label}.</span>
              {l.text}
            </button>
          ))}
        </div>

        <div className="pointer-events-none flex h-full min-h-[220px] items-center justify-center">
          <div className="h-full w-px bg-linear-to-b from-transparent via-sky-300 to-transparent" />
        </div>

        <div className="flex flex-col items-start space-y-2">
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
                connectLeftToRight(selectedLeft, r.key);
              }}
              onPointerUp={() => {
                if (!selectedLeft || disabled) return;
                connectLeftToRight(selectedLeft, r.key);
              }}
              className="w-fit max-w-full rounded-lg border bg-white px-4 py-3 text-left text-sm"
              style={{ minWidth: "min(100%, 220px)" }}
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
