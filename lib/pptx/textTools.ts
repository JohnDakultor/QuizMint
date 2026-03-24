import type { EditablePptSlide } from "@/lib/pptx/types";

export function getCanvasFontFamily(slide: Pick<EditablePptSlide, "fontFamily">) {
  if (slide.fontFamily === "serif") return "Georgia";
  if (slide.fontFamily === "mono") return "Courier New";
  if (slide.fontFamily === "rounded") return "\"Trebuchet MS\", Aptos, Arial, sans-serif";
  if (slide.fontFamily === "display") return "Verdana, Aptos, Arial, sans-serif";
  if (slide.fontFamily === "classic") return "\"Times New Roman\", Georgia, serif";
  return "Aptos, Arial, sans-serif";
}

export function getCanvasTitleFontSize(slide: Pick<EditablePptSlide, "titleSize">) {
  if (slide.titleSize === "sm") return 28;
  if (slide.titleSize === "lg") return 40;
  return 34;
}

export function getCanvasBodyFontSize(slide: Pick<EditablePptSlide, "bodySize">) {
  if (slide.bodySize === "sm") return 18;
  if (slide.bodySize === "lg") return 23;
  return 20;
}

export function clampPreviewText(value: string | undefined, maxLength: number) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function updateSlideBulletsFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
