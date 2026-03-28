"use client";

import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";

type Racer = {
  cell: string;
  idx: number;
  progress: number;
};

type Props = {
  stageWidth: number;
  stageHeight: number;
  racers: Racer[];
  selectedValue: string;
  disabled?: boolean;
  onPick: (cell: string) => void;
};

export default function StudentBingoStage({
  stageWidth,
  stageHeight,
  racers,
  selectedValue,
  disabled,
  onPick,
}: Props) {
  const laneCount = Math.max(racers.length, 1);
  const horizontalPadding = 18;
  const verticalPadding = 18;
  const laneGap = 10;
  const laneHeight =
    (stageHeight - verticalPadding * 2 - laneGap * (laneCount - 1)) / laneCount;
  const trackWidth = stageWidth - horizontalPadding * 2 - 72;
  const labelWidth = 70;

  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      className="overflow-hidden rounded-[22px]"
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={stageWidth}
          height={stageHeight}
          cornerRadius={24}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: stageWidth, y: stageHeight }}
          fillLinearGradientColorStops={[0, "#052e16", 0.5, "#064e3b", 1, "#022c22"]}
        />

        <Rect
          x={stageWidth - horizontalPadding - 14}
          y={verticalPadding}
          width={6}
          height={stageHeight - verticalPadding * 2}
          cornerRadius={999}
          fill="#f8fafc"
        />

        {racers.map((racer, index) => {
          const y = verticalPadding + index * (laneHeight + laneGap);
          const selected = selectedValue === racer.cell;
          const carX =
            horizontalPadding +
            8 +
            ((trackWidth - 30) * Math.min(100, Math.max(0, selected ? 100 : racer.progress))) /
              100;
          return (
            <Group
              key={`${racer.idx}-${racer.cell}`}
              x={0}
              y={0}
              onClick={() => !disabled && onPick(racer.cell)}
              onTap={() => !disabled && onPick(racer.cell)}
            >
              <Rect
                x={horizontalPadding}
                y={y}
                width={labelWidth}
                height={laneHeight}
                cornerRadius={16}
                fill={selected ? "#dcfce7" : "#ecfeff"}
                stroke={selected ? "#22c55e" : "#a7f3d0"}
                strokeWidth={1.5}
              />
              <Text
                x={horizontalPadding + 8}
                y={y + laneHeight * 0.28}
                width={labelWidth - 16}
                text={`Lane ${index + 1}`}
                align="center"
                fontSize={Math.max(11, laneHeight * 0.24)}
                fontStyle="bold"
                fill="#14532d"
              />

              <Rect
                x={horizontalPadding + labelWidth + 10}
                y={y}
                width={trackWidth}
                height={laneHeight}
                cornerRadius={18}
                fill={selected ? "#ecfccb" : "#d1fae5"}
                stroke={selected ? "#22c55e" : "#6ee7b7"}
                strokeWidth={1.4}
              />

              {Array.from({ length: 6 }).map((_, markIdx) => {
                const markX =
                  horizontalPadding + labelWidth + 18 + (trackWidth - 32) * (markIdx / 5);
                return (
                  <Line
                    key={`mark-${index}-${markIdx}`}
                    points={[markX, y + 8, markX, y + laneHeight - 8]}
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={2}
                    dash={[5, 6]}
                  />
                );
              })}

              <Group x={carX} y={y + laneHeight / 2 - 12}>
                <Rect
                  x={0}
                  y={0}
                  width={28}
                  height={24}
                  cornerRadius={10}
                  fill={selected ? "#16a34a" : "#0f766e"}
                  stroke={selected ? "#dcfce7" : "#ccfbf1"}
                  strokeWidth={1.5}
                  shadowColor="#022c22"
                  shadowBlur={8}
                  shadowOpacity={0.28}
                />
                <Circle x={7} y={24} radius={4} fill="#0f172a" />
                <Circle x={21} y={24} radius={4} fill="#0f172a" />
              </Group>

              <Text
                x={horizontalPadding + labelWidth + 24}
                y={y + laneHeight * 0.25}
                width={trackWidth - 70}
                text={racer.cell}
                fontSize={Math.max(12, laneHeight * 0.27)}
                fontStyle={selected ? "bold" : "normal"}
                fill="#064e3b"
                ellipsis
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
