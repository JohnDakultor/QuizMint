import type { CanvasZoneKey } from "@/lib/pptx/types";

export function getCanvasBlockIconName(block: CanvasZoneKey) {
  switch (block) {
    case "title":
      return "type";
    case "body":
      return "paragraph";
    case "bullets":
      return "list";
    case "visual":
      return "image";
    case "notes":
      return "notes";
    default:
      return "shape";
  }
}
