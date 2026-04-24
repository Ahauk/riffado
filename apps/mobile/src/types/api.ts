export type ChordQuality =
  | "maj"
  | "min"
  | "7"
  | "maj7"
  | "m7"
  | "dim"
  | "aug"
  | "sus4"
  | "sus2";

export interface DetectedChord {
  name: string;
  root: string;
  quality: ChordQuality;
}

export interface SimplifiedChord {
  name: string;
  shape_id: string;
}

export interface UserCorrection {
  simplified: SimplifiedChord;
  /** Roman degree recomputed client-side; null if non-diatonic. */
  degree: string | null;
  corrected_at: number;
}

export interface ChordSegment {
  idx: number;
  start_sec: number;
  end_sec: number;
  detected: DetectedChord;
  simplified: SimplifiedChord;
  confidence: number;
  degree: string | null; // "I", "V", "vi", "VII"... null if non-diatonic
  /** Present only when the user manually overrode the detected chord. */
  user_correction?: UserCorrection | null;
}

export interface KeyInfo {
  root: string;
  mode: "major" | "minor";
  confidence: number;
}

export interface CapoSuggestion {
  fret: number;
  reason: string;
}

export type AnalysisStatus = "processing" | "completed" | "failed";

export interface AnalysisResult {
  analysis_id: string;
  status: AnalysisStatus;
  audio_duration_sec: number;
  key: KeyInfo;
  bpm: number;
  suggested_capo: CapoSuggestion;
  overall_confidence: number;
  progression_roman: string | null;
  chords: ChordSegment[];
  meta: { engine: string; processing_ms: number };
}
