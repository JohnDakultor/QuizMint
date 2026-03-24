import type { EditablePptSlide } from "@/lib/pptx/types";

export function isProbablyImageUrl(value?: string) {
  if (!value) return false;
  return /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(value.trim());
}

export function getPreferredSlideImage(slide: Pick<EditablePptSlide, "imageData" | "imagePrompt">) {
  return slide.imageData?.trim() || (isProbablyImageUrl(slide.imagePrompt) ? slide.imagePrompt!.trim() : "");
}
