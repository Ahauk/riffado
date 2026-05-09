import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { BRAND_FONT, colors } from "../../theme/tokens";
import { FClefSvg } from "./FClefSvg";

interface Props {
  /** Font size for the alphabetic letters (RI / FADO). Clef scales with this. */
  size: number;
  /** Color of the alphabetic letters. */
  letterColor?: string;
  /** Color of the F-clef body and dots. Defaults to letterColor. */
  clefColor?: string;
  /**
   * Letter spacing applied to RI and FADO. Matches the `letterSpacing: 2` of
   * the existing wordmark by default.
   */
  letterSpacing?: number;
  /**
   * Extra style for the alphabetic letters. Use this to drive textShadow on
   * the neon stack in HomeScreen — each layer passes a different shadow.
   */
  letterStyle?: TextStyle;
  /**
   * Optional Gaussian blur for the clef SVG, in viewBox units. Pair with the
   * letterStyle textShadow to keep the clef visually in sync with the neon
   * letters across each glow layer (e.g. blur=1 for the inner glow,
   * blur=4-8 for outer blooms).
   */
  clefBlur?: number;
  /** Container style passthrough. */
  style?: ViewStyle | ViewStyle[];
}

/**
 * "RI𝄢FADO" — the brand wordmark with the F-clef substituting the first F.
 * Composed of three children in a row: the RI text, the FClefSvg, and the
 * FADO text. Each piece can be tinted independently so the multi-layer neon
 * effect on the home screen still works (every layer renders its own
 * Wordmark with matching color/shadow/blur).
 */
export function Wordmark({
  size,
  letterColor = colors.text,
  clefColor,
  letterSpacing = 2,
  letterStyle,
  clefBlur,
  style,
}: Props) {
  // The clef visually reads taller than the cap height of Bebas Neue. ~1.15x
  // keeps it slightly above the baseline and slightly below it, mirroring how
  // typeset F-clefs flank the staff lines.
  const clefHeight = size * 1.15;
  const clefFill = clefColor ?? letterColor;

  const lettersBase: TextStyle = {
    fontFamily: BRAND_FONT,
    fontSize: size,
    color: letterColor,
    letterSpacing,
    // Without an explicit lineHeight, Bebas Neue centers awkwardly against
    // SVG; pinning it makes the row align cleanly.
    lineHeight: size,
    includeFontPadding: false,
  };

  return (
    <View style={[styles.row, style]}>
      <Text style={[lettersBase, letterStyle]}>RI</Text>
      <View style={styles.clefWrap}>
        <FClefSvg height={clefHeight} color={clefFill} blur={clefBlur} />
      </View>
      <Text style={[lettersBase, letterStyle]}>FADO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  clefWrap: {
    // A tiny breathing space on either side of the clef, mirroring the
    // letter spacing of the surrounding text.
    paddingHorizontal: 2,
  },
});
