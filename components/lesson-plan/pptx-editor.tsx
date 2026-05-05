
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Copy, Download, Play, Plus, Redo, RotateCcw, Sparkles, Trash2, Undo, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";
import {
  addDeckSlide,
  cloneDeckSlide,
  createBlankSlide,
  DEFAULT_CANVAS_ORDER,
  deleteDeckSlide,
  buildSlideRenderModel,
  getBlockTextStyle,
  fromCanvasPixels,
  getCanvasFontFamily,
  getPreviewLayoutConfig,
  labelForCanvasBlock,
  moveCanvasBlock,
  normalizeSlide,
  prettifyLayout,
  replaceDeckSlide,
  slidesEqual,
  toneForSlide,
  type CanvasZone,
  type CanvasZoneKey,
  type EditablePptSlide,
} from "@/lib/pptx";
import { useLoadedImageMap } from "@/lib/pptx/pictureHooks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  deck: PptDeck;
  onChange: (deck: PptDeck) => void;
  onDownload: (deck: PptDeck) => void;
  loading?: boolean;
  onClose?: () => void;
};

type BlockKey =
  | CanvasZoneKey
  | `bullet-${number}`
  | `visual-item-${string}`
  | `body-block-${number}`;

interface PixelRect { x: number; y: number; w: number; h: number }
type HoverGroupKey = "body" | "bullets" | "visual";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — fixed logical slide size
// ─────────────────────────────────────────────────────────────────────────────

