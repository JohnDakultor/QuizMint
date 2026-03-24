import type { PptDeck, PptSlide } from "@/lib/lesson-plan-ppt-ai";
import type { CanvasZoneKey, EditablePptSlide } from "@/lib/pptx/types";
import { DEFAULT_CANVAS_ORDER } from "@/lib/pptx/slideLayout";

function normalizeBackgroundColor(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "#FFFFFF";
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : "#FFFFFF";
}

export function normalizeSlide(slide?: PptSlide): EditablePptSlide {
  const rawOrder = (slide as EditablePptSlide | undefined)?.canvasOrder || [];
  const canvasOrder = [
    ...rawOrder.filter((key): key is CanvasZoneKey => DEFAULT_CANVAS_ORDER.includes(key as CanvasZoneKey)),
    ...DEFAULT_CANVAS_ORDER.filter((key) => !rawOrder.includes(key)),
  ];

  return {
    title: slide?.title || "",
    body: slide?.body || "",
    bodyBlocks: Array.isArray((slide as EditablePptSlide | undefined)?.bodyBlocks)
      ? (slide as EditablePptSlide | undefined)?.bodyBlocks
      : slide?.body
        ? [slide.body]
        : [],
    bullets: Array.isArray(slide?.bullets) ? slide?.bullets : [],
    notes: slide?.notes || "",
    backgroundColor: normalizeBackgroundColor(slide?.backgroundColor),
    imagePrompt: slide?.imagePrompt || "",
    imageData: slide?.imageData || "",
    layoutStyle: slide?.layoutStyle || "title-body",
    accentTone: slide?.accentTone || "indigo",
    imagePlacement: slide?.imagePlacement || "right",
    textBold: Boolean((slide as EditablePptSlide | undefined)?.textBold),
    textItalic: Boolean((slide as EditablePptSlide | undefined)?.textItalic),
    textAlignments: (slide as EditablePptSlide | undefined)?.textAlignments || {},
    textStyles: (slide as EditablePptSlide | undefined)?.textStyles || {},
    fontFamily: (slide as EditablePptSlide | undefined)?.fontFamily || "inter",
    titleSize: (slide as EditablePptSlide | undefined)?.titleSize || "md",
    bodySize: (slide as EditablePptSlide | undefined)?.bodySize || "md",
    canvasLayout: (slide as EditablePptSlide | undefined)?.canvasLayout || {},
    canvasOrder,
    bulletLayouts: (slide as EditablePptSlide | undefined)?.bulletLayouts || {},
    bodyBlockLayouts: (slide as EditablePptSlide | undefined)?.bodyBlockLayouts || {},
    visualItems:
      Array.isArray((slide as EditablePptSlide | undefined)?.visualItems)
        ? (slide as EditablePptSlide | undefined)?.visualItems
        : [],
    visualItemLayouts: (slide as EditablePptSlide | undefined)?.visualItemLayouts || {},
  };
}

export function createBlankSlide(deck: PptDeck): PptSlide {
  return {
    title: `New Slide ${deck.slides.length + 1}`,
    body: "Add your lesson content here.",
    bodyBlocks: ["Add your lesson content here."],
    bullets: ["Key point 1", "Key point 2"],
    notes: "",
    backgroundColor: "#FFFFFF",
    imagePrompt: "",
    layoutStyle: "title-body",
    accentTone: "indigo",
    imagePlacement: "right",
    textBold: false,
    textItalic: false,
    textAlignments: {},
    textStyles: {},
  };
}

export function slidesEqual(a?: PptSlide, b?: PptSlide) {
  try {
    return JSON.stringify(normalizeSlide(a)) === JSON.stringify(normalizeSlide(b));
  } catch {
    return false;
  }
}

export function replaceDeckSlide(deck: PptDeck, index: number, slide: PptSlide): PptDeck {
  return {
    ...deck,
    slides: deck.slides.map((item, itemIndex) => (itemIndex === index ? slide : item)),
  };
}

export function cloneDeckSlide(deck: PptDeck, index: number): PptDeck {
  const source = deck.slides[index];
  if (!source) return deck;

  const clone: PptSlide = {
    ...source,
    bullets: [...(source.bullets || [])],
    title: `${source.title || "Untitled slide"} Copy`,
  };

  const slides = [...deck.slides];
  slides.splice(index + 1, 0, clone);
  return { ...deck, slides };
}

export function addDeckSlide(deck: PptDeck, slide: PptSlide): PptDeck {
  return {
    ...deck,
    slides: [...deck.slides, slide],
  };
}

export function deleteDeckSlide(deck: PptDeck, index: number): PptDeck {
  if (deck.slides.length <= 1) return deck;
  return {
    ...deck,
    slides: deck.slides.filter((_, itemIndex) => itemIndex !== index),
  };
}
