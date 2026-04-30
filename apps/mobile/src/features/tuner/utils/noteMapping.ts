/**
 * Map a frequency in Hz to the closest equal-tempered note (A4 = 440 Hz)
 * and return how far off it is in cents (-50..+50).
 *
 * Cents = 1200 * log2(f / f_target). One semitone is 100 cents.
 */

const A4_HZ = 440;
const A4_MIDI = 69;

const NOTE_NAMES = [
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

export type NoteName = (typeof NOTE_NAMES)[number];

export interface NoteReading {
  /** Pitch class without octave, e.g. "E" or "F#". */
  note: NoteName;
  /** Octave number using scientific pitch notation (A4 = 440 Hz). */
  octave: number;
  /** -50..+50 cents from the target note. Negative = flat, positive = sharp. */
  cents: number;
  /** Exact MIDI note number (rounded). */
  midi: number;
  /** The label a guitarist would expect ("E2", "A2", "D3", "G3", "B3", "E4"). */
  label: string;
  /** "6ª", "5ª"... if `f` is close to a standard guitar string in EADGBE. */
  suggestedString: string | null;
}

/** Standard guitar tuning (EADGBE) low → high, with each string's MIDI. */
const STANDARD_GUITAR_STRINGS: { name: string; midi: number; label: string }[] = [
  { name: "6ª (E grave)", midi: 40, label: "E2" }, // E2
  { name: "5ª (A)", midi: 45, label: "A2" }, // A2
  { name: "4ª (D)", midi: 50, label: "D3" }, // D3
  { name: "3ª (G)", midi: 55, label: "G3" }, // G3
  { name: "2ª (B)", midi: 59, label: "B3" }, // B3
  { name: "1ª (E aguda)", midi: 64, label: "E4" }, // E4
];

/**
 * Convert frequency to MIDI note (float). Caller can `Math.round` to snap to
 * the closest equal-tempered semitone, and the fractional part * 100 gives
 * the cents-off.
 */
export function frequencyToMidi(freqHz: number): number {
  if (freqHz <= 0 || !Number.isFinite(freqHz)) return Number.NaN;
  return A4_MIDI + 12 * Math.log2(freqHz / A4_HZ);
}

/** MIDI note → "C", "C#", "D"... (pitch class only, no octave). */
function midiToPitchClass(midi: number): NoteName {
  // MIDI 60 = C4, so pitch class index = (midi - 60 + 1200) % 12 == midi % 12 (with offset 0=C).
  const pc = ((midi % 12) + 12) % 12;
  return NOTE_NAMES[pc];
}

/** MIDI note → octave in scientific pitch notation. C4 = MIDI 60. */
function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function readingFromFrequency(freqHz: number): NoteReading | null {
  if (freqHz <= 0 || !Number.isFinite(freqHz)) return null;
  const midiFloat = frequencyToMidi(freqHz);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const note = midiToPitchClass(midi);
  const octave = midiToOctave(midi);
  const label = `${note}${octave}`;

  // Suggest the closest standard guitar string when within ±2 semitones.
  // We use MIDI distance, not cents, so a slightly de-tuned string still maps.
  let suggestedString: string | null = null;
  let bestDiff = Infinity;
  for (const s of STANDARD_GUITAR_STRINGS) {
    const diff = Math.abs(midi - s.midi);
    if (diff < bestDiff) {
      bestDiff = diff;
      suggestedString = s.name;
    }
  }
  if (bestDiff > 2) suggestedString = null;

  return { note, octave, cents, midi, label, suggestedString };
}

/** Buckets used to colour the centre indicator. */
export type TuningQuality = "in-tune" | "close" | "off";

export function tuningQuality(cents: number): TuningQuality {
  const abs = Math.abs(cents);
  if (abs <= 5) return "in-tune";
  if (abs <= 15) return "close";
  return "off";
}
