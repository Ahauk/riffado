import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { colors, typography } from "../../../theme/tokens";
import { TuningQuality } from "../utils/noteMapping";

const W = 280;
const H = 160;
const CX = W / 2;
const CY = H - 24; // Pivot near the bottom — the needle swings on a half-disc above it.
const RADIUS = 110;
const NEEDLE_LEN = 100;

const TICKS = [-50, -25, 0, 25, 50];
const TICK_LABELS: Record<number, string> = {
  [-50]: "-50",
  [-25]: "-25",
  [0]: "0",
  [25]: "+25",
  [50]: "+50",
};

interface TunerNeedleProps {
  /** Cents from the target note (-50..+50). */
  cents: number;
  quality: TuningQuality;
  /** When false the needle dims to suggest the reading is stale or absent. */
  active: boolean;
}

function qualityColor(q: TuningQuality): string {
  switch (q) {
    case "in-tune":
      return colors.success;
    case "close":
      return "#E9B949"; // amber, same shade we use elsewhere for "revísalo"
    case "off":
    default:
      return colors.textMuted;
  }
}

/**
 * Map cents (-50..+50) to a needle angle in degrees. -50 → -60°, +50 → +60°
 * gives a comfortable half-disc sweep without the needle ever pointing
 * straight horizontal.
 */
function centsToAngle(cents: number): number {
  const clamped = Math.max(-50, Math.min(50, cents));
  return (clamped / 50) * 60;
}

function arcPath(): string {
  const startAngleDeg = -60;
  const endAngleDeg = 60;
  // SVG arc helpers: angle 0 points up (-Y), positive degrees swing clockwise.
  const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
  const endRad = ((endAngleDeg - 90) * Math.PI) / 180;
  const x1 = CX + RADIUS * Math.cos(startRad);
  const y1 = CY + RADIUS * Math.sin(startRad);
  const x2 = CX + RADIUS * Math.cos(endRad);
  const y2 = CY + RADIUS * Math.sin(endRad);
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2}`;
}

interface TickEnd {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
}

function tickEndpoints(centsValue: number): TickEnd {
  const angle = centsToAngle(centsValue) - 90;
  const rad = (angle * Math.PI) / 180;
  const isMajor = centsValue === 0;
  const inner = RADIUS - (isMajor ? 14 : 8);
  const outer = RADIUS;
  return {
    x1: CX + inner * Math.cos(rad),
    y1: CY + inner * Math.sin(rad),
    x2: CX + outer * Math.cos(rad),
    y2: CY + outer * Math.sin(rad),
    labelX: CX + (RADIUS + 14) * Math.cos(rad),
    labelY: CY + (RADIUS + 14) * Math.sin(rad),
  };
}

export function TunerNeedle({ cents, quality, active }: TunerNeedleProps) {
  const angle = useRef(new Animated.Value(centsToAngle(cents))).current;

  useEffect(() => {
    Animated.timing(angle, {
      toValue: centsToAngle(cents),
      duration: 90,
      useNativeDriver: true,
    }).start();
  }, [cents, angle]);

  const rotation = angle.interpolate({
    inputRange: [-60, 60],
    outputRange: ["-60deg", "60deg"],
  });

  const needleColor = active ? qualityColor(quality) : colors.border;

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        <Path d={arcPath()} stroke={colors.border} strokeWidth={2} fill="none" />

        {TICKS.map((c) => {
          const t = tickEndpoints(c);
          const isCenter = c === 0;
          return (
            <Line
              key={`tick-${c}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={isCenter ? colors.primary : colors.textMuted}
              strokeWidth={isCenter ? 2.5 : 1.5}
            />
          );
        })}

        <Circle cx={CX} cy={CY} r={6} fill={colors.primary} />
      </Svg>

      {/* Needle layer. We position a slim Animated.View whose top sits at
          (CX, CY - NEEDLE_LEN) and whose bottom sits at the pivot, then
          rotate it. RN rotates around the View's centre by default, so we
          translate the rotation origin down to the pivot with the
          translateY-rotate-translateY sandwich. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.needleAnchor,
          {
            transform: [
              { translateY: NEEDLE_LEN / 2 },
              { rotate: rotation },
              { translateY: -NEEDLE_LEN / 2 },
            ],
          },
        ]}
      >
        <View style={[styles.needle, { backgroundColor: needleColor }]} />
      </Animated.View>

      {/* Tick labels — drawn in RN Text instead of SvgText so we don't have to
          deal with anchor / baseline quirks across platforms. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {TICKS.map((c) => {
          const t = tickEndpoints(c);
          return (
            <Text
              key={`label-${c}`}
              style={[
                styles.tickLabel,
                {
                  left: t.labelX - 18,
                  top: t.labelY - 8,
                  color: c === 0 ? colors.primary : colors.textMuted,
                  fontWeight: c === 0 ? "700" : "500",
                },
              ]}
            >
              {TICK_LABELS[c]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const NEEDLE_W = 3;

const styles = StyleSheet.create({
  wrap: {
    width: W,
    height: H,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  needleAnchor: {
    position: "absolute",
    // Place the bottom of this rectangle at (CX, CY).
    left: CX - NEEDLE_W / 2,
    top: CY - NEEDLE_LEN,
    width: NEEDLE_W,
    height: NEEDLE_LEN,
  },
  needle: {
    width: NEEDLE_W,
    height: NEEDLE_LEN,
    borderRadius: NEEDLE_W / 2,
  },
  tickLabel: {
    position: "absolute",
    width: 36,
    textAlign: "center",
    ...typography.caption,
    fontSize: 11,
  },
});
