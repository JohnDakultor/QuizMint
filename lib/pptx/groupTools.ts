import type { CanvasZoneKey } from "@/lib/pptx/types";
import { DEFAULT_CANVAS_ORDER } from "@/lib/pptx/slideLayout";

export function moveCanvasBlock(
  order: CanvasZoneKey[] | undefined,
  block: CanvasZoneKey,
  direction: "forward" | "backward"
) {
  const current = [...(order || DEFAULT_CANVAS_ORDER)];
  const index = current.indexOf(block);
  if (index === -1) return current;
  const targetIndex =
    direction === "forward"
      ? current.length - 1
      : 0;
  if (targetIndex === index) return current;
  current.splice(index, 1);
  current.splice(targetIndex, 0, block);
  return current;
}

export function bringBlockForward(order: CanvasZoneKey[] | undefined, block: CanvasZoneKey) {
  return moveCanvasBlock(order, block, "forward");
}

export function sendBlockBackward(order: CanvasZoneKey[] | undefined, block: CanvasZoneKey) {
  return moveCanvasBlock(order, block, "backward");
}
