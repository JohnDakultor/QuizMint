"use client";

import { Group, Layer, Rect, Stage, Text } from "react-konva";

type Point = { x: number; y: number };

type Props = {
  board: number[];
  boardSize: number;
  stageSize: number;
  questionId: number;
  cellSize: number;
  tileLetters: string[];
  disabled?: boolean;
  solved: boolean;
  dragThreshold: number;
  blankIndex: number;
  canMove: (idx: number) => boolean;
  getTilePosition: (idx: number) => Point;
  getDirectionToBlank: (idx: number) => "up" | "down" | "left" | "right" | null;
  moveTile: (idx: number) => void;
  isDragTowardBlank: (
    movement: Point,
    expected: "up" | "down" | "left" | "right" | null,
    threshold: number
  ) => boolean;
};

export default function StudentPuzzleStage({
  board,
  boardSize,
  stageSize,
  questionId,
  cellSize,
  tileLetters,
  disabled,
  solved,
  dragThreshold,
  blankIndex,
  canMove,
  getTilePosition,
  getDirectionToBlank,
  moveTile,
  isDragTowardBlank,
}: Props) {
  const slotStrokeWidth = boardSize >= 5 ? 1.2 : 1.5;
  const blankStrokeWidth = boardSize >= 5 ? 1.8 : 2;
  const tileStrokeWidth = boardSize >= 5 ? 1.2 : 1.6;
  const tileCornerRadius = boardSize >= 5 ? 12 : 16;
  const tileShadowBlur = boardSize >= 5 ? 8 : 12;

  return (
    <Stage
      width={stageSize}
      height={stageSize}
      className="overflow-hidden rounded-[22px]"
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={stageSize}
          height={stageSize}
          cornerRadius={24}
          fill="#09090b"
        />
        <Rect
          x={8}
          y={8}
          width={stageSize - 16}
          height={stageSize - 16}
          cornerRadius={20}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: stageSize, y: stageSize }}
          fillLinearGradientColorStops={[0, "#18181b", 0.5, "#0f172a", 1, "#1e293b"]}
          shadowColor="#f59e0b"
          shadowBlur={18}
          shadowOpacity={0.12}
        />

        {Array.from({ length: boardSize * boardSize }).map((_, i) => {
          const { x, y } = getTilePosition(i);
          return (
            <Rect
              key={`${questionId}-slot-${i}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              cornerRadius={tileCornerRadius}
              fill={i === blankIndex ? "#111827" : "#1f2937"}
              stroke={i === blankIndex ? "#f59e0b" : "#334155"}
              strokeWidth={i === blankIndex ? blankStrokeWidth : slotStrokeWidth}
              opacity={i === blankIndex ? 0.95 : 0.7}
            />
          );
        })}

        {board.map((tile, idx) => {
          if (tile === 0) return null;
          const movable = canMove(idx);
          const { x, y } = getTilePosition(idx);
          const expectedDirection = getDirectionToBlank(idx);
          return (
            <Group
              key={`${questionId}-tile-${tile}`}
              x={x}
              y={y}
              draggable={Boolean(movable && !disabled && !solved)}
              onClick={() => moveTile(idx)}
              onTap={() => moveTile(idx)}
              onDragEnd={(e) => {
                const movement = {
                  x: e.target.x() - x,
                  y: e.target.y() - y,
                };
                e.target.position({ x, y });
                if (isDragTowardBlank(movement, expectedDirection, dragThreshold)) {
                  moveTile(idx);
                }
              }}
              onMouseEnter={(e) => {
                if (movable && !disabled && !solved) {
                  const stage = e.target.getStage();
                  if (stage?.container()) stage.container().style.cursor = "grab";
                }
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage?.container()) stage.container().style.cursor = "default";
              }}
            >
                <Rect
                  width={cellSize}
                  height={cellSize}
                  cornerRadius={tileCornerRadius}
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={{ x: cellSize, y: cellSize }}
                fillLinearGradientColorStops={
                  movable
                    ? [0, "#fde68a", 0.45, "#f59e0b", 1, "#ea580c"]
                    : [0, "#e2e8f0", 0.55, "#cbd5e1", 1, "#94a3b8"]
                }
                stroke={movable ? "#fef3c7" : "#e2e8f0"}
                  strokeWidth={tileStrokeWidth}
                  shadowColor={movable ? "#f59e0b" : "#475569"}
                  shadowBlur={movable ? tileShadowBlur : Math.max(6, tileShadowBlur - 2)}
                  shadowOpacity={movable ? 0.4 : 0.22}
                />
              <Text
                x={0}
                y={cellSize * 0.23}
                width={cellSize}
                align="center"
                text={tileLetters[tile - 1] || String(tile)}
                fontSize={Math.max(24, cellSize * 0.38)}
                fontFamily="Arial"
                fontStyle="bold"
                fill={movable ? "#431407" : "#334155"}
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
