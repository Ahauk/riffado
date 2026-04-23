/**
 * Seed data for guitar chord shapes.
 *
 * Convention for `frets` and `fingers` (always length 6):
 *   Index 0 → 6th string (low E),  Index 5 → 1st string (high e).
 *   frets value: -1 = muted ("X"), 0 = open ("O"), >= 1 = absolute fret.
 *   fingers value: 0 = no finger, 1 = index, 2 = middle, 3 = ring, 4 = pinky.
 */
export interface ChordShape {
  shape_id: string;
  chord_name: string;
  frets: [number, number, number, number, number, number];
  fingers: [number, number, number, number, number, number];
  /** First fret shown in the diagram (1 = open position). */
  base_fret: number;
  /** Optional barre indicator. from_string/to_string 6=low, 1=high. */
  barre?: { fret: number; from_string: number; to_string: number };
  difficulty: 1 | 2 | 3;
}

const SHAPES: ChordShape[] = [
  // ── Open major triads ──────────────────────────────────────────────
  {
    shape_id: "c_open", chord_name: "C",
    frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0],
    base_fret: 1, difficulty: 1,
  },
  {
    shape_id: "d_open", chord_name: "D",
    frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2],
    base_fret: 1, difficulty: 1,
  },
  {
    shape_id: "e_open", chord_name: "E",
    frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0],
    base_fret: 1, difficulty: 1,
  },
  {
    shape_id: "g_open", chord_name: "G",
    frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3],
    base_fret: 1, difficulty: 1,
  },
  {
    shape_id: "a_open", chord_name: "A",
    frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0],
    base_fret: 1, difficulty: 1,
  },

  // ── Open minor triads ──────────────────────────────────────────────
  {
    shape_id: "am_open", chord_name: "Am",
    frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0],
    base_fret: 1, difficulty: 1,
  },
  {
    shape_id: "dm_open", chord_name: "Dm",
    frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1],
    base_fret: 1, difficulty: 1,
  },
  {
    shape_id: "em_open", chord_name: "Em",
    frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0],
    base_fret: 1, difficulty: 1,
  },

  // ── Barre chords around low positions ──────────────────────────────
  {
    shape_id: "f_barre_1", chord_name: "F",
    frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1],
    base_fret: 1, difficulty: 3,
    barre: { fret: 1, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "fm_barre_1", chord_name: "Fm",
    frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1],
    base_fret: 1, difficulty: 3,
    barre: { fret: 1, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "bm_barre_2", chord_name: "Bm",
    frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1],
    base_fret: 2, difficulty: 2,
    barre: { fret: 2, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "b_barre_2", chord_name: "B",
    frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1],
    base_fret: 2, difficulty: 2,
    barre: { fret: 2, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "f_sharp_m_barre_2", chord_name: "F#m",
    frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1],
    base_fret: 2, difficulty: 3,
    barre: { fret: 2, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "f_sharp_barre_2", chord_name: "F#",
    frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1],
    base_fret: 2, difficulty: 3,
    barre: { fret: 2, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "c_sharp_m_barre_4", chord_name: "C#m",
    frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1],
    base_fret: 4, difficulty: 3,
    barre: { fret: 4, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "gm_barre_3", chord_name: "Gm",
    frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1],
    base_fret: 3, difficulty: 3,
    barre: { fret: 3, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "cm_barre_3", chord_name: "Cm",
    frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1],
    base_fret: 3, difficulty: 3,
    barre: { fret: 3, from_string: 5, to_string: 1 },
  },

  // ── Sharp/flat majors via barre (covers the unknown fallbacks) ─────
  {
    shape_id: "c_sharp_barre_1", chord_name: "C#",
    frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1],
    base_fret: 4, difficulty: 3,
    barre: { fret: 4, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "d_sharp_barre_6", chord_name: "D#",
    frets: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1],
    base_fret: 6, difficulty: 3,
    barre: { fret: 6, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "g_sharp_barre_4", chord_name: "G#",
    frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1],
    base_fret: 4, difficulty: 3,
    barre: { fret: 4, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "a_sharp_barre_1", chord_name: "A#",
    frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1],
    base_fret: 1, difficulty: 3,
    barre: { fret: 1, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "d_sharp_m_barre_6", chord_name: "D#m",
    frets: [-1, 6, 8, 8, 7, 6], fingers: [0, 1, 3, 4, 2, 1],
    base_fret: 6, difficulty: 3,
    barre: { fret: 6, from_string: 5, to_string: 1 },
  },
  {
    shape_id: "g_sharp_m_barre_4", chord_name: "G#m",
    frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1],
    base_fret: 4, difficulty: 3,
    barre: { fret: 4, from_string: 6, to_string: 1 },
  },
  {
    shape_id: "a_sharp_m_barre_1", chord_name: "A#m",
    frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1],
    base_fret: 1, difficulty: 3,
    barre: { fret: 1, from_string: 5, to_string: 1 },
  },
];

const BY_ID: Record<string, ChordShape> = Object.fromEntries(
  SHAPES.map((s) => [s.shape_id, s])
);

const BY_NAME: Record<string, ChordShape> = Object.fromEntries(
  SHAPES.map((s) => [s.chord_name, s])
);

/** Find a shape by either shape_id or chord name; returns null if unknown. */
export function findShape(idOrName: string | null | undefined): ChordShape | null {
  if (!idOrName) return null;
  return BY_ID[idOrName] || BY_NAME[idOrName] || null;
}

export const ALL_SHAPES = SHAPES;
