"use client";

import { useEffect, useMemo, useState } from "react";

type MatchingItem = {
  key: string;
  label: string;
  text: string;
};

type Props = {
  question: string;
  options: string[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function parseLabeledLine(line: string): MatchingItem | null {
  const m = line.match(/^\s*([A-Za-z]|\d+)[\)\].:\-]\s*(.+)\s*$/);
  if (!m) return null;
  const label = String(m[1]).trim();
  const text = String(m[2]).trim();
  if (!text) return null;
  return {
    key: `${label}:${text}`,
    label,
    text,
  };
}

function parseColumns(question: string, options: string[]) {
  const lines = [
    ...String(question || "").split(/\r?\n/),
    ...options.flatMap((o) => String(o || "").split(/\r?\n/)),
  ]
    .map((x) => x.trim())
    .filter(Boolean);

  const left: MatchingItem[] = [];
  const right: MatchingItem[] = [];

  for (const line of lines) {
    const item = parseLabeledLine(line);
    if (!item) continue;
    if (/^\d+$/.test(item.label)) {
      left.push(item);
    } else {
      right.push(item);
    }
  }

  return {
    left: dedupeByKey(left),
    right: dedupeByKey(right),
  };
}

function dedupeByKey(items: MatchingItem[]) {
  const seen = new Set<string>();
  const out: MatchingItem[] = [];
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push(item);
  }
  return out;
}

function parseExistingAnswer(value: string) {
  const out: Record<string, string> = {};
  for (const line of String(value || "").split(/\r?\n|;/)) {
    const parts = line.split(/\s*(?:->|:|-|=)\s*/);
    if (parts.length < 2) continue;
    const left = parts[0]?.trim();
    const right = parts.slice(1).join(" ").trim();
    if (!left || !right) continue;
    out[left] = right;
  }
  return out;
}

export function StudentMatchingQuestion({
  question,
  options,
  value,
  disabled,
  onChange,
}: Props) {
  const { left, right } = useMemo(() => parseColumns(question, options), [question, options]);
  const parsedExisting = useMemo(() => parseExistingAnswer(value), [value]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (left.length === 0 || right.length === 0) return;
    const seeded: Record<string, string> = {};
    for (const l of left) {
      const byLabel = parsedExisting[l.label];
      const byText = parsedExisting[l.text];
      const raw = byLabel || byText;
      if (!raw) continue;
      const found = right.find((r) => raw.includes(r.label) || raw.includes(r.text));
      if (found) seeded[l.key] = found.key;
    }
    setMapping(seeded);
  }, [left, right, parsedExisting]);

  if (left.length === 0 || right.length === 0) {
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
    <div className="space-y-3 rounded-lg border bg-sky-50/60 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-sky-900">
        <div className="rounded bg-white px-2 py-1">Column A</div>
        <div className="rounded bg-white px-2 py-1">Column B</div>
      </div>

      {left.map((l) => (
        <div key={l.key} className="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_220px]">
          <div className="rounded border bg-white px-3 py-2 text-sm">
            <span className="mr-1 font-semibold text-sky-700">{l.label}.</span>
            {l.text}
          </div>
          <select
            disabled={disabled}
            value={mapping[l.key] || ""}
            onChange={(e) => {
              const next = { ...mapping, [l.key]: e.target.value };
              setMapping(next);
              const lines = left
                .map((li) => {
                  const rightKey = next[li.key];
                  if (!rightKey) return null;
                  const ri = right.find((r) => r.key === rightKey);
                  if (!ri) return null;
                  return `${li.label} -> ${ri.label}`;
                })
                .filter((x): x is string => Boolean(x));
              onChange(lines.join("\n"));
            }}
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          >
            <option value="">Select match...</option>
            {right.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}. {r.text}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="text-[11px] text-sky-800">
        Choose one match for each item in Column A.
      </div>
    </div>
  );
}

