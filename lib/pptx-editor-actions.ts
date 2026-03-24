export {
  addDeckSlide,
  cloneDeckSlide,
  createBlankSlide,
  deleteDeckSlide,
  normalizeSlide,
  replaceDeckSlide,
  slidesEqual,
} from "@/lib/pptx/slideMaster";
export { updateSlideBulletsFromText } from "@/lib/pptx/textTools";

import type { PptSlide } from "@/lib/lesson-plan-ppt-ai";

export function cycleSlideLayout(current?: PptSlide["layoutStyle"]): NonNullable<PptSlide["layoutStyle"]> {
  const order: Array<NonNullable<PptSlide["layoutStyle"]>> = ["title-body", "two-column", "visual-focus"];
  const currentIndex = order.indexOf(current || "title-body");
  return order[(currentIndex + 1) % order.length];
}

export function cycleSlideTone(current?: PptSlide["accentTone"]): NonNullable<PptSlide["accentTone"]> {
  const order: Array<NonNullable<PptSlide["accentTone"]>> = ["indigo", "emerald", "amber", "rose"];
  const currentIndex = order.indexOf(current || "indigo");
  return order[(currentIndex + 1) % order.length];
}
