import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";

import { colors } from "../../../theme/tokens";
import { ChordShape } from "../data/chordShapes";

type Variant = "mini" | "detail";

interface Props {
  shape: ChordShape;
  variant?: Variant;
  /** Override size; defaults depend on variant. */
  size?: { width: number; height: number };
  color?: string;
}

const FRETS_SHOWN = 4;

export function ChordDiagramSvg({
  shape,
  variant = "mini",
  size,
  color = colors.text,
}: Props) {
  const isDetail = variant === "detail";
  const w = size?.width ?? (isDetail ? 180 : 34);
  const h = size?.height ?? (isDetail ? 230 : 44);

  const padX = isDetail ? 18 : 3;
  const padTop = isDetail ? 34 : 6;
  const padBot = isDetail ? 28 : 4;

  const gridLeft = padX;
  const gridRight = w - padX;
  const gridTop = padTop;
  const gridBottom = h - padBot;
  const stringGap = (gridRight - gridLeft) / 5;
  const fretGap = (gridBottom - gridTop) / FRETS_SHOWN;

  const stringX = (idx: number) => gridLeft + stringGap * idx;
  const fretY = (fret: number) => gridTop + fretGap * fret;

  const dotR = isDetail ? 9 : 3.2;
  const nutThickness = isDetail ? 5 : 2.2;
  const lineThickness = isDetail ? 1.5 : 0.8;

  const showMarkers = isDetail;
  const showFingerNumbers = isDetail;

  const nutAtTop = shape.base_fret === 1;

  return (
    <Svg width={w} height={h}>
      {/* Nut (only at open position) */}
      {nutAtTop && (
        <Rect
          x={gridLeft - lineThickness / 2}
          y={gridTop - nutThickness}
          width={gridRight - gridLeft + lineThickness}
          height={nutThickness}
          fill={color}
        />
      )}

      {/* Fret number (when not at open position, e.g. "3fr") */}
      {isDetail && !nutAtTop && (
        <SvgText
          x={gridLeft - 6}
          y={gridTop + 6}
          fontSize={12}
          fill={color}
          textAnchor="end"
        >
          {shape.base_fret}fr
        </SvgText>
      )}

      {/* Fret lines */}
      {Array.from({ length: FRETS_SHOWN + 1 }).map((_, i) => (
        <Line
          key={`fret-${i}`}
          x1={gridLeft}
          y1={fretY(i)}
          x2={gridRight}
          y2={fretY(i)}
          stroke={color}
          strokeWidth={i === 0 && nutAtTop ? 0 : lineThickness}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Line
          key={`str-${i}`}
          x1={stringX(i)}
          y1={gridTop}
          x2={stringX(i)}
          y2={gridBottom}
          stroke={color}
          strokeWidth={lineThickness}
        />
      ))}

      {/* Barre */}
      {shape.barre && (() => {
        const relFret = shape.barre.fret - shape.base_fret + 1;
        if (relFret < 1 || relFret > FRETS_SHOWN) return null;
        // from_string and to_string are in guitar numbering (6 low - 1 high).
        const fromIdx = 6 - shape.barre.from_string; // convert to 0..5 low→high
        const toIdx = 6 - shape.barre.to_string;
        const x1 = stringX(fromIdx);
        const x2 = stringX(toIdx);
        const y = fretY(relFret - 0.5);
        return (
          <G key="barre">
            <Line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={color}
              strokeWidth={dotR * 2}
              strokeLinecap="round"
            />
          </G>
        );
      })()}

      {/* Dots + open/muted markers */}
      {shape.frets.map((fret, i) => {
        const x = stringX(i);
        if (fret < 0) {
          return showMarkers ? (
            <SvgText
              key={`mute-${i}`}
              x={x}
              y={gridTop - 10}
              fontSize={14}
              fill={color}
              textAnchor="middle"
            >
              ×
            </SvgText>
          ) : null;
        }
        if (fret === 0) {
          return showMarkers ? (
            <Circle
              key={`open-${i}`}
              cx={x}
              cy={gridTop - 10}
              r={5}
              stroke={color}
              strokeWidth={1.5}
              fill="none"
            />
          ) : null;
        }
        const relFret = fret - shape.base_fret + 1;
        if (relFret < 1 || relFret > FRETS_SHOWN) return null;
        const y = fretY(relFret - 0.5);
        const fingerNum = shape.fingers[i];
        return (
          <G key={`dot-${i}`}>
            <Circle cx={x} cy={y} r={dotR} fill={color} />
            {showFingerNumbers && fingerNum > 0 && (
              <SvgText
                x={x}
                y={y + 4}
                fontSize={11}
                fontWeight="600"
                fill={colors.bg}
                textAnchor="middle"
              >
                {fingerNum}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}
