import { useMemo } from "react";
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from "react-native-svg";

import { Notation } from "../../settings/storage";
import { colors } from "../../../theme/tokens";
import { toLatinRoot } from "../../../utils/notation";

/**
 * 12 chromatic pitch classes, sharps only — index = semitones from C.
 */
const PITCH_CLASSES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

/**
 * Notes laid out around the wheel in circle-of-fifths order, starting at C
 * at the top and going clockwise. The user sees the classic chord-theory
 * layout: relative-major/minor pairs are diametrically opposite, etc.
 */
const CIRCLE_OF_FIFTHS = [
  "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F",
] as const;

const PC_TO_FIFTHS_INDEX: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  CIRCLE_OF_FIFTHS.forEach((n, i) => {
    m[n] = i;
  });
  return m;
})();

function rootToChromatic(root: string): number {
  const idx = PITCH_CLASSES.indexOf(root as (typeof PITCH_CLASSES)[number]);
  return idx >= 0 ? idx : 0;
}

function chordPitchClasses(rootChromatic: number, intervals: number[]): number[] {
  return intervals.map((i) => (rootChromatic + i) % 12);
}

interface Props {
  /** English root letter, e.g. "C", "F#". */
  root: string;
  /** Semitone offsets from the root that make up the chord. */
  intervals: number[];
  notation: Notation;
  size?: number;
}

export function CircleOfFifthsSvg({ root, intervals, notation, size = 300 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  /** Radius from center to each note's center. */
  const R = size * 0.4;
  const noteRadius = size * 0.07;

  const chordPCs = useMemo(() => {
    const rootPc = rootToChromatic(root);
    return new Set(chordPitchClasses(rootPc, intervals));
  }, [root, intervals]);

  /** Position of a note (by chromatic pitch-class index) in SVG coords. */
  const positionOf = (pcName: string) => {
    const fifthsIdx = PC_TO_FIFTHS_INDEX[pcName] ?? 0;
    // -90° starts at top; going clockwise = positive angle in SVG.
    const angleDeg = -90 + fifthsIdx * 30;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + R * Math.cos(angleRad),
      y: cy + R * Math.sin(angleRad),
    };
  };

  /** Polygon points for the chord — connect every active pitch class. */
  const polygonPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    // Iterate in fifths order so the polygon doesn't cross itself unnecessarily.
    for (const pcName of CIRCLE_OF_FIFTHS) {
      const pc = PITCH_CLASSES.indexOf(pcName as (typeof PITCH_CLASSES)[number]);
      if (chordPCs.has(pc)) {
        pts.push(positionOf(pcName));
      }
    }
    return pts.map((p) => `${p.x},${p.y}`).join(" ");
  }, [chordPCs, cx, cy, R]);

  return (
    <Svg width={size} height={size}>
      {/* Outer guide ring */}
      <Circle
        cx={cx}
        cy={cy}
        r={R}
        stroke={colors.border}
        strokeWidth={1}
        fill="none"
      />

      {/* Spokes — subtle 12-spoke skeleton */}
      {CIRCLE_OF_FIFTHS.map((pc, i) => {
        const angleDeg = -90 + i * 30;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x2 = cx + R * Math.cos(angleRad);
        const y2 = cy + R * Math.sin(angleRad);
        return (
          <Line
            key={`spoke-${pc}`}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke={colors.border}
            strokeWidth={0.5}
            opacity={0.35}
          />
        );
      })}

      {/* Chord polygon — purple lines connecting the active notes */}
      {chordPCs.size >= 2 && (
        <Polygon
          points={polygonPoints}
          stroke={colors.primary}
          strokeWidth={2}
          fill={colors.primary}
          fillOpacity={0.18}
        />
      )}

      {/* Note circles + labels */}
      {CIRCLE_OF_FIFTHS.map((pcName) => {
        const { x, y } = positionOf(pcName);
        const pc = PITCH_CLASSES.indexOf(pcName as (typeof PITCH_CLASSES)[number]);
        const active = chordPCs.has(pc);
        const isRoot = pcName === root;
        const fill = active
          ? isRoot
            ? colors.primary
            : colors.primarySoft
          : colors.surface;
        const stroke = active ? colors.primary : colors.border;
        const textColor = active ? colors.text : colors.textMuted;
        const label = notation === "latin" ? toLatinRoot(pcName) : pcName;

        return (
          <G key={pcName}>
            <Circle
              cx={x}
              cy={y}
              r={noteRadius}
              fill={fill}
              stroke={stroke}
              strokeWidth={active ? 2 : 1}
            />
            <SvgText
              x={x}
              y={y + 4}
              fontSize={pcName.length > 1 ? 12 : 14}
              fontWeight={active ? "700" : "600"}
              fill={textColor}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
