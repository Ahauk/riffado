import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Ellipse, G, Line, Text as SvgText } from "react-native-svg";

import { colors } from "../../../theme/tokens";

const AnimatedG = Animated.createAnimatedComponent(G);

const STAFF_W = 240;
const STAFF_H = 80;
const PAD_X = 10;
const PAD_TOP = 18;
const PAD_BOTTOM = 18;

const NUM_LINES = 5;
const LINE_GAP = (STAFF_H - PAD_TOP - PAD_BOTTOM) / (NUM_LINES - 1);

/** Clef glyph anchor — sits to the left of the staff and overlaps it vertically. */
const CLEF_X = PAD_X + 4;
const CLEF_Y = PAD_TOP + LINE_GAP * 4 + 4; // baseline near the bottom line

/**
 * Notes start travelling at this X (just to the right of the staff) and end at
 * the right edge of the clef, fading in then out as they cross the staff.
 */
const TRAVEL_END = PAD_X + 24;
const TRAVEL_START = STAFF_W - PAD_X;

interface NoteSpec {
  // Vertical position expressed as line index (0 = top line, 4 = bottom line, 0.5 = first space, etc.).
  pos: number;
  // Stagger delay in ms so notes appear in sequence rather than all at once.
  delay: number;
}

const NOTES: NoteSpec[] = [
  { pos: 2.5, delay: 0 },
  { pos: 1.5, delay: 700 },
  { pos: 3, delay: 1400 },
  { pos: 0.5, delay: 2100 },
  { pos: 2, delay: 2800 },
];

const TRAVEL_MS = 4200;
const FADE_MS = 380;

/**
 * Decorative animated musical staff used during analysis. Five horizontal
 * lines plus a treble clef; ellipse note-heads drift right→left across the
 * staff in a continuous loop, suggesting the app is "reading" the song.
 *
 * Notes use the JS-driven Animated path because react-native-svg cannot
 * animate primitive props like `cx` on the native driver. With only 5 notes
 * at ~60fps this is cheap.
 */
export function MusicalStaffAnimation() {
  const anims = useRef(
    NOTES.map(() => ({
      x: new Animated.Value(TRAVEL_START),
      opacity: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    const loops = anims.map((a, i) => {
      const note = NOTES[i];
      const runOnce = () => {
        a.x.setValue(TRAVEL_START);
        a.opacity.setValue(0);
        return Animated.parallel([
          Animated.timing(a.x, {
            toValue: TRAVEL_END,
            duration: TRAVEL_MS,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: FADE_MS,
              useNativeDriver: false,
            }),
            Animated.delay(TRAVEL_MS - FADE_MS * 2),
            Animated.timing(a.opacity, {
              toValue: 0,
              duration: FADE_MS,
              useNativeDriver: false,
            }),
          ]),
        ]);
      };

      let stopped = false;
      const loop = () => {
        if (stopped) return;
        runOnce().start(({ finished }) => {
          if (finished && !stopped) loop();
        });
      };
      const startTimer = setTimeout(loop, note.delay);
      return () => {
        stopped = true;
        clearTimeout(startTimer);
        a.x.stopAnimation();
        a.opacity.stopAnimation();
      };
    });
    return () => loops.forEach((stop) => stop());
  }, [anims]);

  // Y for each note based on its `pos` (0 top line .. 4 bottom line).
  const noteYs = useMemo(
    () => NOTES.map((n) => PAD_TOP + n.pos * LINE_GAP),
    [],
  );

  return (
    <View accessibilityLabel="Animación musical" pointerEvents="none">
      <Svg width={STAFF_W} height={STAFF_H}>
        {/* Five horizontal lines of the staff. */}
        {Array.from({ length: NUM_LINES }).map((_, i) => (
          <Line
            key={`l-${i}`}
            x1={PAD_X}
            y1={PAD_TOP + i * LINE_GAP}
            x2={STAFF_W - PAD_X}
            y2={PAD_TOP + i * LINE_GAP}
            stroke={colors.text}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        ))}

        {/* Treble clef. Unicode glyph is the simplest path-free option;
            the system font usually renders 𝄞 cleanly at this size. */}
        <SvgText
          x={CLEF_X}
          y={CLEF_Y}
          fill={colors.primary}
          fontSize={64}
          fontWeight="400"
        >
          𝄞
        </SvgText>

        {/* Animated note-heads. Each one lives inside an AnimatedG that
            slides leftward via translateX, while the ellipse itself is
            rotated about its own centre to get the classic tilted note
            shape. Rotating around a fixed pivot (the previous approach)
            warped the path so notes drifted diagonally below the staff. */}
        {NOTES.map((_, i) => (
          <AnimatedG
            // eslint-disable-next-line react/no-array-index-key
            key={`n-${i}`}
            translateX={anims[i].x}
            opacity={anims[i].opacity}
          >
            <Ellipse
              cx={0}
              cy={noteYs[i]}
              rx={6}
              ry={4.5}
              fill={colors.primary}
              transform={`rotate(-22 0 ${noteYs[i]})`}
            />
          </AnimatedG>
        ))}
      </Svg>
    </View>
  );
}
