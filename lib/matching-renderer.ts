export type MatchingItem = {
  key: string;
  label: string;
  text: string;
};

export function parseLabeledLine(line: string): MatchingItem | null {
  const m = String(line || "").match(/^\s*([A-Za-z]|\d+)[\)\].:\-]\s*(.+)\s*$/);
  if (!m) return null;
  const label = String(m[1]).trim();
  const text = String(m[2]).trim();
  if (!text) return null;
  return { key: `${label}:${text}`, label, text };
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

export function parseMatchingColumns(question: string, options: string[]) {
  const lines = [
    ...String(question || "").split(/\r?\n/),
    ...(Array.isArray(options) ? options : []).flatMap((o) =>
      String(o || "").split(/\r?\n/)
    ),
  ]
    .map((x) => x.trim())
    .filter(Boolean);

  const left: MatchingItem[] = [];
  const right: MatchingItem[] = [];
  for (const line of lines) {
    const item = parseLabeledLine(line);
    if (!item) continue;
    if (/^\d+$/.test(item.label)) left.push(item);
    else right.push(item);
  }

  const cleanLeft = dedupeByKey(left);
  const cleanRight = dedupeByKey(right);

  if (cleanLeft.length >= 2 && cleanRight.length >= 2) {
    return { left: cleanLeft, right: cleanRight };
  }

  const safeOptions = (Array.isArray(options) ? options : [])
    .map((o) => String(o || "").trim())
    .filter(Boolean);

  // Fallback: split options into two columns so matching stays interactive.
  if (safeOptions.length >= 4) {
    const half = Math.floor(safeOptions.length / 2);
    const fallbackLeft = safeOptions.slice(0, half).map((text, i) => ({
      key: `${i + 1}:${text}`,
      label: String(i + 1),
      text,
    }));
    const fallbackRight = safeOptions.slice(half).map((text, i) => ({
      key: `${String.fromCharCode(65 + i)}:${text}`,
      label: String.fromCharCode(65 + i),
      text,
    }));
    return {
      left: dedupeByKey(fallbackLeft),
      right: dedupeByKey(fallbackRight),
    };
  }

  return { left: cleanLeft, right: cleanRight };
}

export function parseMatchingAnswer(value: string) {
  try {
    const parsed = JSON.parse(String(value || "")) as {
      kind?: string;
      map?: Record<string, string>;
    };
    if (parsed?.kind === "matching_map" && parsed.map && typeof parsed.map === "object") {
      return parsed.map;
    }
  } catch {
    // fall back to line parser
  }
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

export function serializeMatchingAnswer(
  mapping: Record<string, string>,
  left: MatchingItem[],
  right: MatchingItem[]
) {
  return left
    .map((l) => {
      const rightKey = mapping[l.key];
      if (!rightKey) return null;
      const r = right.find((x) => x.key === rightKey);
      if (!r) return null;
      return `${l.label} -> ${r.label}`;
    })
    .filter((x): x is string => Boolean(x))
    .join("\n");
}
