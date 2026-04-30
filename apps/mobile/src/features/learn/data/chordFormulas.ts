/**
 * Chord type catalogue used by the Circle-of-Fifths visualizer.
 *
 * `intervals` are semitone offsets from the root; the picker uses them to
 * highlight pitch classes on the wheel and to compute the resulting chord
 * name (root + suffix).
 */

export interface ChordFormula {
  id: string;
  /** Suffix appended to the root to form the chord name (e.g. "m", "maj7"). */
  suffix: string;
  /** Spanish display label for the chord type. */
  esLabel: string;
  /** Semitone offsets from the root. */
  intervals: number[];
  /** Compact formula string with sharps/flats unicode. */
  formula: string;
  /** One-line description shown below the diagram. */
  description: string;
}

export const CHORD_FORMULAS: ChordFormula[] = [
  {
    id: "major",
    suffix: "",
    esLabel: "Mayor",
    intervals: [0, 4, 7],
    formula: "1 — 3 — 5",
    description: "El acorde 'feliz' por excelencia. Tres notas: tónica, tercera mayor y quinta justa.",
  },
  {
    id: "minor",
    suffix: "m",
    esLabel: "Menor",
    intervals: [0, 3, 7],
    formula: "1 — ♭3 — 5",
    description: "El sonido melancólico. Igual que el mayor, pero con la tercera bajada un semitono.",
  },
  {
    id: "dom7",
    suffix: "7",
    esLabel: "Dominante 7",
    intervals: [0, 4, 7, 10],
    formula: "1 — 3 — 5 — ♭7",
    description: "El motor del blues y el jazz. Mayor con séptima menor agregada — pide resolver.",
  },
  {
    id: "maj7",
    suffix: "maj7",
    esLabel: "Maj7",
    intervals: [0, 4, 7, 11],
    formula: "1 — 3 — 5 — 7",
    description: "Mayor con séptima mayor. Suena suave, sofisticado, jazzero.",
  },
  {
    id: "min7",
    suffix: "m7",
    esLabel: "m7",
    intervals: [0, 3, 7, 10],
    formula: "1 — ♭3 — 5 — ♭7",
    description: "Menor con séptima menor. La base del soul, R&B y bossa nova.",
  },
  {
    id: "sus2",
    suffix: "sus2",
    esLabel: "Sus2",
    intervals: [0, 2, 7],
    formula: "1 — 2 — 5",
    description: "Sin tercera. La segunda mayor reemplaza a la tercera — suena abierto, suspendido.",
  },
  {
    id: "sus4",
    suffix: "sus4",
    esLabel: "Sus4",
    intervals: [0, 5, 7],
    formula: "1 — 4 — 5",
    description: "Sin tercera. La cuarta justa reemplaza a la tercera — pide resolver al mayor.",
  },
  {
    id: "dim",
    suffix: "dim",
    esLabel: "Dim",
    intervals: [0, 3, 6],
    formula: "1 — ♭3 — ♭5",
    description: "Tensión pura. Tercera y quinta bajadas — disonante, raro, peliculesco.",
  },
  {
    id: "aug",
    suffix: "aug",
    esLabel: "Aug",
    intervals: [0, 4, 8],
    formula: "1 — 3 — ♯5",
    description: "Quinta aumentada. Suena flotante, sin gravedad — usado por Beatles y Bowie.",
  },
];

/** Roots in the order shown on the picker (chromatic, sharps only). */
export const CHROMATIC_ROOTS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
