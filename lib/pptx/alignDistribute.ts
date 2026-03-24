import type { CanvasBounds } from "@/lib/pptx/types";

export function alignBoundsStart(bounds: CanvasBounds[], axis: "x" | "y") {
  if (!bounds.length) return bounds;
  const start = Math.min(...bounds.map((item) => item[axis]));
  return bounds.map((item) => ({ ...item, [axis]: start }));
}

export function distributeBounds(bounds: CanvasBounds[], axis: "x" | "y") {
  if (bounds.length < 3) return bounds;
  const sorted = [...bounds].sort((a, b) => a[axis] - b[axis]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpan = last[axis] - first[axis];
  const gap = totalSpan / (sorted.length - 1);
  return sorted.map((item, index) => ({ ...item, [axis]: first[axis] + gap * index }));
}
