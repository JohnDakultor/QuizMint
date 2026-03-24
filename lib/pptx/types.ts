import type { PptSlide } from "@/lib/lesson-plan-ppt-ai";

export type CanvasZoneKey = "title" | "body" | "bullets" | "visual" | "notes";
export type CanvasZone = { x: number; y: number; w: number; h: number };

export type EditablePptSlide = PptSlide & {
  fontFamily?: "inter" | "serif" | "mono" | "rounded" | "display" | "classic";
  titleSize?: "sm" | "md" | "lg";
  bodySize?: "sm" | "md" | "lg";
  canvasLayout?: Partial<Record<CanvasZoneKey, CanvasZone>>;
  canvasOrder?: CanvasZoneKey[];
  bulletLayouts?: Record<string, CanvasZone>;
  bodyBlockLayouts?: Record<string, CanvasZone>;
  visualItemLayouts?: Record<string, CanvasZone>;
};

export type ToneKey = NonNullable<PptSlide["accentTone"]>;
export type LayoutStyleKey = NonNullable<PptSlide["layoutStyle"]>;

export type ToneStyle = {
  previewBar: string;
  previewBadge: string;
  thumbBar: string;
  chip: string;
  icon: string;
};

export type SnapGuides = { vertical?: number; horizontal?: number };
export type CanvasBounds = { x: number; y: number; w: number; h: number };
