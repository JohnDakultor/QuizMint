import type { LayoutStyleKey, ToneKey, ToneStyle, EditablePptSlide } from "@/lib/pptx/types";

export const LAYOUT_LABELS: Record<LayoutStyleKey, string> = {
  "title-body": "Title + Body",
  "two-column": "Two Column",
  "visual-focus": "Visual Focus",
};

export const TONE_STYLES: Record<ToneKey, ToneStyle> = {
  indigo: {
    previewBar: "from-blue-700 via-indigo-600 to-cyan-400",
    previewBadge: "from-blue-600 to-indigo-500",
    thumbBar: "from-blue-700 via-indigo-600 to-cyan-400",
    chip: "border-indigo-300/80 bg-indigo-100 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200",
    icon: "bg-linear-to-br from-blue-600 to-indigo-600 text-white",
  },
  emerald: {
    previewBar: "from-emerald-600 via-teal-500 to-cyan-400",
    previewBadge: "from-emerald-500 to-teal-500",
    thumbBar: "from-emerald-600 via-teal-500 to-cyan-400",
    chip: "border-emerald-300/80 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
    icon: "bg-linear-to-br from-emerald-500 to-teal-500 text-white",
  },
  amber: {
    previewBar: "from-amber-500 via-orange-500 to-yellow-400",
    previewBadge: "from-amber-500 to-orange-500",
    thumbBar: "from-amber-500 via-orange-500 to-yellow-400",
    chip: "border-amber-300/80 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
    icon: "bg-linear-to-br from-amber-500 to-orange-500 text-white",
  },
  rose: {
    previewBar: "from-fuchsia-600 via-pink-500 to-rose-400",
    previewBadge: "from-fuchsia-500 to-rose-500",
    thumbBar: "from-fuchsia-600 via-pink-500 to-rose-400",
    chip: "border-rose-300/80 bg-rose-100 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
    icon: "bg-linear-to-br from-fuchsia-500 to-rose-500 text-white",
  },
};

export function prettifyLayout(layout?: LayoutStyleKey | null) {
  return LAYOUT_LABELS[layout || "title-body"];
}

export function toneForSlide(slide: Pick<EditablePptSlide, "accentTone">) {
  return TONE_STYLES[slide.accentTone || "indigo"];
}

export function getToneGradientStops(tone?: ToneKey) {
  switch (tone || "indigo") {
    case "emerald":
      return ["#10b981", "#14b8a6", "#22d3ee"];
    case "amber":
      return ["#f59e0b", "#f97316", "#fde047"];
    case "rose":
      return ["#d946ef", "#ec4899", "#fb7185"];
    default:
      return ["#1d4ed8", "#4f46e5", "#22d3ee"];
  }
}
