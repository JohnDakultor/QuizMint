import type { CanvasZoneKey } from "@/lib/pptx/types";

export function labelForCanvasBlock(block: CanvasZoneKey | null) {
  switch (block) {
    case "title":
      return "Slide Title";
    case "body":
      return "Body Copy";
    case "bullets":
      return "Body Bullets";
    case "visual":
      return "Image Prompt";
    case "notes":
      return "Notes";
    default:
      return null;
  }
}
