import type { CanvasBounds, CanvasZone, CanvasZoneKey, EditablePptSlide, LayoutStyleKey } from "@/lib/pptx/types";
import { getPreferredSlideImage } from "@/lib/pptx/pictureTools";

export type EditableSlideStyle = Pick<EditablePptSlide, "fontFamily" | "titleSize" | "bodySize">;

type SlideLike = EditablePptSlide;
const EXPORT_W = 13.333;
const EXPORT_H = 7.5;

export const DEFAULT_CANVAS_ORDER: CanvasZoneKey[] = ["title", "body", "bullets", "visual", "notes"];

export const DEFAULT_CANVAS_LAYOUT: Record<CanvasZoneKey, CanvasZone> = {
  title: { x: 0.05, y: 0.14, w: 0.52, h: 0.16 },
  body: { x: 0.05, y: 0.28, w: 0.5, h: 0.14 },
  bullets: { x: 0.05, y: 0.46, w: 0.52, h: 0.26 },
  visual: { x: 0.64, y: 0.14, w: 0.28, h: 0.48 },
  notes: { x: 0.05, y: 0.8, w: 0.52, h: 0.1 },
};

export function getCanvasLayout(slide: EditablePptSlide): Record<CanvasZoneKey, CanvasZone> {
  const base = { ...DEFAULT_CANVAS_LAYOUT };
  if (slide.layoutStyle === "visual-focus") {
    base.title.w = 0.46;
    base.body.w = 0.44;
    base.bullets.w = 0.44;
    base.visual = { x: 0.54, y: 0.14, w: 0.36, h: 0.62 };
  } else if (slide.layoutStyle === "two-column") {
    base.visual = { x: 0.58, y: 0.14, w: 0.34, h: 0.48 };
  }

  return {
    title: { ...base.title, ...(slide.canvasLayout?.title || {}) },
    body: { ...base.body, ...(slide.canvasLayout?.body || {}) },
    bullets: { ...base.bullets, ...(slide.canvasLayout?.bullets || {}) },
    visual: { ...base.visual, ...(slide.canvasLayout?.visual || {}) },
    notes: { ...base.notes, ...(slide.canvasLayout?.notes || {}) },
  };
}

export function getPreviewLayoutConfig(slide: SlideLike) {
  const titleClass =
    slide.titleSize === "sm"
      ? "text-[20px] leading-[1.08]"
      : slide.titleSize === "lg"
        ? "text-[28px] leading-[1]"
        : (slide.title || "").length > 84
          ? "text-[18px] leading-[1.08]"
          : (slide.title || "").length > 54
            ? "text-[22px] leading-[1.04]"
            : "text-[25px] leading-[1]";

  const bodyClass =
    slide.bodySize === "sm"
      ? "text-[12px] leading-5"
      : slide.bodySize === "lg"
        ? "text-[14px] leading-6"
        : "text-[13px] leading-5";

  const fontClass =
    slide.fontFamily === "serif"
      ? "font-serif"
      : slide.fontFamily === "mono"
        ? "font-mono"
        : slide.fontFamily === "classic"
          ? "font-serif"
          : "font-sans";

  const thumbnailTitleClass =
    slide.titleSize === "sm"
      ? "text-[10px]"
      : slide.titleSize === "lg"
        ? "text-[12px]"
        : "text-[11px]";

  const thumbnailBulletBarClass =
    slide.bodySize === "sm"
      ? "h-1.5"
      : slide.bodySize === "lg"
        ? "h-2.5"
        : "h-2";

  return {
    titleClass,
    bodyClass,
    fontClass,
    thumbnailTitleClass,
    thumbnailBulletBarClass,
    bulletCount: 2,
    contentGridClass:
      slide.layoutStyle === "two-column"
        ? "grid-cols-[1.15fr_0.95fr]"
        : slide.layoutStyle === "visual-focus"
          ? "grid-cols-[1.1fr_1fr]"
          : "grid-cols-[1.5fr_0.8fr]",
    visualImageClass:
      slide.imagePlacement === "background"
        ? "h-28"
        : slide.imagePlacement === "spotlight"
          ? "h-32"
          : "h-24",
    visualTextClampClass: slide.layoutStyle === "visual-focus" ? "line-clamp-6" : "line-clamp-5",
  };
}

