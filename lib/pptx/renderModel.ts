import type { EditablePptSlide } from "@/lib/pptx/types";
import { getExportLayoutConfig } from "@/lib/pptx/slideLayout";
import { getPreferredSlideImage } from "@/lib/pptx/pictureTools";

export type RenderBox = { x: number; y: number; w: number; h: number };

export type SlideRenderModel = {
  fontFace: string;
  backgroundColor: string;
  textBold: boolean;
  textItalic: boolean;
  title: {
    box: RenderBox;
    text: string;
    fontSize: number;
    color: string;
    textAlign: "left" | "center" | "right";
  };
  bodyBlocks: Array<{
    key: string;
    box: RenderBox;
    text: string;
    fontSize: number;
    color: string;
    textAlign: "left" | "center" | "right";
  }>;
  bullets: Array<{
    key: string;
    box: RenderBox;
    text: string;
    fontSize: number;
    color: string;
    textAlign: "left" | "center" | "right";
  }>;
  visuals: Array<{
    key: string;
    box: RenderBox;
    prompt: string;
    imageData?: string;
    imageInset?: number;
    imageHeightRatio?: number;
  }>;
  backgroundImage?: {
    box: RenderBox;
    imageData: string;
    transparency: number;
  };
  notes?: string;
};

function getBlockTextAlign(
  slide: EditablePptSlide,
  key: string
): "left" | "center" | "right" {
  return slide.textAlignments?.[key] || "left";
}

export function getBlockTextStyle(
  slide: EditablePptSlide,
  key: string
): { bold: boolean; italic: boolean } {
  const style = slide.textStyles?.[key];
  return {
    bold: typeof style?.bold === "boolean" ? style.bold : Boolean(slide.textBold),
    italic: typeof style?.italic === "boolean" ? style.italic : Boolean(slide.textItalic),
  };
}

const EXPORT_W = 13.333;
const EXPORT_H = 7.5;

function scaleBox(
  box: { x: number; y: number; w: number; h: number },
  width = EXPORT_W,
  height = EXPORT_H
): RenderBox {
  return {
    x: box.x * width / EXPORT_W,
    y: box.y * height / EXPORT_H,
    w: box.w * width / EXPORT_W,
    h: box.h * height / EXPORT_H,
  };
}

function boxFromZone(
  zone: { x: number; y: number; w: number; h: number },
  width = EXPORT_W,
  height = EXPORT_H
): RenderBox {
  return {
    x: zone.x * width,
    y: zone.y * height,
    w: zone.w * width,
    h: zone.h * height,
  };
}

function insetBox(
  box: RenderBox,
  options?: { insetLeft?: number; insetRight?: number }
): RenderBox {
  const insetLeft = options?.insetLeft ?? 0;
  const insetRight = options?.insetRight ?? insetLeft;
  const nextW = Math.max(0.4, box.w - insetLeft - insetRight);
  return {
    x: box.x + insetLeft,
    y: box.y,
    w: nextW,
    h: box.h,
  };
}

function narrowBox(
  box: RenderBox,
  options?: { maxWidth?: number; align?: "left" | "center" }
): RenderBox {
  const maxWidth = options?.maxWidth ?? box.w;
  const width = Math.min(box.w, maxWidth);
  if (options?.align === "center") {
    return {
      x: box.x + (box.w - width) / 2,
      y: box.y,
      w: width,
      h: box.h,
    };
  }
  return {
    x: box.x,
    y: box.y,
    w: width,
    h: box.h,
  };
}

function getAccentPalette(tone?: EditablePptSlide["accentTone"]) {
  switch (tone) {
    case "emerald":
      return { title: "065F46", body: "1F2937", chip: "D1FAE5" };
    case "amber":
      return { title: "92400E", body: "1F2937", chip: "FEF3C7" };
    case "rose":
      return { title: "9F1239", body: "1F2937", chip: "FFE4E6" };
    case "indigo":
    default:
      return { title: "1E40AF", body: "1F2937", chip: "E0E7FF" };
  }
}

function toVisualItems(slide: EditablePptSlide) {
  if (Array.isArray(slide.visualItems) && slide.visualItems.length > 0) {
    return slide.visualItems.filter((item) => item?.id);
  }
  const prompts = (slide.imagePrompt || "")
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return prompts.map((prompt, index) => ({
    id: `auto-${index + 1}`,
    prompt,
  }));
}

