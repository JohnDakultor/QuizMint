import type { CanvasBounds, CanvasZoneKey, SnapGuides } from "@/lib/pptx/types";

export type CanvasLane = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
};

export function getCanvasLanes(stageWidth: number, stageHeight: number): Record<CanvasZoneKey, CanvasLane> {
  return {
    title: {
      minX: 36,
      maxX: stageWidth * 0.58,
      minY: 96,
      maxY: 168,
      minW: stageWidth * 0.22,
      maxW: stageWidth * 0.54,
      minH: 70,
      maxH: 138,
    },
    body: {
      minX: 36,
      maxX: stageWidth * 0.58,
      minY: 196,
      maxY: 282,
      minW: stageWidth * 0.22,
      maxW: stageWidth * 0.54,
      minH: 60,
      maxH: 116,
    },
    bullets: {
      minX: 36,
      maxX: stageWidth * 0.58,
      minY: 298,
      maxY: stageHeight - 172,
      minW: stageWidth * 0.22,
      maxW: stageWidth * 0.54,
      minH: 88,
      maxH: 210,
    },
    visual: {
      minX: stageWidth * 0.52,
      maxX: stageWidth - 48,
      minY: 82,
      maxY: stageHeight - 176,
      minW: stageWidth * 0.18,
      maxW: stageWidth * 0.38,
      minH: 150,
      maxH: stageHeight * 0.62,
    },
    notes: {
      minX: 36,
      maxX: stageWidth * 0.58,
      minY: stageHeight - 124,
      maxY: stageHeight - 36,
      minW: stageWidth * 0.22,
      maxW: stageWidth * 0.54,
      minH: 56,
      maxH: 96,
    },
  };
}

export function clampZoneToLane(key: CanvasZoneKey, zone: CanvasBounds, stageWidth: number, stageHeight: number): CanvasBounds {
  const lane = getCanvasLanes(stageWidth, stageHeight)[key];
  const clampedW = Math.max(lane.minW, Math.min(lane.maxW, zone.w));
  const clampedH = Math.max(lane.minH, Math.min(lane.maxH, zone.h));
  const clampedX = Math.max(lane.minX, Math.min(lane.maxX - clampedW, zone.x));
  const clampedY = Math.max(lane.minY, Math.min(lane.maxY - clampedH, zone.y));
  return { x: clampedX, y: clampedY, w: clampedW, h: clampedH };
}

export function applySnapGuides(zone: CanvasBounds, stageWidth: number, stageHeight: number): { zone: CanvasBounds; guides: SnapGuides } {
  const centerX = zone.x + zone.w / 2;
  const centerY = zone.y + zone.h / 2;
  const targetsX = [48, stageWidth / 2, stageWidth - 48];
  const targetsY = [84, stageHeight / 2, stageHeight - 72];
  let snappedX = zone.x;
  let snappedY = zone.y;
  let vertical: number | undefined;
  let horizontal: number | undefined;

  for (const target of targetsX) {
    if (Math.abs(centerX - target) < 12) {
      snappedX += target - centerX;
      vertical = target;
      break;
    }
  }

  for (const target of targetsY) {
    if (Math.abs(centerY - target) < 12) {
      snappedY += target - centerY;
      horizontal = target;
      break;
    }
  }

  return { zone: { ...zone, x: snappedX, y: snappedY }, guides: { vertical, horizontal } };
}