export function getExportLayoutConfig(slide: SlideLike) {
  const titleFontSize = slide.titleSize === "sm" ? 24 : slide.titleSize === "lg" ? 34 : 30;
  const bodyFontSize = slide.bodySize === "sm" ? 16 : slide.bodySize === "lg" ? 20 : 18;
  const fontFace =
    slide.fontFamily === "serif"
      ? "Georgia"
      : slide.fontFamily === "mono"
        ? "Courier New"
        : slide.fontFamily === "rounded"
          ? "Trebuchet MS"
          : slide.fontFamily === "display"
            ? "Verdana"
            : slide.fontFamily === "classic"
              ? "Times New Roman"
              : "Aptos";
  const hasVisual = Boolean(getPreferredSlideImage(slide));
  const useVisualFocus = slide.layoutStyle === "visual-focus" && hasVisual;
  const useTwoColumn = slide.layoutStyle === "two-column" && hasVisual;
  const backgroundImage = hasVisual && slide.imagePlacement === "background";
  const spotlightImage = hasVisual && slide.imagePlacement === "spotlight";
  const textW = useVisualFocus ? 5.4 : hasVisual && !backgroundImage ? 6.4 : 12.0;
  const textX = useVisualFocus ? 0.9 : hasVisual && !backgroundImage ? 0.7 : 0.9;
  const imageBox = {
    x: spotlightImage ? 8.25 : useVisualFocus ? 6.7 : useTwoColumn ? 7.2 : 7.2,
    y: spotlightImage ? 1.7 : useVisualFocus ? 1.25 : 1.3,
    w: spotlightImage ? 3.7 : useVisualFocus ? 5.8 : 5.5,
    h: spotlightImage ? 3.7 : useVisualFocus ? 4.9 : 4.6,
  };
  const backgroundBox = { x: 7.5, y: 0.8, w: 5.1, h: 5.7 };
  const canvasLayout = slide.canvasLayout || {};
  const toExportBox = (
    key: CanvasZoneKey,
    fallback: { x: number; y: number; w: number; h: number }
  ) => {
    const zone = canvasLayout[key];
    if (!zone) return fallback;
    return {
      x: zone.x * EXPORT_W,
      y: zone.y * EXPORT_H,
      w: zone.w * EXPORT_W,
      h: zone.h * EXPORT_H,
    };
  };

  return {
    titleFontSize,
    bodyFontSize,
    fontFace,
    hasVisual,
    useVisualFocus,
    useTwoColumn,
    backgroundImage,
    spotlightImage,
    textW,
    textX,
    imageBox,
    backgroundBox,
    titleBox: toExportBox("title", { x: 0.6, y: 0.4, w: 12.2, h: 0.9 }),
    bodyBox: toExportBox("body", { x: textX, y: 1.2, w: textW, h: hasVisual ? 1.8 : 2.2 }),
    bulletsBox: toExportBox("bullets", { x: textX, y: 3.3, w: textW, h: 3.4 }),
    notesBox: toExportBox("notes", { x: textX, y: 6.3, w: textW, h: 0.6 }),
    visualCanvasBox: toExportBox("visual", imageBox),
  };
}

export function getLayoutLabel(layout?: LayoutStyleKey | null) {
  if (layout === "two-column") return "Two Column";
  if (layout === "visual-focus") return "Visual Focus";
  return "Title + Body";
}

export function toCanvasPixels(zone: CanvasZone, stageWidth: number, stageHeight: number): CanvasBounds {
  return {
    x: zone.x * stageWidth,
    y: zone.y * stageHeight,
    w: zone.w * stageWidth,
    h: zone.h * stageHeight,
  };
}

export function fromCanvasPixels(zone: CanvasBounds, stageWidth: number, stageHeight: number): CanvasZone {
  return {
    x: Math.max(0.02, Math.min(0.88, zone.x / stageWidth)),
    y: Math.max(0.04, Math.min(0.88, zone.y / stageHeight)),
    w: Math.max(0.16, Math.min(0.82, zone.w / stageWidth)),
    h: Math.max(0.1, Math.min(0.72, zone.h / stageHeight)),
  };
}
