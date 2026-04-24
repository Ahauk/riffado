/**
 * Client-side Roman-degree computation — mirrors apps/api roman_degree.py.
 *
 * Used only to recompute a chord's degree after a user correction. Original
 * degrees served by the backend stay authoritative; this is a local fallback
 * so corrected chords keep a consistent label without a server round-trip.
 *
 * Scope: diatonic triads in major + natural/harmonic minor. Non-diatonic
 * chords return null.
 */

import { ChordSegment, KeyInfo } from "../types/api";

const NOTE_ORDER = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Bb: "A#", Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Cb: "B", Fb: "E",
};

const CHORD_RE = /^([A-G][#b]?)(.*)$/;

type Quality = "maj" | "min" | "dim";

interface DegreeEntry {
  quality: Quality;
  label: string;
}

const MAJOR_DEGREES: Record<number, DegreeEntry> = {
  0: { quality: "maj", label: "I" },
  2: { quality: "min", label: "ii" },
  4: { quality: "min", label: "iii" },
  5: { quality: "maj", label: "IV" },
  7: { quality: "maj", label: "V" },
  9: { quality: "min", label: "vi" },
  11: { quality: "dim", label: "vii°" },
};

const MINOR_DEGREES: Record<number, DegreeEntry> = {
  0: { quality: "min", label: "i" },
  2: { quality: "dim", label: "ii°" },
  3: { quality: "maj", label: "III" },
  5: { quality: "min", label: "iv" },
  7: { quality: "min", label: "v" },
  8: { quality: "maj", label: "VI" },
  10: { quality: "maj", label: "VII" },
};

function normaliseRoot(root: string): string {
  return FLAT_TO_SHARP[root] ?? root;
}

function parseChord(name: string): { root: string; rest: string } {
  const m = CHORD_RE.exec(name.trim());
  if (!m) return { root: name, rest: "" };
  return { root: normaliseRoot(m[1]), rest: m[2] };
}

function simplifyQuality(rest: string): Quality {
  const clean = rest.split("/")[0];
  if (clean === "") return "maj";
  if (clean === "m") return "min";
  if (clean.startsWith("dim")) return "dim";
  if (clean.startsWith("m") && !clean.startsWith("maj")) return "min";
  return "maj";
}

/**
 * Compact harmonic fingerprint: unique degrees in order of first appearance,
 * joined with " – ". Applies user corrections before computing, so manual
 * edits are reflected immediately. Non-diatonic chords collapse to a single
 * "?" entry regardless of how many distinct non-diatonic roots appeared.
 */
export function computeProgressionLabel(
  chords: ChordSegment[],
  key: KeyInfo,
): string {
  const seen = new Set<string>();
  const degrees: string[] = [];
  for (const c of chords) {
    const name = c.user_correction
      ? c.user_correction.simplified.name
      : c.simplified.name;
    const d = degreeOf(name, key) ?? "?";
    if (!seen.has(d)) {
      seen.add(d);
      degrees.push(d);
    }
  }
  return degrees.join(" – ");
}

export function degreeOf(chordName: string, key: KeyInfo): string | null {
  const keyRoot = normaliseRoot(key.root);
  const keyIdx = NOTE_ORDER.indexOf(keyRoot as (typeof NOTE_ORDER)[number]);
  if (keyIdx < 0) return null;

  const { root, rest } = parseChord(chordName);
  const rootIdx = NOTE_ORDER.indexOf(root as (typeof NOTE_ORDER)[number]);
  if (rootIdx < 0) return null;

  const quality = simplifyQuality(rest);
  const semi = (rootIdx - keyIdx + 12) % 12;

  if (key.mode === "major") {
    const entry = MAJOR_DEGREES[semi];
    return entry && entry.quality === quality ? entry.label : null;
  }

  // Minor — harmonic V (major V on semitone 7) is accepted.
  if (semi === 7 && quality === "maj") return "V";
  const entry = MINOR_DEGREES[semi];
  return entry && entry.quality === quality ? entry.label : null;
}
