/**
 * Smart alternative suggestions for chord correction.
 *
 * Given what the detector thinks a chord is and the song's key, return a
 * short list of *musically plausible* alternatives — the kind of chords a
 * guitarist would consider when second-guessing the detector. We bias toward:
 *
 *   1) Same root, flipped quality (E ↔ Em). The most common detector mistake
 *      is confusing major/minor because the 3rd can be masked in dense mixes.
 *   2) Diatonic chords of the detected key — musically coherent neighbours.
 *
 * Only chords that have a diagram in chordShapes are returned, so every
 * suggestion is actionable (the user can see how to play it).
 */

import { findShape } from "../features/chords/data/chordShapes";
import { KeyInfo } from "../types/api";

const NOTE_ORDER = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Bb: "A#", Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Cb: "B", Fb: "E",
};

const CHORD_RE = /^([A-G][#b]?)(.*)$/;

type Triad = "maj" | "min" | "dim";

function normaliseRoot(r: string): string {
  return FLAT_TO_SHARP[r] ?? r;
}

function parseChord(name: string): { root: string; rest: string } {
  const m = CHORD_RE.exec(name.trim());
  if (!m) return { root: name, rest: "" };
  return { root: normaliseRoot(m[1]), rest: m[2] };
}

/** Map a chord name to the triad quality that best represents it. */
function triadOf(restOfName: string): Triad {
  const clean = restOfName.split("/")[0];
  if (clean === "") return "maj";
  if (clean === "m") return "min";
  if (clean.startsWith("dim")) return "dim";
  if (clean.startsWith("m") && !clean.startsWith("maj")) return "min";
  return "maj";
}

function rootAtSemitone(keyRoot: string, semi: number): string {
  const idx = NOTE_ORDER.indexOf(
    normaliseRoot(keyRoot) as (typeof NOTE_ORDER)[number],
  );
  if (idx < 0) return keyRoot;
  return NOTE_ORDER[(idx + semi) % 12];
}

function triadToSuffix(t: Triad): string {
  if (t === "maj") return "";
  if (t === "min") return "m";
  return "dim";
}

/** Degree table ordered by tonal "prominence" — I/V/vi/IV first. */
const MAJOR_PROMINENCE: [number, Triad][] = [
  [0, "maj"],   // I
  [7, "maj"],   // V
  [9, "min"],   // vi
  [5, "maj"],   // IV
  [2, "min"],   // ii
  [4, "min"],   // iii
  [11, "dim"],  // vii°
];

const MINOR_PROMINENCE: [number, Triad][] = [
  [0, "min"],   // i
  [7, "maj"],   // V (harmonic)
  [3, "maj"],   // III
  [5, "min"],   // iv
  [8, "maj"],   // VI
  [10, "maj"],  // VII
  [7, "min"],   // v (natural)
  [2, "dim"],   // ii°
];

/** Chords of the scale ordered by how commonly they show up. */
export function diatonicChords(key: KeyInfo): string[] {
  const table = key.mode === "major" ? MAJOR_PROMINENCE : MINOR_PROMINENCE;
  return table.map(([semi, t]) => {
    const root = rootAtSemitone(key.root, semi);
    return root + triadToSuffix(t);
  });
}

/** Sibling triad for the same root — swap maj↔min; dim has no obvious swap. */
function siblingTriad(root: string, triad: Triad): string | null {
  if (triad === "maj") return root + "m";
  if (triad === "min") return root;
  return null;
}

/**
 * Compact ranked list of alternative chord names, excluding the detected one.
 * Each returned name has a diagram in chordShapes (no dead ends).
 *
 * Priority order:
 *   1) Detector's richer quality (e.g. Gmaj7 when simplified is G) — only
 *      when the full name differs from the simplified one AND we have a
 *      shape for it. Biggest payoff when the detector heard a 7th.
 *   2) Sibling triad (maj↔min) — biggest payoff for major/minor confusion,
 *      the most common chroma template mistake.
 *   3) Diatonic chords of the key, in tonal prominence order.
 */
export function suggestAlternatives(
  simplifiedName: string,
  detectedFullName: string,
  key: KeyInfo,
  limit = 5,
): string[] {
  const { root, rest } = parseChord(simplifiedName);
  const triad = triadOf(rest);

  const out: string[] = [];
  const seen = new Set<string>([simplifiedName]);

  // 1) Richer detector quality if it differs and we have a shape for it.
  if (detectedFullName && detectedFullName !== simplifiedName) {
    if (findShape(detectedFullName) && !seen.has(detectedFullName)) {
      out.push(detectedFullName);
      seen.add(detectedFullName);
    }
  }

  // 2) Sibling triad (maj↔min).
  const sibling = siblingTriad(root, triad);
  if (sibling && findShape(sibling) && !seen.has(sibling)) {
    out.push(sibling);
    seen.add(sibling);
  }

  // 3) Diatonic chords, in tonal prominence order.
  for (const name of diatonicChords(key)) {
    if (out.length >= limit) break;
    if (seen.has(name)) continue;
    if (!findShape(name)) continue;
    out.push(name);
    seen.add(name);
  }

  return out.slice(0, limit);
}