const LW = 1280;
const LH = 800;
const MAX_HISTORY = 60;
const MAX_IMAGE_SLOTS_PER_SLIDE = 5;
const BACKGROUND_COLOR_OPTIONS = [
  "#FFFFFF",
  "#F8FAFC",
  "#EFF6FF",
  "#ECFDF5",
  "#FFFBEB",
  "#FFF1F2",
  "#F5F3FF",
  "#E0F2FE",
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function isZoneKey(key: BlockKey | null): key is CanvasZoneKey {
  return (
    Boolean(key) &&
    !String(key).startsWith("bullet-") &&
    !String(key).startsWith("visual-item-") &&
    !String(key).startsWith("body-block-")
  );
}

function toVisualItems(slide: EditablePptSlide): Array<{ id: string; prompt: string; imageData?: string }> {
  if (Array.isArray(slide.visualItems) && slide.visualItems.length > 0)
    return slide.visualItems.filter((i) => i?.id);
  const prompts = (slide.imagePrompt || "")
    .split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (!prompts.length) return [];
  return prompts.map((prompt, i) => ({
    id: `auto-${i + 1}`, prompt, imageData: "",
  }));
}

function newVisualId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `visual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function titleTopic(title?: string) {
  const cleaned = (title || "")
    .replace(/[:\-].*$/, "")
    .replace(/\b(what|why|how|case study|overview|summary)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "this topic";
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function suggestNewBullet(slide: EditablePptSlide, index: number) {
  const topic = titleTopic(slide.title);
  const existing = new Set((slide.bullets || []).map((item) => item.trim().toLowerCase()));
  const candidates = uniqueItems([
    ...(slide.bodyBlocks || []),
    slide.body || "",
    ...String(slide.notes || "").split(/[.!?\n]+/),
  ])
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 12 && item.length <= 90);

  const fromContent = candidates.find((item) => !existing.has(item.toLowerCase()));
  if (fromContent) return fromContent;

  const fallback = [
    `Key insight about ${topic}`,
    `Important example from ${topic}`,
    `Real-world impact of ${topic}`,
    `Main takeaway for ${topic}`,
  ];
  return fallback[index % fallback.length];
}

function suggestNewBodyBlock(slide: EditablePptSlide, index: number) {
  const topic = titleTopic(slide.title);
  const existing = new Set((slide.bodyBlocks || []).map((item) => item.trim().toLowerCase()));
  const candidates = uniqueItems([
    ...String(slide.notes || "").split(/[.!?\n]+/),
    ...String(slide.imagePrompt || "").split(/\n+/),
    slide.body || "",
  ])
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 24 && item.length <= 140);
  const fromContent = candidates.find((item) => !existing.has(item.toLowerCase()));
  if (fromContent) return fromContent.endsWith(".") ? fromContent : `${fromContent}.`;

  const fallback = [
    `${topic} connects ideas, evidence, and real-world application for students.`,
    `This part of ${topic} explains why the concept matters in practice.`,
    `Use this section to reinforce the main idea behind ${topic}.`,
  ];
  return fallback[index % fallback.length];
}

function suggestNewImagePrompt(slide: EditablePptSlide, index: number) {
  const topic = titleTopic(slide.title);
  const existing = new Set(
    toVisualItems(slide).map((item) => item.prompt.trim().toLowerCase())
  );
  const candidates = uniqueItems([
    ...String(slide.imagePrompt || "").split(/\n+/),
    ...String(slide.notes || "").split(/[.!?\n]+/),
    ...((slide.bullets || []).map((bullet) => `${topic}: ${bullet}`)),
  ])
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 12 && item.length <= 120);

  const fromContent = candidates.find((item) => !existing.has(item.toLowerCase()));
  if (fromContent) return fromContent;

  const fallback = [
    `${topic} infographic with labeled key details`,
    `${topic} real-world classroom illustration`,
    `${topic} visual diagram for students`,
  ];
  return fallback[index % fallback.length];
}

function splitGeneratedBodyBlocks(
  text: string,
  fallbackBlocks: string[]
) {
  const desiredCount = Math.max(1, fallbackBlocks.filter(Boolean).length);
  const cleanText = (text || "").trim();
  if (!cleanText) return fallbackBlocks;
  if (desiredCount <= 1) return [cleanText];

  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [cleanText];
  if (sentences.length >= desiredCount) {
    const chunks: string[] = [];
    const chunkSize = Math.ceil(sentences.length / desiredCount);
    for (let index = 0; index < desiredCount; index += 1) {
      const chunk = sentences.slice(index * chunkSize, (index + 1) * chunkSize).join(" ").trim();
      chunks.push(chunk || fallbackBlocks[index] || "");
    }
    return chunks;
  }

  return Array.from({ length: desiredCount }, (_, index) => (
    sentences[index] || fallbackBlocks[index] || ""
  ));
}

function mergeGeneratedBullets(
  generatedBullets: string[],
  existingBullets: string[]
) {
  const desiredCount = Math.max(existingBullets.length, generatedBullets.length, 1);
  return Array.from({ length: desiredCount }, (_, index) => (
    generatedBullets[index] || existingBullets[index] || ""
  )).filter((item) => item.trim().length > 0);
}

function clearVisualItemImages(
  items: Array<{ id: string; prompt: string; imageData?: string }>
) {
  return items.map((item) => ({ ...item, imageData: "" }));
}

function getAutoFitVisualRect(
  base: PixelRect,
  image: HTMLImageElement
): PixelRect {
  const naturalW = Math.max(1, image.naturalWidth || image.width || 1);
  const naturalH = Math.max(1, image.naturalHeight || image.height || 1);
  const aspect = naturalW / naturalH;
  const maxW = Math.min(LW - base.x - 24, Math.max(base.w, 520));
  const maxH = Math.min(LH - base.y - 24, Math.max(base.h, 360));

  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  const minW = 220;
  const minH = 150;
  if (w < minW) {
    w = Math.min(maxW, minW);
    h = w / aspect;
  }
  if (h < minH) {
    h = Math.min(maxH, minH);
    w = h * aspect;
  }

  return clampRect({
    x: base.x,
    y: base.y,
    w,
    h,
  }, minW, minH);
}

function buildNextVisualLayouts(
  slide: EditablePptSlide,
  items: Array<{ id: string; prompt: string; imageData?: string }>
) {
  const currentVisualModel = buildSlideRenderModel(slide, { width: LW, height: LH });
  const currentVisualBoxes = currentVisualModel.visuals
    .map((visual) => visual.box)
    .slice(0, items.length);
  const nextLayouts: Record<string, CanvasZone> = {};
  items.forEach((item, index) => {
    const nextBox = currentVisualBoxes[index];
    if (nextBox) {
      nextLayouts[item.id] = fromCanvasPixels(
        clampRect(nextBox, 220, 150),
        LW,
        LH
      );
    } else if (slide.visualItemLayouts?.[item.id]) {
      nextLayouts[item.id] = slide.visualItemLayouts[item.id];
    }
  });
  return nextLayouts;
}

function getHoverGroupForBlock(block: BlockKey): HoverGroupKey | null {
  if (block.startsWith("body-block-")) return "body";
  if (block.startsWith("bullet-")) return "bullets";
  if (block.startsWith("visual-item-")) return "visual";
  return null;
}

function getCanvasLayerForBlock(block: BlockKey): CanvasZoneKey | null {
  if (block.startsWith("body-block-")) return "body";
  if (block.startsWith("bullet-")) return "bullets";
  if (block.startsWith("visual-item-")) return "visual";
  return isZoneKey(block) ? block : null;
}

function getReorderTargetForBlock(block: BlockKey): BlockKey {
  if (block.startsWith("visual-item-")) return block;
  if (block.startsWith("body-block-")) return block;
  if (block.startsWith("bullet-")) return block;
  return getCanvasLayerForBlock(block) || block;
}

function unionRects(rects: PixelRect[], pad = 10): PixelRect | null {
  if (!rects.length) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.w));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.h));
  return clampRect({
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  }, 120, 80);
}

function clampGroupDelta(rect: PixelRect, dx: number, dy: number) {
  const nextX = Math.max(0, Math.min(LW - rect.w, rect.x + dx));
  const nextY = Math.max(12, Math.min(LH - rect.h, rect.y + dy));
  return { dx: nextX - rect.x, dy: nextY - rect.y };
}

function intersectsRect(a: PixelRect, b: PixelRect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clampRect(r: PixelRect, minW = 120, minH = 56): PixelRect {
  const w = Math.max(minW, Math.min(LW - 16, r.w));
  const h = Math.max(minH, Math.min(LH - 16, r.h));
  const x = Math.max(0,  Math.min(LW - w, r.x));
  const y = Math.max(12, Math.min(LH - h, r.y));
  return { x, y, w, h };
}

const SNAP_THRESHOLD = 8;
const H_GUIDES = [LW / 2, LW / 3, (LW * 2) / 3];
const V_GUIDES = [LH / 2, LH / 3, (LH * 2) / 3];
function snap(v: number, guides: number[]) {
  for (const g of guides) if (Math.abs(v - g) < SNAP_THRESHOLD) return g;
  return v;
}
function applySnap(r: PixelRect): PixelRect {
  return { x: snap(r.x, H_GUIDES), y: snap(r.y, V_GUIDES), w: r.w, h: r.h };
}

// ─────────────────────────────────────────────────────────────────────────────
// SlideThumbnail
// ─────────────────────────────────────────────────────────────────────────────

function SlideThumbnail({
  slide, index, active, onClick,
}: {
  slide: EditablePptSlide; index: number; active: boolean; onClick: () => void;
}) {
  const tone = toneForSlide(slide);
  const bullets = slide.bullets?.filter(Boolean).slice(0, 3) || [];
  const backgroundColor = slide.backgroundColor || "#FFFFFF";
  const { fontClass, thumbnailTitleClass, thumbnailBulletBarClass } =
    getPreviewLayoutConfig(slide);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-59 min-h-59 max-h-59 w-47 shrink-0 flex-col rounded-2xl border p-3 text-left transition lg:w-full ${
        active
          ? "border-blue-500 bg-white shadow-[0_0_0_2px_rgba(59,130,246,0.14),0_12px_28px_rgba(15,23,42,0.10)] dark:border-cyan-400 dark:bg-slate-800/90"
          : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border border-slate-300 shadow-sm dark:border-slate-600"
            style={{ background: backgroundColor }}
            aria-label={`Background color ${backgroundColor}`}
          />
        </div>
      </div>
      <div
        className="overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700"
        style={{ background: backgroundColor }}
      >
        <div className={`h-2 w-full bg-linear-to-r ${tone.thumbBar}`} />
        <div className={`h-[126px] min-h-[126px] max-h-[126px] space-y-2 overflow-hidden p-3 ${fontClass}`}>
          <div className={`line-clamp-2 font-bold leading-tight text-slate-900 ${thumbnailTitleClass}`}>
            {slide.title || "Untitled slide"}
          </div>
          <div className="space-y-1.5">
            {bullets.length > 0 ? bullets.map((b, bi) => (
              <div key={bi}
                className={`${thumbnailBulletBarClass} rounded-full bg-slate-300`}
                style={{ width: `${Math.max(38, 82 - bi * 12)}%` }} />
            )) : (
              <>
                <div className={`${thumbnailBulletBarClass} w-5/6 rounded-full bg-slate-300`} />
                <div className={`${thumbnailBulletBarClass} w-2/3 rounded-full bg-slate-200`} />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate">{prettifyLayout(slide.layoutStyle)}</span>
        <span className="truncate">{slide.imagePlacement || "right"}</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DraggableBlock
// Each block is an absolutely-positioned div inside the slide surface.
// Drag and resize are handled via Pointer Events directly on the DOM — no
// Konva, no React controlled position props, no snap-back.
// ─────────────────────────────────────────────────────────────────────────────

const HANDLES = ["n","ne","e","se","s","sw","w","nw"] as const;
type Handle = typeof HANDLES[number];

const HANDLE_STYLE: Record<Handle, React.CSSProperties> = {
  n:  { top:-5, left:"50%", transform:"translateX(-50%)", cursor:"n-resize"  },
  ne: { top:-5, right:-5,   cursor:"ne-resize" },
  e:  { top:"50%", right:-5, transform:"translateY(-50%)", cursor:"e-resize" },
  se: { bottom:-5, right:-5, cursor:"se-resize" },
  s:  { bottom:-5, left:"50%", transform:"translateX(-50%)", cursor:"s-resize" },
  sw: { bottom:-5, left:-5,   cursor:"sw-resize" },
  w:  { top:"50%", left:-5,  transform:"translateY(-50%)", cursor:"w-resize"  },
  nw: { top:-5, left:-5,     cursor:"nw-resize" },
};

function DraggableBlock({
  blockKey, rect, selected, snapEnabled, scale, layerIndex, readOnly = false,
  onSelect, onRectChange, onDoubleClick, onContextMenu, onHoverStart, onHoverEnd, children,
}: {
  blockKey: BlockKey;
  rect: PixelRect;
  selected: boolean;
  snapEnabled: boolean;
  scale: number;
  layerIndex: number;
  readOnly?: boolean;
  onSelect: () => void;
  onRectChange: (r: PixelRect) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onHoverStart?: (block: BlockKey) => void;
  onHoverEnd?: (block: BlockKey) => void;
  children: React.ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);

  // Keep a live ref to rect so pointer callbacks always see latest value
  const liveRect = useRef<PixelRect>(rect);

  // Sync DOM position whenever rect prop changes from outside (e.g. undo)
  useLayoutEffect(() => {
    liveRect.current = rect;
    if (!el.current) return;
    el.current.style.left   = `${rect.x}px`;
    el.current.style.top    = `${rect.y}px`;
    el.current.style.width  = `${rect.w}px`;
    el.current.style.height = `${rect.h}px`;
  }, [rect.x, rect.y, rect.w, rect.h]);

  // ── Drag ─────────────────────────────────────────────────────────────────
  const drag = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  function startDrag(e: React.PointerEvent) {
    if (readOnly) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).dataset.resizeHandle) return;
    e.stopPropagation();
    onSelect();
    drag.current = { mx: e.clientX, my: e.clientY, ox: liveRect.current.x, oy: liveRect.current.y };
    el.current!.setPointerCapture(e.pointerId);
    el.current!.style.cursor = "grabbing";
  }

  function moveDrag(e: React.PointerEvent) {
    if (readOnly) return;
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.mx) / scale;
    const dy = (e.clientY - drag.current.my) / scale;
    let r = clampRect({ x: drag.current.ox + dx, y: drag.current.oy + dy, w: liveRect.current.w, h: liveRect.current.h });
    if (snapEnabled) r = applySnap(r);
    liveRect.current = r;
    if (el.current) { el.current.style.left = `${r.x}px`; el.current.style.top = `${r.y}px`; }
  }

  function endDrag() {
    if (readOnly) return;
    if (!drag.current) return;
    drag.current = null;
    if (el.current) el.current.style.cursor = "grab";
    onRectChange(liveRect.current);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  const resize = useRef<{ handle: Handle; mx: number; my: number; r: PixelRect } | null>(null);

  function startResize(e: React.PointerEvent, handle: Handle) {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    resize.current = { handle, mx: e.clientX, my: e.clientY, r: { ...liveRect.current } };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function moveResize(e: React.PointerEvent) {
    if (readOnly) return;
    if (!resize.current) return;
    const { handle, mx, my, r } = resize.current;
    const dx = (e.clientX - mx) / scale;
    const dy = (e.clientY - my) / scale;
    let nx = r.x, ny = r.y, nw = r.w, nh = r.h;
    if (handle.includes("e")) nw = Math.max(120, r.w + dx);
    if (handle.includes("s")) nh = Math.max(56,  r.h + dy);
    if (handle.includes("w")) { nx = r.x + dx; nw = Math.max(120, r.w - dx); }
    if (handle.includes("n")) { ny = r.y + dy; nh = Math.max(56,  r.h - dy); }
    const next = clampRect({ x: nx, y: ny, w: nw, h: nh });
    liveRect.current = next;
    if (el.current) {
      el.current.style.left   = `${next.x}px`;
      el.current.style.top    = `${next.y}px`;
      el.current.style.width  = `${next.w}px`;
      el.current.style.height = `${next.h}px`;
    }
  }

  function endResize() {
    if (readOnly) return;
    if (!resize.current) return;
    resize.current = null;
    onRectChange(liveRect.current);
  }

  return (
    <div
      ref={el}
      style={{
        position: "absolute",
        left: rect.x, top: rect.y,
        width: rect.w, height: rect.h,
        boxSizing: "border-box",
        outline: selected ? "2px dashed #2563eb" : "2px solid transparent",
        outlineOffset: 2,
        borderRadius: 14,
        userSelect: "none",
        cursor: readOnly ? "default" : "grab",
        zIndex: layerIndex,
        willChange: "left,top,width,height",
      }}
      onPointerDown={startDrag}
      onPointerMove={(e) => { moveDrag(e); moveResize(e); }}
      onPointerUp={(e) => { endDrag(); endResize(); }}
      onClick={(e) => { e.stopPropagation(); if (!readOnly) onSelect(); }}
      onDoubleClick={(e) => { e.stopPropagation(); if (!readOnly) onDoubleClick(); }}
      onContextMenu={(e) => { if (readOnly) return; e.preventDefault(); e.stopPropagation(); onContextMenu(e); }}
      onMouseEnter={() => { if (!readOnly) onHoverStart?.(blockKey); }}
      onMouseLeave={() => { if (!readOnly) onHoverEnd?.(blockKey); }}
    >
      {children}

      {!readOnly && selected && HANDLES.map((h) => (
        <div
          key={h}
          data-resize-handle={h}
          onPointerDown={(e) => startResize(e, h)}
          style={{
            position: "absolute",
            width: 10, height: 10,
            background: "#2563eb",
            border: "2px solid #fff",
            borderRadius: 3,
            zIndex: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            ...HANDLE_STYLE[h],
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SlideCanvas — pure DOM renderer
// ─────────────────────────────────────────────────────────────────────────────

function SlideCanvas({
  slide, selectedBlock, snapEnabled,
  multiSelectedBlocks, onMultiSelectBlocksChange,
  onSelectBlock, onLayoutChange, onMoveGroup, onMoveBlocks, onReorderBlock, onRemoveBlock, onEditBlock, readOnly = false,
}: {
  slide: EditablePptSlide;
  selectedBlock: BlockKey | null;
  snapEnabled: boolean;
  multiSelectedBlocks: BlockKey[];
  onMultiSelectBlocksChange: (blocks: BlockKey[]) => void;
  onSelectBlock: (b: BlockKey | null) => void;
  onLayoutChange: (b: BlockKey, zone: CanvasZone) => void;
  onMoveGroup: (group: HoverGroupKey, dx: number, dy: number) => void;
  onMoveBlocks: (blocks: BlockKey[], dx: number, dy: number) => void;
  onReorderBlock: (b: BlockKey, dir: "forward" | "backward") => void;
  onRemoveBlock: (b: BlockKey) => void;
  onEditBlock: (b: BlockKey, value: string) => void;
  readOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; block: BlockKey } | null>(null);
  const [editingBlock, setEditingBlock] = useState<BlockKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoveredGroup, setHoveredGroup] = useState<HoverGroupKey | null>(null);
  const [draggedGroup, setDraggedGroup] = useState<HoverGroupKey | null>(null);
  const [groupOffset, setGroupOffset] = useState({ dx: 0, dy: 0 });
  const [marqueeArmed, setMarqueeArmed] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<PixelRect | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const autoFitRef = useRef<Record<string, string>>({});
  const groupDragRef = useRef<{ group: HoverGroupKey; mx: number; my: number } | null>(null);
  const marqueeRef = useRef<{ x: number; y: number } | null>(null);
  const multiDragRef = useRef<{ mx: number; my: number } | null>(null);

  // ── Responsive scale ─────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const sync = () => {
      const pad = 40;
      setScale(Math.min((node.clientWidth - pad) / LW, (node.clientHeight - pad) / LH, 1));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (editingBlock && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingBlock]);

  // ── Derived values ────────────────────────────────────────────────────────
  const fontFamily = getCanvasFontFamily(slide);
  const renderModel = buildSlideRenderModel(slide, { width: LW, height: LH });

  const visualImageMap = useLoadedImageMap(
    [
      ...renderModel.visuals.map((item) => ({ id: item.key, src: item.imageData })),
      ...(renderModel.backgroundImage
        ? [{ id: "__background__", src: renderModel.backgroundImage.imageData }]
        : []),
    ]
  );

  const orderedZones = useMemo(() => {
    const src    = slide.canvasOrder?.length ? slide.canvasOrder : DEFAULT_CANVAS_ORDER;
    const unique = Array.from(new Set(src.filter(Boolean)));
    return [
      ...unique.filter((k): k is CanvasZoneKey => DEFAULT_CANVAS_ORDER.includes(k as CanvasZoneKey)),
      ...DEFAULT_CANVAS_ORDER.filter((k) => !unique.includes(k)),
    ];
  }, [slide.canvasOrder]);

  const groupRects = useMemo(() => {
    const result: Partial<Record<HoverGroupKey, PixelRect>> = {};
    const bodyRect = unionRects(renderModel.bodyBlocks.map((block) => clampRect(block.box, 220, 56)));
    const bulletsRect = unionRects(renderModel.bullets.map((bullet) => clampRect(bullet.box, 220, 58)));
    const visualRect = unionRects(renderModel.visuals.map((visual) => clampRect(visual.box, 220, 150)));
    if (renderModel.bodyBlocks.length > 1 && bodyRect) result.body = bodyRect;
    if (renderModel.bullets.length > 1 && bulletsRect) result.bullets = bulletsRect;
    if (renderModel.visuals.length > 1 && visualRect) result.visual = visualRect;
    return result;
  }, [renderModel.bodyBlocks, renderModel.bullets, renderModel.visuals]);

  useEffect(() => {
    renderModel.visuals.forEach((visual) => {
      const itemId = visual.key.replace("visual-item-", "");
      if (!itemId) return;
      if (slide.visualItemLayouts?.[itemId]) return;

      const image = visualImageMap[visual.key];
      const imageSrc = image?.src || "";
      if (!image || !imageSrc) return;

      const fitSignature = `${visual.prompt || ""}|${imageSrc}`;
      if (autoFitRef.current[itemId] === fitSignature) return;

      autoFitRef.current[itemId] = fitSignature;
      onLayoutChange(
        visual.key as BlockKey,
        fromCanvasPixels(
          getAutoFitVisualRect(visual.box, image),
          LW,
          LH
        )
      );
    });
  }, [onLayoutChange, renderModel.visuals, slide.visualItemLayouts, visualImageMap]);

  // ── Inline edit helpers ──────────────────────────────────────────────────
  function openEdit(block: BlockKey, value: string) {
    setEditingBlock(block);
    setEditValue(value);
    onSelectBlock(block);
  }

  function commitEdit() {
    if (!editingBlock) return;
    onEditBlock(editingBlock, editValue);
    setEditingBlock(null);
  }

  function handleGroupPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    group: HoverGroupKey
  ) {
    e.preventDefault();
    e.stopPropagation();
    setDraggedGroup(group);
    setHoveredGroup(group);
    groupDragRef.current = { group, mx: e.clientX, my: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleGroupPointerMove(
    e: React.PointerEvent<HTMLDivElement>,
    group: HoverGroupKey
  ) {
    if (!groupDragRef.current || groupDragRef.current.group !== group) return;
    const rect = groupRects[group];
    if (!rect) return;
    const rawDx = (e.clientX - groupDragRef.current.mx) / scale;
    const rawDy = (e.clientY - groupDragRef.current.my) / scale;
    setGroupOffset(clampGroupDelta(rect, rawDx, rawDy));
  }

  function handleGroupPointerUp(group: HoverGroupKey) {
    if (!groupDragRef.current || groupDragRef.current.group !== group) return;
    const { dx, dy } = groupOffset;
    groupDragRef.current = null;
    setDraggedGroup(null);
    setGroupOffset({ dx: 0, dy: 0 });
    if (dx !== 0 || dy !== 0) onMoveGroup(group, dx, dy);
  }

  const blockRectMap: Partial<Record<BlockKey, PixelRect>> = {};

  // ── Block factory ─────────────────────────────────────────────────────────
  // This is the KEY improvement: the textarea for editing uses the SAME font/
  // size CSS as the display div, so what-you-see-is-what-you-get.
  let layerIndex = 1;
  function makeBlock(
    key: BlockKey,
    rect: PixelRect,
    displayContent: React.ReactNode,
    editableValue: string,
    editStyle: React.CSSProperties,
    minW = 120,
    minH = 56,
  ) {
    const editable = !(key === "visual" || key.startsWith("visual-item-"));
    const clamped  = clampRect(rect, minW, minH);
    blockRectMap[key] = clamped;
    const isEditing = editingBlock === key;
    const blockLayerIndex = layerIndex++;

    return (
      <DraggableBlock
        key={key}
        blockKey={key}
        rect={clamped}
        selected={selectedBlock === key}
        snapEnabled={snapEnabled}
        scale={scale}
        layerIndex={blockLayerIndex}
        readOnly={readOnly}
        onSelect={() => { onMultiSelectBlocksChange([]); onSelectBlock(key); setCtxMenu(null); }}
        onRectChange={(r) => onLayoutChange(key, fromCanvasPixels(r, LW, LH))}
        onDoubleClick={() => { if (editable) openEdit(key, editableValue); }}
        onContextMenu={(e) => { onMultiSelectBlocksChange([]); onSelectBlock(key); setCtxMenu({ x: e.clientX, y: e.clientY, block: key }); }}
        onHoverStart={(block) => {
          const group = getHoverGroupForBlock(block);
          if (group && groupRects[group]) setHoveredGroup(group);
        }}
        onHoverEnd={(block) => {
          const group = getHoverGroupForBlock(block);
          if (group && draggedGroup !== group) {
            setHoveredGroup((current) => (current === group ? null : current));
          }
        }}
      >
        {isEditing ? (
          // Textarea shares exact CSS with the display element — zero visual jump
          <textarea
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); editRef.current?.blur(); }
              if (e.key === "Escape") { setEditingBlock(null); }
            }}
            style={{
              position: "absolute", inset: 0,
              resize: "none",
              background: "rgba(255,255,255,0.97)",
              border: "none", outline: "none",
              borderRadius: 12,
              boxShadow: "0 0 0 2px #2563eb, 0 4px 20px rgba(37,99,235,0.15)",
              zIndex: 30,
              ...editStyle,
            }}
          />
        ) : displayContent}
      </DraggableBlock>
    );
  }

  // ── Build blocks for all zones ────────────────────────────────────────────
  const blockNodes: React.ReactNode[] = [];

  for (const zone of orderedZones) {

    // ── Title ──────────────────────────────────────────────────────────────
    if (zone === "title") {
      const textStyle = getBlockTextStyle(slide, "title");
      const style: React.CSSProperties = {
        fontFamily, fontSize: renderModel.title.fontSize, fontWeight: textStyle.bold ? 800 : 700,
        fontStyle: textStyle.italic ? "italic" : "normal",
        lineHeight: 1.1, color: `#${renderModel.title.color}`, textAlign: renderModel.title.textAlign,
        padding: "10px 14px",
      };
      blockNodes.push(makeBlock(
        "title", renderModel.title.box,
        <div style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          ...style,
        }}>
          {renderModel.title.text || "Untitled slide"}
        </div>,
        renderModel.title.text || "", style, 160, 60
      ));
      continue;
    }

    // ── Body ───────────────────────────────────────────────────────────────
    if (zone === "body") {
      if (renderModel.bodyBlocks.length > 0) {
        renderModel.bodyBlocks.forEach((block) => {
          const textStyle = getBlockTextStyle(slide, block.key);
          const style: React.CSSProperties = {
            fontFamily, fontSize: block.fontSize,
            fontWeight: textStyle.bold ? 700 : 400,
            fontStyle: textStyle.italic ? "italic" : "normal",
            lineHeight: 1.2, color: `#${block.color}`, padding: "10px 14px", textAlign: block.textAlign,
          };
          blockNodes.push(makeBlock(
            block.key as BlockKey, block.box,
            <div style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              ...style,
            }}>{block.text}</div>,
            block.text, style, 220, 56
          ));
        });
        continue;
      }

      const bodyTextStyle = getBlockTextStyle(slide, "body");
      const style: React.CSSProperties = {
        fontFamily, fontSize: 18, lineHeight: 1.25,
        fontWeight: bodyTextStyle.bold ? 700 : 400,
        fontStyle: bodyTextStyle.italic ? "italic" : "normal",
        color: "#475569", padding: "10px 14px", textAlign: slide.textAlignments?.body || "left",
      };
      blockNodes.push(makeBlock(
        "body", { x: renderModel.title.box.x, y: renderModel.title.box.y + renderModel.title.box.h + 24, w: renderModel.title.box.w, h: 84 },
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
          {slide.body || "Add supporting body copy here."}
        </div>,
        slide.body || "", style, 220, 64
      ));
      continue;
    }

    // ── Bullets ────────────────────────────────────────────────────────────
    if (zone === "bullets") {
      renderModel.bullets.forEach((bullet) => {
        const textStyle = getBlockTextStyle(slide, bullet.key);
        const style: React.CSSProperties = {
          fontFamily,
          fontSize: bullet.fontSize,
          fontWeight: textStyle.bold ? 700 : 500,
          fontStyle: textStyle.italic ? "italic" : "normal",
          lineHeight: 1.25,
          color: `#${bullet.color}`,
          padding: "8px 16px",
          textAlign: bullet.textAlign,
        };
        blockNodes.push(makeBlock(
          bullet.key as BlockKey, bullet.box,
          <div style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            ...style,
          }}>
            {`• ${bullet.text}`}
          </div>,
          bullet.text, style, 220, 58
        ));
      });
      continue;
    }

    // ── Notes — not shown on canvas ────────────────────────────────────────
    if (zone === "notes") continue;

    // ── Visual items ───────────────────────────────────────────────────────
    if (zone === "visual") {
      if (renderModel.backgroundImage) {
        blockNodes.push(makeBlock(
          "visual",
          renderModel.backgroundImage.box,
          <img
            src={renderModel.backgroundImage.imageData}
            alt={slide.title || "slide background visual"}
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.82,
              pointerEvents: "none",
            }}
          />,
          "",
          { padding: 0 },
          220,
          150
        ));
        continue;
      }
      renderModel.visuals.forEach((visual) => {
        const imgEl = visualImageMap[visual.key] || null;
        blockNodes.push(makeBlock(
          visual.key as BlockKey, visual.box,
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: 14,
              background: "transparent",
              border: "none",
            }}
          >
            {imgEl ? (
              <img
                src={(imgEl as HTMLImageElement).src}
                alt={visual.prompt || "slide visual"}
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 14,
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 8,
                color: "#94a3b8", fontFamily, fontSize: 13,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <span style={{ textAlign:"center", padding:"0 20px", lineHeight:1.3, maxWidth: "80%" }}>
                  {visual.prompt ? "AI image preview pending" : "AI image pending"}
                </span>
              </div>
            )}
          </div>,
          visual.prompt || "",
          { fontFamily, fontSize: 13, padding: "12px" },
          220, 150
        ));
      });
      continue;
    }
  }

  const multiSelectedRect = unionRects(
    multiSelectedBlocks
      .map((block) => blockRectMap[block])
      .filter((rect): rect is PixelRect => Boolean(rect)),
    8
  );
  const selectedReorderTarget = selectedBlock ? getReorderTargetForBlock(selectedBlock) : null;

  function beginMarqueeSelection(e: React.PointerEvent<HTMLDivElement>) {
    if (!marqueeArmed || e.target !== e.currentTarget) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.nativeEvent.offsetX;
    const startY = e.nativeEvent.offsetY;
    marqueeRef.current = { x: startX, y: startY };
    setMarqueeRect({ x: startX, y: startY, w: 0, h: 0 });
    onMultiSelectBlocksChange([]);
    onSelectBlock(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveMarqueeSelection(e: React.PointerEvent<HTMLDivElement>) {
    if (!marqueeRef.current) return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const start = marqueeRef.current;
    setMarqueeRect({
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      w: Math.abs(x - start.x),
      h: Math.abs(y - start.y),
    });
  }

  function endMarqueeSelection() {
    if (!marqueeRef.current || !marqueeRect) return;
    const hits = (Object.entries(blockRectMap) as Array<[BlockKey, PixelRect]>)
      .filter(([block]) => block !== "title" && block !== "body")
      .filter(([, rect]) => intersectsRect(rect, marqueeRect))
      .map(([block]) => block);
    onMultiSelectBlocksChange(hits);
    setMarqueeRect(null);
    marqueeRef.current = null;
    setMarqueeArmed(false);
  }

  function beginMultiDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!multiSelectedRect || multiSelectedBlocks.length < 2) return;
    e.preventDefault();
    e.stopPropagation();
    multiDragRef.current = { mx: e.clientX, my: e.clientY };
    setGroupOffset({ dx: 0, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveMultiDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!multiDragRef.current || !multiSelectedRect) return;
    const rawDx = (e.clientX - multiDragRef.current.mx) / scale;
    const rawDy = (e.clientY - multiDragRef.current.my) / scale;
    setGroupOffset(clampGroupDelta(multiSelectedRect, rawDx, rawDy));
  }

  function endMultiDrag() {
    if (!multiDragRef.current) return;
    const { dx, dy } = groupOffset;
    multiDragRef.current = null;
    setGroupOffset({ dx: 0, dy: 0 });
    if (dx !== 0 || dy !== 0) onMoveBlocks(multiSelectedBlocks, dx, dy);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#e9eef5] p-4 dark:bg-[#0f172a]"
      onClick={() => { onSelectBlock(null); setCtxMenu(null); }}
      onDoubleClick={() => {
        if (readOnly) return;
        setEditingBlock(null);
        onSelectBlock(null);
        setCtxMenu(null);
      }}
    >
      {/* Slide surface */}
      <div
        style={{
          position: "relative", width: LW, height: LH, flexShrink: 0,
          transform: `scale(${scale})`, transformOrigin: "center center",
          background: renderModel.backgroundColor || "#FFFFFF",
          boxShadow: "0 24px 64px rgba(15,23,42,0.20), 0 4px 16px rgba(15,23,42,0.08)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          if (readOnly) return;
          e.stopPropagation();
          setEditingBlock(null);
          onSelectBlock(null);
          setCtxMenu(null);
          onMultiSelectBlocksChange([]);
          setMarqueeArmed(true);
        }}
        onPointerDown={beginMarqueeSelection}
        onPointerMove={moveMarqueeSelection}
        onPointerUp={endMarqueeSelection}
        onPointerCancel={endMarqueeSelection}
      >
        {/* Content blocks */}
        {blockNodes}

        {marqueeRect && (
          <div
            style={{
              position: "absolute",
              left: marqueeRect.x,
              top: marqueeRect.y,
              width: marqueeRect.w,
              height: marqueeRect.h,
              border: "1.5px solid rgba(37,99,235,0.9)",
              background: "rgba(59,130,246,0.12)",
              pointerEvents: "none",
              zIndex: 26,
            }}
          />
        )}

        {multiSelectedRect && multiSelectedBlocks.length > 1 && !marqueeRect && (
          <div
            style={{
              position: "absolute",
              left: multiSelectedRect.x + groupOffset.dx,
              top: multiSelectedRect.y + groupOffset.dy,
              width: multiSelectedRect.w,
              height: multiSelectedRect.h,
              border: "2px dashed rgba(37,99,235,0.9)",
              background: "rgba(59,130,246,0.08)",
              borderRadius: 16,
              zIndex: 26,
              cursor: "grab",
            }}
            onPointerDown={beginMultiDrag}
            onPointerMove={moveMultiDrag}
            onPointerUp={endMultiDrag}
            onPointerCancel={endMultiDrag}
          />
        )}
      </div>

      {/* Context menu */}
      {!readOnly && ctxMenu && (
        <div
          className="fixed z-50 min-w-45 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ left: ctxMenu.x + 8, top: ctxMenu.y + 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {(["forward","backward"] as const).map((dir) => (
            <button key={dir} type="button"
              onClick={() => {
                const reorderTarget = getReorderTargetForBlock(ctxMenu.block);
                onReorderBlock(reorderTarget, dir);
                setCtxMenu(null);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              {dir === "forward" ? "Bring Forward" : "Send Backward"}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <button type="button"
            onClick={() => { onRemoveBlock(ctxMenu.block); setCtxMenu(null); }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
            Remove Object
          </button>
        </div>
      )}

      {/* Floating toolbar — appears at bottom when a block is selected */}
      {!readOnly && selectedBlock && !editingBlock && (
        <div
          className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mr-2 max-w-35 truncate text-xs font-medium text-slate-400">
            {selectedBlock}
          </span>
          <Button type="button" variant="outline" size="sm"
            onClick={() => { if (selectedReorderTarget) onReorderBlock(selectedReorderTarget, "backward"); }}
            className="h-7 px-2 text-xs">↓ Back</Button>
          <Button type="button" variant="outline" size="sm"
            onClick={() => { if (selectedReorderTarget) onReorderBlock(selectedReorderTarget, "forward"); }}
            className="h-7 px-2 text-xs">↑ Front</Button>
          <Button type="button" variant="outline" size="sm"
            onClick={() => onRemoveBlock(selectedBlock)}
            className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600">✕ Remove</Button>
          <Button type="button" variant="ghost" size="sm"
            onClick={() => onSelectBlock(null)}
            className="h-7 px-2 text-xs text-slate-400">✗ Deselect</Button>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PptxEditor — shell with undo/redo, keyboard, inspector, slide panel
// ─────────────────────────────────────────────────────────────────────────────

export default function PptxEditor({ deck, onChange, onDownload, loading, onClose }: Props) {
  const [selectedIndex, setSelectedIndex]         = useState(0);
  const [inspectorTab, setInspectorTab]           = useState<"content" | "design">("content");
  const [selectedBlock, setSelectedBlock]         = useState<BlockKey | null>(null);
  const [snapEnabled, setSnapEnabled]             = useState(true);
  const [toolAction, setToolAction]               = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewError, setPreviewError]           = useState<string | null>(null);
  const [slideshowOpen, setSlideshowOpen]         = useState(false);
  const [slideshowIndex, setSlideshowIndex]       = useState(0);
  const [multiSelectedBlocks, setMultiSelectedBlocks] = useState<BlockKey[]>([]);

  // ── Draft slide ──────────────────────────────────────────────────────────
  const selectedSlide = deck.slides[selectedIndex] || deck.slides[0] || createBlankSlide(deck);
  const [draftSlide, setDraftSlide] = useState<EditablePptSlide>(normalizeSlide(selectedSlide));
  const skipDraftReloadRef = useRef(false);
  const latestDeckRef = useRef<PptDeck>(deck);
  const originalSlidesRef = useRef<EditablePptSlide[]>(
    deck.slides.map((slide) => normalizeSlide(slide))
  );
  const [generatedSlides, setGeneratedSlides] = useState<boolean[]>(
    () => deck.slides.map(() => false)
  );

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  const [history, setHistory]           = useState<PptDeck[]>([deck]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipHistoryRef                  = useRef(false);

  function pushHistory(nextDeck: PptDeck) {
    if (skipHistoryRef.current) return;
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      const next    = [...trimmed, nextDeck];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
    setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
  }

  function handleUndo() {
    if (historyIndex <= 0) return;
    const prev    = history[historyIndex - 1];
    const safeIdx = Math.min(selectedIndex, prev.slides.length - 1);
    skipHistoryRef.current = skipDraftReloadRef.current = true;
    setHistoryIndex((i) => i - 1);
    onChange(prev);
    setSelectedIndex(safeIdx);
    setDraftSlide(normalizeSlide(prev.slides[safeIdx] || createBlankSlide(prev)));
    setTimeout(() => { skipHistoryRef.current = false; }, 0);
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) return;
    const next    = history[historyIndex + 1];
    const safeIdx = Math.min(selectedIndex, next.slides.length - 1);
    skipHistoryRef.current = skipDraftReloadRef.current = true;
    setHistoryIndex((i) => i + 1);
    onChange(next);
    setSelectedIndex(safeIdx);
    setDraftSlide(normalizeSlide(next.slides[safeIdx] || createBlankSlide(next)));
    setTimeout(() => { skipHistoryRef.current = false; }, 0);
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const active = document.activeElement;
      const inText =
        active instanceof HTMLInputElement   ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); handleUndo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey ? e.key === "z" : e.key === "y")) { e.preventDefault(); handleRedo(); return; }
      if (!inText) {
        if (e.key === "Escape") setSelectedBlock(null);
        if ((e.key === "Delete" || e.key === "Backspace") && selectedBlock)
          handleRemoveBlock(selectedBlock);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history.length, selectedBlock]);

  // ── Auto-commit draft → deck (debounced 600 ms) ──────────────────────────
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      const baseDeck = latestDeckRef.current;
      const cur = normalizeSlide(baseDeck.slides[selectedIndex] || createBlankSlide(baseDeck));
      if (slidesEqual(cur, draftSlide)) return;
      const next = replaceDeckSlide(baseDeck, selectedIndex, draftSlide);
      latestDeckRef.current = next;
      skipDraftReloadRef.current = true;
      pushHistory(next);
      onChange(next);
    }, 600);
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSlide]);

  // ── Sync draft ───────────────────────────────────────────────────────────
  useEffect(() => {
    latestDeckRef.current = deck;
    const safeIdx = Math.min(selectedIndex, Math.max(0, deck.slides.length - 1));
    if (safeIdx !== selectedIndex) { setSelectedIndex(safeIdx); return; }
    const next = normalizeSlide(deck.slides[safeIdx] || createBlankSlide(deck));
    if (skipDraftReloadRef.current) { skipDraftReloadRef.current = false; return; }
    setDraftSlide((cur) => (slidesEqual(cur, next) ? cur : next));
  }, [deck, selectedIndex]);

  useEffect(() => { setSelectedBlock(null); setMultiSelectedBlocks([]); }, [selectedIndex]);

  useEffect(() => {
    if (!slideshowOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSlideshowOpen(false);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setSlideshowIndex((current) => Math.min(deck.slides.length - 1, current + 1));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSlideshowIndex((current) => Math.max(0, current - 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deck.slides.length, slideshowOpen]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function updateDraft(patch: Partial<EditablePptSlide>) {
    setDraftSlide((cur) => normalizeSlide({ ...cur, ...patch }));
  }

  const selectedTextTargets = useMemo(() => {
    const blocks = multiSelectedBlocks.length > 1
      ? multiSelectedBlocks
      : selectedBlock
        ? [selectedBlock]
        : [];
    return blocks.filter((block) => !block.startsWith("visual-item-") && block !== "visual");
  }, [multiSelectedBlocks, selectedBlock]);

  function toggleTextStyle(styleKey: "bold" | "italic") {
    if (selectedTextTargets.length === 0) return;
    const nextEnabled = !selectedTextTargets.every((key) => Boolean(draftSlide.textStyles?.[key]?.[styleKey]));
    const nextTextStyles = { ...(draftSlide.textStyles || {}) };
    selectedTextTargets.forEach((key) => {
      nextTextStyles[key] = {
        ...(nextTextStyles[key] || {}),
        [styleKey]: nextEnabled,
      };
    });
    updateDraft({ textStyles: nextTextStyles });
  }

  function commitDraftToDeck(base: PptDeck = latestDeckRef.current): PptDeck {
    const cur = normalizeSlide(base.slides[selectedIndex] || createBlankSlide(base));
    return slidesEqual(cur, draftSlide) ? base : replaceDeckSlide(base, selectedIndex, draftSlide);
  }

  function applyDeckUpdate(
    nextDeck: PptDeck,
    opts?: { nextIndex?: number; nextDraft?: EditablePptSlide }
  ) {
    const idx   = opts?.nextIndex ?? selectedIndex;
    const draft = opts?.nextDraft ?? normalizeSlide(nextDeck.slides[idx] || createBlankSlide(nextDeck));
    skipDraftReloadRef.current = true;
    latestDeckRef.current = nextDeck;
    pushHistory(nextDeck);
    onChange(nextDeck);
    setSelectedIndex(idx);
    setDraftSlide(draft);
  }

  // ── Slide operations ─────────────────────────────────────────────────────
  function handleSelectSlide(idx: number) {
    if (idx === selectedIndex) return;
    const committed = commitDraftToDeck(deck);
    applyDeckUpdate(committed, {
      nextIndex: idx,
      nextDraft: normalizeSlide(committed.slides[idx] || createBlankSlide(committed)),
    });
  }

  function handleAddSlide() {
    const c = commitDraftToDeck(deck);
    const ns = createBlankSlide(c);
    const nd = addDeckSlide(c, ns);
    setGeneratedSlides((current) => [...current, false]);
    applyDeckUpdate(nd, { nextIndex: nd.slides.length - 1, nextDraft: normalizeSlide(ns) });
  }

  function handleDuplicateSlide() {
    const nd = cloneDeckSlide(commitDraftToDeck(deck), selectedIndex);
    setGeneratedSlides((current) => {
      const next = [...current];
      next.splice(selectedIndex + 1, 0, false);
      return next;
    });
    applyDeckUpdate(nd, { nextIndex: selectedIndex + 1, nextDraft: normalizeSlide(nd.slides[selectedIndex + 1]) });
  }

  function handleDeleteSlide() {
    if (deck.slides.length <= 1) return;
    const nd  = deleteDeckSlide(commitDraftToDeck(deck), selectedIndex);
    const idx = Math.max(0, selectedIndex - 1);
    setGeneratedSlides((current) => current.filter((_, i) => i !== selectedIndex));
    applyDeckUpdate(nd, { nextIndex: idx, nextDraft: normalizeSlide(nd.slides[idx]) });
  }

  // ── Canvas handlers ───────────────────────────────────────────────────────
  function handleLayoutChange(block: BlockKey, zone: CanvasZone) {
    if (block.startsWith("bullet-"))
      updateDraft({ bulletLayouts: { ...(draftSlide.bulletLayouts||{}), [block.replace("bullet-","")]: zone } });
    else if (block.startsWith("body-block-"))
      updateDraft({ bodyBlockLayouts: { ...(draftSlide.bodyBlockLayouts||{}), [block.replace("body-block-","")]: zone } });
    else if (block.startsWith("visual-item-"))
      updateDraft({ visualItemLayouts: { ...(draftSlide.visualItemLayouts||{}), [block.replace("visual-item-","")]: zone } });
    else
      updateDraft({ canvasLayout: { ...(draftSlide.canvasLayout||{}), [block]: zone } });
  }

  function handleMoveGroup(group: HoverGroupKey, dx: number, dy: number) {
    const model = buildSlideRenderModel(draftSlide, { width: LW, height: LH });
    if (group === "body") {
      const nextLayouts = { ...(draftSlide.bodyBlockLayouts || {}) };
      model.bodyBlocks.forEach((block, index) => {
        nextLayouts[String(index)] = fromCanvasPixels(
          clampRect({ ...block.box, x: block.box.x + dx, y: block.box.y + dy }, 220, 56),
          LW,
          LH
        );
      });
      updateDraft({ bodyBlockLayouts: nextLayouts });
      return;
    }
    if (group === "bullets") {
      const nextLayouts = { ...(draftSlide.bulletLayouts || {}) };
      model.bullets.forEach((bullet, index) => {
        nextLayouts[String(index)] = fromCanvasPixels(
          clampRect({ ...bullet.box, x: bullet.box.x + dx, y: bullet.box.y + dy }, 220, 58),
          LW,
          LH
        );
      });
      updateDraft({ bulletLayouts: nextLayouts });
      return;
    }
    const visualItems = toVisualItems(draftSlide);
    const nextLayouts = { ...(draftSlide.visualItemLayouts || {}) };
    model.visuals.forEach((visual, index) => {
      const itemId = visualItems[index]?.id;
      if (!itemId) return;
      nextLayouts[itemId] = fromCanvasPixels(
        clampRect({ ...visual.box, x: visual.box.x + dx, y: visual.box.y + dy }, 220, 150),
        LW,
        LH
      );
    });
    updateDraft({ visualItemLayouts: nextLayouts });
  }

  function handleMoveBlocks(blocks: BlockKey[], dx: number, dy: number) {
    const model = buildSlideRenderModel(draftSlide, { width: LW, height: LH });
    const nextBulletLayouts = { ...(draftSlide.bulletLayouts || {}) };
    const nextBodyLayouts = { ...(draftSlide.bodyBlockLayouts || {}) };
    const nextVisualLayouts = { ...(draftSlide.visualItemLayouts || {}) };
    const visualItems = toVisualItems(draftSlide);

    blocks.forEach((block) => {
      if (block.startsWith("bullet-")) {
        const index = Number(block.replace("bullet-", ""));
        const bullet = model.bullets[index];
        if (!bullet) return;
        nextBulletLayouts[String(index)] = fromCanvasPixels(
          clampRect({ ...bullet.box, x: bullet.box.x + dx, y: bullet.box.y + dy }, 220, 58),
          LW,
          LH
        );
        return;
      }
      if (block.startsWith("body-block-")) {
        const index = Number(block.replace("body-block-", ""));
        const bodyBlock = model.bodyBlocks[index];
        if (!bodyBlock) return;
        nextBodyLayouts[String(index)] = fromCanvasPixels(
          clampRect({ ...bodyBlock.box, x: bodyBlock.box.x + dx, y: bodyBlock.box.y + dy }, 220, 56),
          LW,
          LH
        );
        return;
      }
      if (block.startsWith("visual-item-")) {
        const itemId = block.replace("visual-item-", "");
        const visualIndex = visualItems.findIndex((item) => item.id === itemId);
        const visual = visualIndex >= 0 ? model.visuals[visualIndex] : null;
        if (!visual) return;
        nextVisualLayouts[itemId] = fromCanvasPixels(
          clampRect({ ...visual.box, x: visual.box.x + dx, y: visual.box.y + dy }, 220, 150),
          LW,
          LH
        );
      }
    });

    updateDraft({
      bulletLayouts: nextBulletLayouts,
      bodyBlockLayouts: nextBodyLayouts,
      visualItemLayouts: nextVisualLayouts,
    });
  }

  function handleReorderBlock(block: BlockKey, dir: "forward" | "backward") {
    const delta = dir === "forward" ? 1 : -1;

    if (block.startsWith("bullet-")) {
      const idx  = Number(block.replace("bullet-",""));
      const list = draftSlide.bullets || [];
      if (idx < 0 || idx >= list.length) return;
      const order  = list.map((_,i) => i);
      const target = Math.max(0, Math.min(order.length-1, idx+delta));
      if (target === idx) return;
      const [m] = order.splice(idx,1); order.splice(target,0,m);
      const nb = order.map((i) => list[i]);
      const nl: Record<string,CanvasZone> = {};
      order.forEach((old,newI) => { const l=draftSlide.bulletLayouts?.[String(old)]; if(l) nl[String(newI)]=l; });
      updateDraft({ bullets:nb, bulletLayouts:nl, canvasOrder:moveCanvasBlock(draftSlide.canvasOrder,"bullets",dir) });
      setSelectedBlock(`bullet-${target}`);
      return;
    }
    if (block.startsWith("body-block-")) {
      const idx  = Number(block.replace("body-block-",""));
      const list = draftSlide.bodyBlocks || [];
      if (idx < 0 || idx >= list.length) return;
      const order  = list.map((_,i) => i);
      const target = Math.max(0, Math.min(order.length-1, idx+delta));
      if (target === idx) return;
      const [m] = order.splice(idx,1); order.splice(target,0,m);
      const nb = order.map((i) => list[i]);
      const nl: Record<string,CanvasZone> = {};
      order.forEach((old,newI) => { const l=draftSlide.bodyBlockLayouts?.[String(old)]; if(l) nl[String(newI)]=l; });
      updateDraft({ bodyBlocks:nb, body:nb.join(" ").trim(), bodyBlockLayouts:nl, canvasOrder:moveCanvasBlock(draftSlide.canvasOrder,"body",dir) });
      setSelectedBlock(`body-block-${target}`);
      return;
    }
    if (block.startsWith("visual-item-")) {
      const items = (Array.isArray(draftSlide.visualItems) && draftSlide.visualItems.length > 0
        ? draftSlide.visualItems : toVisualItems(draftSlide)).slice();
      const idx    = items.findIndex((it) => `visual-item-${it.id}` === block);
      if (idx < 0) return;
      const target = Math.max(0, Math.min(items.length-1, idx+delta));
      if (target !== idx) {
        const [m] = items.splice(idx,1); items.splice(target,0,m);
        updateDraft({ visualItems:items });
        setSelectedBlock(`visual-item-${items[target].id}`);
        return;
      }
      updateDraft({ canvasOrder: moveCanvasBlock(draftSlide.canvasOrder, "visual", dir) });
      return;
    }
    if (isZoneKey(block))
      updateDraft({ canvasOrder: moveCanvasBlock(draftSlide.canvasOrder, block, dir) });
  }

  function handleRemoveBlock(block: BlockKey) {
    if (block.startsWith("bullet-")) {
      const idx = Number(block.replace("bullet-",""));
      const next = (draftSlide.bullets||[]).filter((_,i)=>i!==idx);
      const nl = {...(draftSlide.bulletLayouts||{})}; delete nl[String(idx)];
      Object.keys(nl).forEach((k)=>{ const n=Number(k); if(n>idx){nl[String(n-1)]=nl[k];delete nl[k];} });
      updateDraft({ bullets:next, bulletLayouts:nl });
    } else if (block.startsWith("body-block-")) {
      const idx  = Number(block.replace("body-block-",""));
      const next = (draftSlide.bodyBlocks||[draftSlide.body||""]).filter((_,i)=>i!==idx);
      const nl   = {...(draftSlide.bodyBlockLayouts||{})}; delete nl[String(idx)];
      Object.keys(nl).forEach((k)=>{ const n=Number(k); if(n>idx){nl[String(n-1)]=nl[k];delete nl[k];} });
      updateDraft({ bodyBlocks:next, body:next.join(" ").trim(), bodyBlockLayouts:nl });
    } else if (block.startsWith("visual-item-")) {
      const id    = block.replace("visual-item-","");
      const items = (Array.isArray(draftSlide.visualItems) && draftSlide.visualItems.length > 0
        ? draftSlide.visualItems : toVisualItems(draftSlide)).filter((it)=>it.id!==id);
      const nl = buildNextVisualLayouts(draftSlide, items);
      updateDraft({
        visualItems:items,
        visualItemLayouts:nl,
        imagePrompt:items.map((i)=>i.prompt).join("\n"),
        imageData: items.length === 0 ? "" : draftSlide.imageData,
      });
    }
    setSelectedBlock(null);
  }

  function handleEditBlock(block: BlockKey, value: string) {
    if (block==="title")  { updateDraft({ title:value }); return; }
    if (block==="body")   { updateDraft({ body:value });  return; }
    if (block.startsWith("bullet-")) {
      const next=[...(draftSlide.bullets||[])]; next[Number(block.replace("bullet-",""))]=value;
      updateDraft({ bullets:next }); return;
    }
    if (block.startsWith("body-block-")) {
      const next=[...(draftSlide.bodyBlocks||[])]; next[Number(block.replace("body-block-",""))]=value;
      updateDraft({ bodyBlocks:next, body:next.filter(Boolean).join(" ") }); return;
    }
  }

  // ── Visual / bullet helpers ───────────────────────────────────────────────
  const visualItemsDraft = useMemo(() => {
    if (Array.isArray(draftSlide.visualItems) && draftSlide.visualItems.length>0) return draftSlide.visualItems;
    return (draftSlide.imagePrompt||"").split(/\n+/).map((s)=>s.trim()).filter(Boolean)
      .map((prompt,i)=>({ id:`auto-${i+1}`, prompt }));
  }, [draftSlide.visualItems, draftSlide.imagePrompt]);

  function handleAddBullet() {
    if (generatedSlides[selectedIndex]) return;
    const next=[...(draftSlide.bullets||[])];
    next.push(suggestNewBullet(draftSlide, next.length));
    updateDraft({ bullets:next });
  }
  function handleRemoveBullet(idx: number) {
    const next=(draftSlide.bullets||[]).filter((_,i)=>i!==idx);
    const nl={...(draftSlide.bulletLayouts||{})}; delete nl[String(idx)];
    Object.keys(nl).forEach((k)=>{ const n=Number(k); if(n>idx){nl[String(n-1)]=nl[k];delete nl[k];} });
    updateDraft({ bullets:next, bulletLayouts:nl });
    if (selectedBlock===`bullet-${idx}`) setSelectedBlock(null);
  }
  function handleAddImageSlot() {
    if (generatedSlides[selectedIndex]) return;
    if (visualItemsDraft.length >= MAX_IMAGE_SLOTS_PER_SLIDE) return;
    const newId = newVisualId();
    const next=[...visualItemsDraft,{
      id:newId,
      prompt:suggestNewImagePrompt(draftSlide, visualItemsDraft.length),
      imageData:"",
    }];
    const currentVisualModel = buildSlideRenderModel(draftSlide, { width: LW, height: LH });
    const firstVisual = currentVisualModel.visuals[0];
    const firstVisualItemId = visualItemsDraft[0]?.id;
    const nextVisualLayouts = { ...(draftSlide.visualItemLayouts || {}) };
    if (firstVisual && firstVisualItemId) {
      const baseRect = clampRect(firstVisual.box, 220, 150);
      if (!nextVisualLayouts[firstVisualItemId]) {
        nextVisualLayouts[firstVisualItemId] = fromCanvasPixels(baseRect, LW, LH);
      }
      const nextRect = clampRect({
        x: baseRect.x,
        y: Math.min(LH - baseRect.h - 12, baseRect.y + baseRect.h + 24),
        w: baseRect.w,
        h: baseRect.h,
      }, 220, 150);
      nextVisualLayouts[newId] = fromCanvasPixels(nextRect, LW, LH);
    }
    updateDraft({
      visualItems:next,
      visualItemLayouts:nextVisualLayouts,
      imagePrompt:next.map((i)=>i.prompt).join("\n"),
      imageData:draftSlide.imageData || "",
    });
  }

  // ── Generate preview ──────────────────────────────────────────────────────
  async function handleGeneratePreview() {
    try {
      if (generatedSlides[selectedIndex]) {
        setPreviewError("This slide has already been generated. Use Reset to go back to the original slide before generating again.");
        return;
      }
      setGeneratingPreview(true); setPreviewError(null);
      const committed = commitDraftToDeck(deck);
      const res  = await fetch("/api/lesson-plan-deck-preview", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ deck:committed, selectedIndex }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        setPreviewError(res.status===429
          ? "Rate limited. Please try again in a minute."
          : data?.error||"Failed to generate deck preview.");
        return;
      }
      const nextSlides = Array.isArray(data?.slides) ? data.slides : [];
      const serverSelectedIndex =
        Number.isInteger(data?.selectedIndex) && data.selectedIndex >= 0
          ? Number(data.selectedIndex)
          : selectedIndex;
      const generatedSlide = data?.slide || nextSlides[serverSelectedIndex] || nextSlides[selectedIndex] || {};
      const generatedPrompts = Array.isArray(generatedSlide?.imagePrompts)
        ? generatedSlide.imagePrompts.filter(Boolean)
        : [];
      const generatedImages =
        data?.slideImages && typeof data.slideImages === "object"
          ? data.slideImages
          : {};
      const hasGeneratedContent =
        (typeof generatedSlide?.title === "string" && generatedSlide.title.trim().length > 0) ||
        (typeof generatedSlide?.body === "string" && generatedSlide.body.trim().length > 0) ||
        (Array.isArray(generatedSlide?.bullets) && generatedSlide.bullets.some((item: unknown) => typeof item === "string" && item.trim().length > 0)) ||
        generatedPrompts.length > 0 ||
        Object.keys(generatedImages).length > 0;
      if (!hasGeneratedContent) {
        setPreviewError("Preview generation returned no content for this slide. Please try again.");
        return;
      }
      const nextDeck: PptDeck = {
        ...committed,
        title:    typeof data?.title==="string"    ? data.title    : committed.title,
        subtitle: typeof data?.subtitle==="string" ? data.subtitle : committed.subtitle,
        slides: committed.slides.map((slide,i) => {
          if (i !== selectedIndex) return normalizeSlide(slide);

          const gen=generatedSlide;
          const pv=toVisualItems(normalizeSlide(slide));
          const prompts=pv.length>0 ? generatedPrompts.slice(0, pv.length) : [];
          const im=generatedImages;
          const generatedKeys = new Set(Object.keys(im));
          const nv=pv.length>0
            ? pv.map((item,pi)=>{
                const generatedId = `generated-${i+1}-${pi+1}`;
                return {
                  id:item.id || generatedId,
                  prompt:prompts[pi] || item.prompt || "",
                  imageData:item.imageData || im[item.id] || im[generatedId] || "",
                };
              })
            : toVisualItems(normalizeSlide(slide));
          const hasBodyStructure =
            (Array.isArray(slide.bodyBlocks) && slide.bodyBlocks.some((value) => String(value || "").trim().length > 0)) ||
            Boolean(slide.body?.trim());
          const hasBulletStructure =
            Array.isArray(slide.bullets) && slide.bullets.some((value) => String(value || "").trim().length > 0);
          const nb=typeof gen?.body==="string"&&gen.body.trim()?gen.body:slide.body;
          const nextBodyBlocks = hasBodyStructure
            ? splitGeneratedBodyBlocks(
                nb,
                (slide.bodyBlocks && slide.bodyBlocks.length > 0) ? slide.bodyBlocks : [slide.body || ""]
              )
            : [];
          const nbul=hasBulletStructure
            ? mergeGeneratedBullets(
                Array.isArray(gen?.bullets) && gen.bullets.length>0 ? gen.bullets : [],
                slide.bullets || []
              )
            : [];
          return normalizeSlide({
            ...slide,
            title: typeof gen?.title==="string"&&gen.title.trim()?gen.title:slide.title,
            body: hasBodyStructure ? nb : "",
            bodyBlocks:nextBodyBlocks,
            bullets:nbul,
            imagePrompt:prompts.length>0 ? prompts.join("\n") : slide.imagePrompt,
            visualItems:nv,
            imageData:generatedKeys.size===1 ? String(Object.values(im)[0] || "") : "",
          });
        }),
      };
      applyDeckUpdate(nextDeck,{
        nextIndex:selectedIndex,
        nextDraft:normalizeSlide(nextDeck.slides[selectedIndex]||createBlankSlide(nextDeck)),
      });
      setGeneratedSlides((current) => current.map((value, index) => (
        index === selectedIndex ? true : value
      )));
    } catch(err) {
      console.error(err); setPreviewError("Failed to generate preview. Please try again.");
    } finally { setGeneratingPreview(false); }
  }

  function handleDownload() {
    const final = commitDraftToDeck(deck);
    if (final!==deck) applyDeckUpdate(final,{nextIndex:selectedIndex,nextDraft:draftSlide});
    onDownload(final);
  }

  function handleOpenSlideshow() {
    const finalDeck = commitDraftToDeck(deck);
    if (finalDeck !== deck) {
      applyDeckUpdate(finalDeck, { nextIndex: selectedIndex, nextDraft: draftSlide });
    }
    setSlideshowIndex(selectedIndex);
    setSlideshowOpen(true);
  }

  function handleResetSlide() {
    const original = originalSlidesRef.current[selectedIndex];
    const resetSlide = original
      ? normalizeSlide(original)
      : normalizeSlide(createBlankSlide(deck));
    const committed = replaceDeckSlide(commitDraftToDeck(deck), selectedIndex, resetSlide);
    setGeneratedSlides((current) => current.map((value, index) => (
      index === selectedIndex ? false : value
    )));
    applyDeckUpdate(committed, {
      nextIndex: selectedIndex,
      nextDraft: resetSlide,
    });
    setPreviewError(null);
  }

  // ── Tool menu ─────────────────────────────────────────────────────────────
  const toolOptions = useMemo(()=>[
    { value:"toggle_snap",     label:snapEnabled?"Turn Snap Off":"Turn Snap On", req:false },
    { value:"new_slide",       label:"New Slide",       req:false },
    { value:"duplicate_slide", label:"Duplicate Slide", req:false },
    { value:"reset_slide",     label:"Reset Slide",     req:false },
    { value:"delete_slide",    label:"Delete Slide",    req:false },
    { value:"bring_front",     label:"Bring Selection Front", req:true },
    { value:"send_back",       label:"Send Selection Back",   req:true },
    { value:"deselect",        label:"Deselect Object",       req:true },
  ],[snapEnabled]);
  const canApply = !!toolAction && (!(toolOptions.find((o)=>o.value===toolAction)?.req)||Boolean(selectedBlock));
  function handleTool(action:string){
    const reorderTarget = selectedBlock ? getReorderTargetForBlock(selectedBlock) : null;
    switch(action){
      case "toggle_snap":     setSnapEnabled((v)=>!v); break;
      case "bring_front":     if(reorderTarget) handleReorderBlock(reorderTarget,"forward"); break;
      case "send_back":       if(reorderTarget) handleReorderBlock(reorderTarget,"backward"); break;
      case "deselect":        setSelectedBlock(null); break;
      case "new_slide":       handleAddSlide(); break;
      case "duplicate_slide": handleDuplicateSlide(); break;
      case "reset_slide":     handleResetSlide(); break;
      case "delete_slide":    handleDeleteSlide(); break;
    }
  }

  const slideAlreadyGenerated = Boolean(generatedSlides[selectedIndex]);
  const selectedLabel = selectedBlock?.startsWith("bullet-")     ?"Bullet Card"
    :selectedBlock?.startsWith("visual-item-")?"Image Card"
    :selectedBlock?.startsWith("body-block-") ?"Body Card"
    :isZoneKey(selectedBlock)?labelForCanvasBlock(selectedBlock):null;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh min-h-screen w-full flex-col overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-[#f6f8fc] text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#f8f9fb] px-3 py-2 shadow-sm sm:px-4 dark:border-slate-800 dark:bg-slate-950">
        <Button type="button" variant="outline" size="icon" onClick={handleUndo}
          disabled={historyIndex<=0} title="Undo (Ctrl+Z)"
          className="h-9 w-9 rounded-lg border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900">
          <Undo className="h-4 w-4"/>
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={handleRedo}
          disabled={historyIndex>=history.length-1} title="Redo (Ctrl+Y)"
          className="h-9 w-9 rounded-lg border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900">
          <Redo className="h-4 w-4"/>
        </Button>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          <Button type="button" variant="outline" onClick={handleAddSlide}
            className="h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <Plus className="mr-2 h-4 w-4"/>New Slide
          </Button>
          <Button type="button" variant="outline" onClick={handleDuplicateSlide}
            className="h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <Copy className="mr-2 h-4 w-4"/>Duplicate
          </Button>
          <Button type="button" variant="outline" onClick={handleOpenSlideshow}
            className="h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <Play className="mr-2 h-4 w-4"/>Slideshow
          </Button>
          <Button type="button" onClick={handleDownload} disabled={loading}
            className="h-9 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700">
            <Download className="mr-2 h-4 w-4"/>
            {loading?"Preparing...":"Download"}
          </Button>
          {onClose&&(
            <Button type="button" variant="ghost" size="icon" onClick={onClose}
              className="h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800">
              <X className="h-4 w-4"/>
            </Button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">

        {/* Slide panel */}
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-[#f1f3f7] lg:w-60 lg:border-b-0 lg:border-r dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{deck.title||"Presentation"}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{deck.subtitle||"Edited just now"}</div>
          </div>
          <div className="overflow-x-auto overflow-y-hidden p-3 lg:min-h-0 lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto">
            <div className="flex gap-3 lg:flex-col">
              {deck.slides.map((slide,i)=>(
                <SlideThumbnail key={`${i}-${slide.title}`} slide={normalizeSlide(slide)}
                  index={i} active={i===selectedIndex} onClick={()=>handleSelectSlide(i)}/>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {deck.slides.length} slides
          </div>
        </aside>

        {/* Canvas */}
        <section className="relative min-h-[40vh] shrink-0 overflow-hidden lg:min-h-0 lg:flex-1">
          <SlideCanvas
            slide={draftSlide}
            selectedBlock={selectedBlock}
            snapEnabled={snapEnabled}
            multiSelectedBlocks={multiSelectedBlocks}
            onMultiSelectBlocksChange={setMultiSelectedBlocks}
            onSelectBlock={setSelectedBlock}
            onLayoutChange={handleLayoutChange}
            onMoveGroup={handleMoveGroup}
            onMoveBlocks={handleMoveBlocks}
            onReorderBlock={handleReorderBlock}
            onRemoveBlock={handleRemoveBlock}
            onEditBlock={handleEditBlock}
          />
        </section>

        {/* Inspector */}
        <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-[#fbfcfe] lg:w-[340px] lg:border-t-0 lg:border-l dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
            <div className="text-lg font-semibold text-slate-900 dark:text-white">Slide Editor</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Double-click any block on the canvas to edit text inline.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["content","design"] as const).map((tab)=>(
                <button key={tab} type="button" onClick={()=>setInspectorTab(tab)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition ${
                    inspectorTab===tab
                      ?"bg-blue-600 text-white"
                      :"bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}>{tab}</button>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tools</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={toolAction} onChange={(e)=>setToolAction(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                  <option value="">Select a tool</option>
                  {toolOptions.map((o)=>(
                    <option key={o.value} value={o.value} disabled={o.req&&!selectedBlock}>{o.label}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" className="h-9"
                  disabled={!canApply}
                  onClick={()=>{ if(canApply){ handleTool(toolAction); setToolAction(""); } }}>
                  Apply
                </Button>
              </div>
            </div>
            {previewError&&(
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {previewError}
              </div>
            )}
            {selectedLabel&&(
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100">
                Selected: <span className="font-semibold">{selectedLabel}</span>
              </div>
            )}
          </div>

          <div className="p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="space-y-5">

              {/* Layer stack */}
              <div>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Layer Stack</div>
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  {(draftSlide.canvasOrder?.length?draftSlide.canvasOrder:DEFAULT_CANVAS_ORDER).map((layer)=>(
                    <div key={layer} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                      isZoneKey(selectedBlock)&&selectedBlock===layer
                        ?"border-blue-300 bg-blue-50/70 dark:border-cyan-500/30 dark:bg-cyan-500/10"
                        :"border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                    }`}>
                      <button type="button" onClick={()=>setSelectedBlock(layer)}
                        className="text-sm font-medium text-slate-700 dark:text-slate-100">
                        {labelForCanvasBlock(layer)||layer}
                      </button>
                      <div className="flex gap-2">
                        {(["backward","forward"] as const).map((dir)=>(
                          <button key={dir} type="button" onClick={()=>handleReorderBlock(layer,dir)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            {dir==="backward"?"Back":"Front"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {inspectorTab==="content" ? (
                <>
                  {/* Title */}
                  <div className={selectedBlock==="title"?"rounded-2xl border border-blue-200 bg-blue-50/70 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10":""}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Slide Title</div>
                    <Input value={draftSlide.title} onChange={(e)=>updateDraft({title:e.target.value})}
                      className="h-11 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"/>
                  </div>

                  {/* Bullets */}
                  <div className={selectedBlock?.startsWith("bullet-")?"rounded-2xl border border-blue-200 bg-blue-50/70 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10":""}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Body Bullets</div>
                    <div className="space-y-3">
                      {(draftSlide.bullets||[]).map((bullet,bi)=>(
                        <div key={bi} className={`rounded-xl border p-3 ${
                          selectedBlock===`bullet-${bi}`
                            ?"border-blue-300 bg-white shadow-sm dark:border-cyan-400/50 dark:bg-slate-900"
                            :"border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                        }`}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Bullet {bi+1}</span>
                            <button type="button" onClick={()=>handleRemoveBullet(bi)}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300">Remove</button>
                          </div>
                          <Textarea rows={3} value={bullet}
                            onChange={(e)=>{ const next=[...(draftSlide.bullets||[])]; next[bi]=e.target.value; updateDraft({bullets:next}); }}
                            className="resize-none border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"/>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddBullet}
                      disabled={slideAlreadyGenerated}
                      className="mt-3 h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <Plus className="mr-2 h-4 w-4"/>Add Bullet
                    </Button>
                  </div>

                  {/* Body */}
                  <div className={selectedBlock?.startsWith("body")?"rounded-2xl border border-blue-200 bg-blue-50/70 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10":""}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Body Copy</div>
                    <div className="space-y-3">
                      {(draftSlide.bodyBlocks||[draftSlide.body||""]).map((blk,bi)=>(
                        <div key={bi} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Body {bi+1}</span>
                            <button type="button"
                              onClick={()=>{
                                const next=(draftSlide.bodyBlocks||[draftSlide.body||""]).filter((_,i)=>i!==bi);
                                const nl={...(draftSlide.bodyBlockLayouts||{})}; delete nl[String(bi)];
                                Object.keys(nl).forEach((k)=>{ const n=Number(k); if(n>bi){nl[String(n-1)]=nl[k];delete nl[k];} });
                                updateDraft({bodyBlocks:next,body:next.join(" ").trim(),bodyBlockLayouts:nl});
                              }}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300">Remove</button>
                          </div>
                          <Textarea rows={3} value={blk}
                            onChange={(e)=>{
                              const next=[...(draftSlide.bodyBlocks||[draftSlide.body||""])];
                              next[bi]=e.target.value;
                              updateDraft({bodyBlocks:next,body:next.join(" ").trim()});
                            }}
                            className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"/>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline"
                      disabled={slideAlreadyGenerated}
                      onClick={()=>{
                        if (slideAlreadyGenerated) return;
                        const next=[...(draftSlide.bodyBlocks||[draftSlide.body||""])];
                        next.push(suggestNewBodyBlock(draftSlide, next.length));
                        updateDraft({bodyBlocks:next,body:next.join(" ").trim()});
                      }}
                      className="mt-3 h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <Plus className="mr-2 h-4 w-4"/>Add Body Text
                    </Button>
                  </div>

                  {/* Image prompts */}
                  <div className={selectedBlock?.startsWith("visual")?"rounded-2xl border border-blue-200 bg-blue-50/70 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10":""}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Image Prompts</div>
                    <div className="space-y-3">
                      {(visualItemsDraft.length>0?visualItemsDraft:[{id:newVisualId(),prompt:""}]).map((item,idx)=>(
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Image {idx+1}</span>
                            <button type="button"
                              onClick={()=>{
                                const next=visualItemsDraft.filter((v)=>v.id!==item.id);
                                const nl = buildNextVisualLayouts(draftSlide, next);
                                updateDraft({
                                  visualItems:next,
                                  visualItemLayouts:nl,
                                  imagePrompt:next.map((v)=>v.prompt).join("\n"),
                                  imageData: next.length === 0 ? "" : draftSlide.imageData,
                                });
                                if(selectedBlock===`visual-item-${item.id}`) setSelectedBlock(null);
                              }}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300">Remove</button>
                          </div>
                          <Textarea rows={2} value={item.prompt||""}
                            onChange={(e)=>{
                              const next=clearVisualItemImages(
                                visualItemsDraft.map((v)=>v.id===item.id?{...v,prompt:e.target.value,imageData:""}:v)
                              );
                              updateDraft({
                                visualItems:next,
                                imagePrompt:next.map((v)=>v.prompt).join("\n"),
                                imageData:"",
                              });
                            }}
                            className="resize-none border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"/>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddImageSlot}
                      disabled={slideAlreadyGenerated || visualItemsDraft.length >= MAX_IMAGE_SLOTS_PER_SLIDE}
                      className="mt-3 h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <Plus className="mr-2 h-4 w-4"/>Add Image Slot
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    {[
                      {label:"Font Family",key:"fontFamily",opts:[["inter","Sans"],["serif","Serif"],["mono","Mono"],["rounded","Rounded"],["display","Display"],["classic","Classic"]]},
                      {label:"Title Size", key:"titleSize", opts:[["sm","Small"],["md","Medium"],["lg","Large"]]},
                      {label:"Body Size",  key:"bodySize",  opts:[["sm","Small"],["md","Medium"],["lg","Large"]]},
                    ].map(({label,key,opts})=>(
                      <div key={key}>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</div>
                        <select value={(draftSlide as any)[key]||opts[1][0]}
                          onChange={(e)=>updateDraft({[key]:e.target.value} as any)}
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                          {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Text Style</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => toggleTextStyle("bold")}
                          disabled={selectedTextTargets.length === 0}
                          className={`h-10 rounded-lg ${selectedTextTargets.length > 0 && selectedTextTargets.every((key) => Boolean(draftSlide.textStyles?.[key]?.bold)) ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200" : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"}`}
                        >
                          <span className="font-bold">B</span>
                          <span className="ml-2">Bold</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => toggleTextStyle("italic")}
                          disabled={selectedTextTargets.length === 0}
                          className={`h-10 rounded-lg ${selectedTextTargets.length > 0 && selectedTextTargets.every((key) => Boolean(draftSlide.textStyles?.[key]?.italic)) ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200" : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"}`}
                        >
                          <span className="italic">I</span>
                          <span className="ml-2">Italic</span>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Background Color</div>
                      <div className="grid grid-cols-4 gap-2">
                        {BACKGROUND_COLOR_OPTIONS.map((color) => {
                          const active = (draftSlide.backgroundColor || "#FFFFFF").toUpperCase() === color.toUpperCase();
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => updateDraft({ backgroundColor: color })}
                              className={`h-10 rounded-xl border transition ${
                                active
                                  ? "border-blue-500 ring-2 ring-blue-200"
                                  : "border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500"
                              }`}
                              style={{ background: color }}
                              aria-label={`Use ${color} as slide background`}
                              title={color}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Text Align</div>
                      <select
                        value={selectedBlock ? (draftSlide.textAlignments?.[selectedBlock] || "left") : "left"}
                        onChange={(e)=>{
                          if(!selectedBlock) return;
                          updateDraft({
                            textAlignments: {
                              ...(draftSlide.textAlignments || {}),
                              [selectedBlock]: e.target.value as "left" | "center" | "right",
                            },
                          });
                        }}
                        disabled={!selectedBlock || selectedBlock.startsWith("visual")}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Notes</div>
                    <Textarea rows={4} value={draftSlide.notes||""}
                      onChange={(e)=>updateDraft({notes:e.target.value})}
                      className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"/>
                  </div>
                </>
              )}

              {/* Reset / Generate */}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline"
                  onClick={handleResetSlide}
                  className="flex-1 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <RotateCcw className="mr-2 h-4 w-4"/>Reset
                </Button>
                <Button type="button" onClick={handleGeneratePreview} disabled={generatingPreview || slideAlreadyGenerated}
                  className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  <Sparkles className="mr-2 h-4 w-4"/>
                  {generatingPreview ? "Generating…" : slideAlreadyGenerated ? "Generated" : "Generate Preview"}
                </Button>
              </div>

              <Button type="button" variant="ghost" onClick={handleDeleteSlide}
                disabled={deck.slides.length<=1}
                className="w-full justify-start rounded-xl px-0 text-rose-600 hover:bg-transparent hover:text-rose-700 dark:text-rose-300">
                <Trash2 className="mr-2 h-4 w-4"/>Delete Slide
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {slideshowOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b1020]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
            <div className="text-sm font-medium">
              Slide {slideshowIndex + 1} of {deck.slides.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSlideshowIndex((current) => Math.max(0, current - 1))}
                disabled={slideshowIndex === 0}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSlideshowIndex((current) => Math.min(deck.slides.length - 1, current + 1))}
                disabled={slideshowIndex >= deck.slides.length - 1}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSlideshowOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <SlideCanvas
              slide={normalizeSlide(deck.slides[slideshowIndex] || createBlankSlide(deck))}
              selectedBlock={null}
              snapEnabled={false}
              multiSelectedBlocks={[]}
              onMultiSelectBlocksChange={() => {}}
              readOnly
              onSelectBlock={() => {}}
              onLayoutChange={() => {}}
              onMoveGroup={() => {}}
              onMoveBlocks={() => {}}
              onReorderBlock={() => {}}
              onRemoveBlock={() => {}}
              onEditBlock={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
