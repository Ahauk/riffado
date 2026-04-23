export const colors = {
  bg: "#0B0B12",
  surface: "#14141F",
  surfaceAlt: "#1C1C2B",
  primary: "#7B4CFF",
  primaryMuted: "#4E2FC2",
  primarySoft: "#B39CFF",              // light lavender for text on tint
  primaryTint: "rgba(123, 76, 255, 0.18)", // translucent pill bg
  primaryTintBorder: "rgba(123, 76, 255, 0.35)",
  text: "#F4F4F7",
  textMuted: "#9A9AAA",
  border: "#262636",
  danger: "#FF5D6C",
  success: "#4CD380",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: "700" as const },
  h2: { fontSize: 24, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};

/** Display font for brand / CTA / hero titles. Loaded in App.tsx. */
export const BRAND_FONT = "BebasNeue_400Regular";
