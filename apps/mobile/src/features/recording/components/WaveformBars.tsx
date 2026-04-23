import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { colors } from "../../../theme/tokens";

interface Props {
  samples: number[];          // each in [0, 1]
  width: number;
  height: number;
  color?: string;
  minBarHeight?: number;
  gap?: number;
}

export function WaveformBars({
  samples,
  width,
  height,
  color = colors.text,
  minBarHeight = 4,
  gap = 3,
}: Props) {
  const n = samples.length;
  if (n === 0) return <View style={{ width, height }} />;

  const barWidth = Math.max(1, (width - gap * (n - 1)) / n);

  return (
    <Svg width={width} height={height}>
      {samples.map((raw, i) => {
        const amplitude = Math.max(minBarHeight, raw * height);
        const x = i * (barWidth + gap);
        const y = (height - amplitude) / 2;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={amplitude}
            rx={barWidth / 2}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </Svg>
  );
}
