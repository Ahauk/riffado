import { Circle, Defs, FeGaussianBlur, Filter, G, Path, Svg } from "react-native-svg";

interface Props {
  /** Visual height in points. Width derives from the 84:110 viewBox. */
  height: number;
  /** Fill color of the clef body and dots. */
  color: string;
  /**
   * Optional Gaussian-blur radius (SVG units). Use to mimic the textShadow
   * neon layers when stacking multiple instances on top of each other.
   * 0 (or undefined) means no blur (sharp edges).
   */
  blur?: number;
  /** Override the inferred width if the caller wants a non-natural ratio. */
  width?: number;
}

/**
 * Stylized F-clef. Drawn as vector paths so it renders identically at any
 * size — from inline-with-Bebas in the wordmark (~38pt) to a 1024px app icon.
 *
 * The artwork is intentionally simplified rather than a literal SMuFL glyph:
 * a comma-shaped head with an inner cutout (achieved via fillRule="evenodd"),
 * a tail that hooks back, and the two dots flanking the F-line on the right.
 */
const VIEW_W = 84;
const VIEW_H = 110;

export function FClefSvg({ height, color, blur = 0, width }: Props) {
  const w = width ?? (height * VIEW_W) / VIEW_H;
  const filterId = blur > 0 ? `clef-blur-${Math.round(blur * 10)}` : undefined;

  const body = (
    <>
      <Path
        d="M 44 6
           C 22 6 6 22 6 46
           C 6 64 16 78 32 86
           L 32 100
           Q 32 106 26 106
           L 24 106
           L 28 110
           L 36 110
           Q 44 110 44 102
           L 44 88
           C 64 86 78 70 78 48
           C 78 24 64 6 44 6 Z
           M 44 20
           C 58 20 68 32 68 48
           C 68 64 58 76 46 76
           Q 38 76 38 68
           L 38 60
           Q 48 60 48 50
           Q 48 40 38 40
           Q 26 40 26 54
           Q 26 70 42 76
           C 56 80 70 70 70 52
           C 70 34 60 20 44 20 Z"
        fill={color}
        fillRule="evenodd"
      />
      <Circle cx="80" cy="34" r="5" fill={color} />
      <Circle cx="80" cy="56" r="5" fill={color} />
    </>
  );

  return (
    <Svg width={w} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {filterId ? (
        <>
          <Defs>
            <Filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation={blur} />
            </Filter>
          </Defs>
          <G filter={`url(#${filterId})`}>{body}</G>
        </>
      ) : (
        body
      )}
    </Svg>
  );
}
