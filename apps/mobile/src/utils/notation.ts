import { Notation } from "../features/settings/storage";

const ROOT_TO_LATIN: Record<string, string> = {
  C: "Do",
  "C#": "Do#",
  Db: "Re♭",
  D: "Re",
  "D#": "Re#",
  Eb: "Mi♭",
  E: "Mi",
  F: "Fa",
  "F#": "Fa#",
  Gb: "Sol♭",
  G: "Sol",
  "G#": "Sol#",
  Ab: "La♭",
  A: "La",
  "A#": "La#",
  Bb: "Si♭",
  B: "Si",
};

const ROOT_RE = /^([A-G][#b]?)(.*)$/;

export function toLatinRoot(root: string): string {
  return ROOT_TO_LATIN[root] ?? root;
}

/** Convert a chord name like "Cm7" / "G#maj7" to its Latin root variant ("Dom7", "Sol#maj7"). */
export function toLatinChord(name: string): string {
  const m = name.match(ROOT_RE);
  if (!m) return name;
  const [, root, suffix] = m;
  return `${toLatinRoot(root)}${suffix}`;
}

export interface DualLabel {
  /** The label to render large, according to the user's preference. */
  primary: string;
  /** The complementary label, smaller — empty string when both are equal. */
  secondary: string;
}

/** A chord like "Cm7" rendered with the active notation as primary. */
export function displayChord(name: string, notation: Notation): DualLabel {
  const english = name;
  const latin = toLatinChord(name);
  if (english === latin) return { primary: english, secondary: "" };
  return notation === "latin"
    ? { primary: latin, secondary: english }
    : { primary: english, secondary: latin };
}

/** A key heading like "G mayor" rendered with the active notation. */
export function displayKey(
  root: string,
  mode: "major" | "minor",
  notation: Notation,
): DualLabel {
  const modeLabel = mode === "major" ? "mayor" : "menor";
  const englishRoot = root;
  const latinRoot = toLatinRoot(root);
  if (englishRoot === latinRoot) {
    return { primary: `${englishRoot} ${modeLabel}`, secondary: "" };
  }
  return notation === "latin"
    ? {
        primary: `${latinRoot} ${modeLabel}`,
        secondary: `${englishRoot} ${modeLabel}`,
      }
    : {
        primary: `${englishRoot} ${modeLabel}`,
        secondary: `${latinRoot} ${modeLabel}`,
      };
}