export function buildSlideRenderModel(
  slide: EditablePptSlide,
  options?: { width?: number; height?: number }
): SlideRenderModel {
  const width = options?.width ?? EXPORT_W;
  const height = options?.height ?? EXPORT_H;
  const palette = getAccentPalette(slide.accentTone);
  const layout = getExportLayoutConfig(slide);
  const preferredSlideImage = getPreferredSlideImage(slide) || undefined;
  const bodyBlocks =
    slide.bodyBlocks && slide.bodyBlocks.length > 0
      ? slide.bodyBlocks.filter(Boolean)
      : slide.body
        ? [slide.body]
        : [];
  const cleanBullets = (slide.bullets || [])
    .map((b) => (b || "").trim())
    .filter(Boolean)
    .map((b) => (b.length > 160 ? `${b.slice(0, 159)}...` : b));
  const visualItems = toVisualItems(slide);
  const fontFace = layout.fontFace;
  const model: SlideRenderModel = {
    fontFace,
    backgroundColor: slide.backgroundColor || "#FFFFFF",
    textBold: Boolean(slide.textBold),
    textItalic: Boolean(slide.textItalic),
    title: {
      box: scaleBox(layout.titleBox, width, height),
      text: slide.title || "",
      fontSize: layout.titleFontSize,
      color: palette.title,
      textAlign: getBlockTextAlign(slide, "title"),
    },
    bodyBlocks: [],
    bullets: [],
    visuals: [],
    notes: slide.notes,
  };

  if (layout.backgroundImage && preferredSlideImage) {
    model.backgroundImage = {
      box: scaleBox(layout.backgroundBox, width, height),
      imageData: preferredSlideImage,
      transparency: 18,
    };
  }

  if (bodyBlocks.length > 0) {
    const rows = Math.max(1, bodyBlocks.length);
    const rowGap = 0.14 * height / EXPORT_H;
    const blockH = Math.max(
      0.4 * height / EXPORT_H,
      Math.min(0.85 * height / EXPORT_H, (scaleBox(layout.bodyBox, width, height).h - rowGap * Math.max(0, rows - 1)) / rows)
    );
    bodyBlocks.forEach((text, index) => {
      const saved = slide.bodyBlockLayouts?.[String(index)];
      const box = saved
        ? boxFromZone(saved, width, height)
        : narrowBox(
            insetBox({
              x: scaleBox(layout.bodyBox, width, height).x,
              y: scaleBox(layout.bodyBox, width, height).y + index * (blockH + rowGap),
              w: scaleBox(layout.bodyBox, width, height).w,
              h: blockH,
            }, {
              insetRight: 0.7 * width / EXPORT_W,
            }),
            {
              maxWidth: 4.9 * width / EXPORT_W,
            }
          );
      model.bodyBlocks.push({
        key: `body-block-${index}`,
        box,
        text,
        fontSize: Math.max(14, layout.bodyFontSize - 1),
        color: palette.body,
        textAlign: getBlockTextAlign(slide, `body-block-${index}`),
      });
    });
  }

  if (cleanBullets.length > 0) {
    const isTwoColumn = slide.layoutStyle === "two-column";
    cleanBullets.forEach((text, index) => {
      const saved = slide.bulletLayouts?.[String(index)];
      const col = isTwoColumn ? index % 2 : 0;
      const row = isTwoColumn ? Math.floor(index / 2) : index;
      const defaultBox = scaleBox({
        x: layout.bulletsBox.x + (isTwoColumn ? col * (layout.bulletsBox.w / 2 + 0.08) : 0),
        y: layout.bulletsBox.y + row * 0.64,
        w: isTwoColumn ? layout.bulletsBox.w / 2 - 0.08 : layout.bulletsBox.w,
        h: 0.48,
      }, width, height);
      model.bullets.push({
        key: `bullet-${index}`,
        box: saved
          ? boxFromZone(saved, width, height)
          : narrowBox(
              insetBox(defaultBox, {
                insetRight: isTwoColumn ? 0.18 * width / EXPORT_W : 0.9 * width / EXPORT_W,
              }),
              {
                maxWidth: isTwoColumn
                  ? defaultBox.w
                  : 4.7 * width / EXPORT_W,
              }
            ),
        text,
        fontSize: Math.max(14, layout.bodyFontSize - 1),
        color: "334155",
        textAlign: getBlockTextAlign(slide, `bullet-${index}`),
      });
    });
  }

  if (visualItems.length > 0) {
    const visualGap = 0.18;
    const stackedVisualHeight = Math.max(
      1.1,
      Math.min(2.15, (layout.visualCanvasBox.h - visualGap * Math.max(0, visualItems.length - 1)) / Math.max(1, visualItems.length))
    );
    visualItems.forEach((item, index) => {
      const saved = slide.visualItemLayouts?.[item.id];
      const defaultBox = scaleBox({
        x: layout.visualCanvasBox.x,
        y: layout.visualCanvasBox.y + index * (stackedVisualHeight + visualGap),
        w: layout.visualCanvasBox.w,
        h: stackedVisualHeight,
      }, width, height);
      model.visuals.push({
        key: `visual-item-${item.id}`,
        box: saved ? boxFromZone(saved, width, height) : defaultBox,
        prompt: item.prompt || "",
        imageData: item.imageData,
        imageInset: 0.18 * width / EXPORT_W,
        imageHeightRatio: 0.72,
      });
    });
  } else if (layout.hasVisual && preferredSlideImage && !layout.backgroundImage) {
    model.visuals.push({
      key: "visual",
      box: scaleBox(layout.visualCanvasBox, width, height),
      prompt: "",
      imageData: preferredSlideImage,
      imageInset: 0,
      imageHeightRatio: 1,
    });
  }

  return model;
}
