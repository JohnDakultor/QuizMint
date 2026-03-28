"use client";

import { useRef, useState } from "react";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

type TimelineCard = {
  id: string;
  label: string;
  value: string;
};

type Props = {
  stageWidth: number;
  stageHeight: number;
  cards: TimelineCard[];
  disabled?: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
};

export default function StudentSudokuStage({
  stageWidth,
  stageHeight,
  cards,
  disabled,
  onMove,
}: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const padding = 24;
  const gap = 16;
  const cardCount = Math.max(cards.length, 1);
  const stageInnerWidth = stageWidth - padding * 2;
  const cardWidth = Math.max(
    104,
    Math.floor((stageInnerWidth - gap * Math.max(cardCount - 1, 0)) / cardCount)
  );
  const trackHeight = Math.max(160, Math.floor(stageHeight * 0.66));
  const cardHeight = Math.max(150, Math.floor(trackHeight * 0.68));
  const rowY = 78;
  const slotXs = cards.map((_, idx) => padding + idx * (cardWidth + gap));
  const cardFontSize = Math.max(13, Math.min(19, cardWidth * 0.1));

  const nearestSlotIndex = (x: number) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    slotXs.forEach((slotX, idx) => {
      const slotCenter = slotX + cardWidth / 2;
      const distance = Math.abs(x - slotCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = idx;
      }
    });
    return bestIndex;
  };

  return (
    <Stage width={stageWidth} height={stageHeight} className="overflow-hidden rounded-[22px]">
      <Layer>
        <Rect
          x={0}
          y={0}
          width={stageWidth}
          height={stageHeight}
          cornerRadius={24}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: stageWidth, y: stageHeight }}
          fillLinearGradientColorStops={[0, "#312e81", 0.55, "#4338ca", 1, "#1e1b4b"]}
        />

        <Text
          x={0}
          y={16}
          width={stageWidth}
          align="center"
          text="Arrange the events in chronological order"
          fontSize={18}
          fontStyle="bold"
          fill="#e0e7ff"
        />

        {slotXs.map((slotX, idx) => (
          <Rect
            key={`slot-${idx}`}
            x={slotX}
            y={rowY}
            width={cardWidth}
            height={cardHeight}
            cornerRadius={18}
            fill={hoverIndex === idx ? "#c4b5fd" : "#ddd6fe"}
            opacity={hoverIndex === idx ? 0.28 : 0.12}
            stroke={hoverIndex === idx ? "#f8fafc" : "#c7d2fe"}
            strokeWidth={hoverIndex === idx ? 1.8 : 1.2}
            dash={[8, 6]}
          />
        ))}

        {cards.map((card, idx) => {
          const x = slotXs[idx];
          return (
            <Group
              key={card.id}
              x={x}
              y={rowY}
              draggable={!disabled}
              dragBoundFunc={(pos) => ({
                x: Math.max(padding, Math.min(stageWidth - padding - cardWidth, pos.x)),
                y: rowY,
              })}
              onDragStart={(e) => {
                e.target.moveToTop();
                setHoverIndex(idx);
                hoverIndexRef.current = idx;
              }}
              onDragMove={(e) => {
                const centerX = e.target.x() + cardWidth / 2;
                const nextIndex = nearestSlotIndex(centerX);
                if (hoverIndexRef.current !== nextIndex) {
                  hoverIndexRef.current = nextIndex;
                  setHoverIndex(nextIndex);
                }
              }}
              onDragEnd={(e) => {
                const centerX = e.target.x() + cardWidth / 2;
                const targetIndex = nearestSlotIndex(centerX);
                hoverIndexRef.current = null;
                setHoverIndex(null);
                e.target.position({ x, y: rowY });
                if (!disabled && targetIndex !== idx) {
                  onMove(idx, targetIndex);
                }
              }}
              onDragCancel={() => {
                hoverIndexRef.current = null;
                setHoverIndex(null);
              }}
            >
              <Rect
                width={cardWidth}
                height={cardHeight}
                cornerRadius={18}
                fill="#eef2ff"
                stroke="#c7d2fe"
                strokeWidth={1.5}
                shadowColor="#1e1b4b"
                shadowBlur={8}
                shadowOpacity={0.2}
              />
              <Text
                x={16}
                y={16}
                width={cardWidth - 32}
                height={cardHeight - 32}
                text={card.label}
                align="center"
                verticalAlign="middle"
                wrap="word"
                fontSize={cardFontSize}
                lineHeight={1.2}
                fontStyle="bold"
                fill="#312e81"
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
