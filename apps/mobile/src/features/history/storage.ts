import AsyncStorage from "@react-native-async-storage/async-storage";

import { AnalysisResult, UserCorrection } from "../../types/api";
import { persistAudio, removeAudio } from "./audioStorage";

export interface HistoryItem {
  id: string;
  saved_at: number;
  analysis: AnalysisResult;
  /** Optional user-provided name; falls back to key + chords summary. */
  custom_title?: string;
  /** Persistent file:// URI for the analyzed audio, when we still have it. */
  audio_uri?: string;
  /** User-pasted lyrics, kept verbatim with line breaks. */
  lyrics?: string;
}

const KEY = "@riffado:history";
const MAX_ITEMS = 50;
const MAX_TITLE_LEN = 60;

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("loadHistory failed", e);
    return [];
  }
}

export async function saveAnalysis(
  analysis: AnalysisResult,
  sourceAudioUri?: string,
): Promise<void> {
  const current = await loadHistory();
  const deduped = current.filter((h) => h.id !== analysis.analysis_id);

  let audioUri: string | undefined;
  if (sourceAudioUri) {
    try {
      audioUri = await persistAudio(sourceAudioUri, analysis.analysis_id);
    } catch (e) {
      console.warn("[saveAnalysis] persistAudio failed", e);
    }
  } else {
    console.log("[saveAnalysis] no sourceAudioUri provided — skipping persist");
  }

  const next: HistoryItem[] = [
    {
      id: analysis.analysis_id,
      saved_at: Date.now(),
      analysis,
      ...(audioUri ? { audio_uri: audioUri } : {}),
    },
    ...deduped,
  ];
  // Drop the tail if we're over the cap and clean up any audio those entries owned.
  const overflow = next.slice(MAX_ITEMS);
  await Promise.all(overflow.map((h) => removeAudio(h.audio_uri)));
  const capped = next.slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(KEY, JSON.stringify(capped));
}

export async function removeAnalysis(id: string): Promise<void> {
  const current = await loadHistory();
  const target = current.find((h) => h.id === id);
  await removeAudio(target?.audio_uri);
  const next = current.filter((h) => h.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  const current = await loadHistory();
  await Promise.all(current.map((h) => removeAudio(h.audio_uri)));
  await AsyncStorage.removeItem(KEY);
}

export async function getAnalysisById(
  id: string,
): Promise<AnalysisResult | null> {
  const current = await loadHistory();
  return current.find((h) => h.id === id)?.analysis ?? null;
}

/** Read a single full HistoryItem (incl. custom_title and audio_uri) by id. */
export async function getHistoryItemById(
  id: string,
): Promise<HistoryItem | null> {
  const current = await loadHistory();
  return current.find((h) => h.id === id) ?? null;
}

/**
 * Set or clear the user-provided title for an analysis. Pass an empty/whitespace
 * string to revert to the auto-generated label. Trims and caps to 60 chars.
 * No-op if the analysis isn't in history.
 */
export async function renameAnalysis(
  id: string,
  rawTitle: string,
): Promise<void> {
  const trimmed = rawTitle.trim().slice(0, MAX_TITLE_LEN);
  const current = await loadHistory();
  const idx = current.findIndex((h) => h.id === id);
  if (idx < 0) return;
  const item = current[idx];
  const nextItem: HistoryItem = {
    ...item,
    ...(trimmed ? { custom_title: trimmed } : {}),
  };
  if (!trimmed) delete nextItem.custom_title;
  const next = [...current];
  next[idx] = nextItem;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/**
 * Save the user's pasted lyrics for an analysis. Pass an empty/whitespace
 * string to clear them. No-op if the analysis isn't in history.
 */
export async function setLyrics(
  analysisId: string,
  rawLyrics: string,
): Promise<void> {
  const trimmed = rawLyrics.trim();
  const current = await loadHistory();
  const idx = current.findIndex((h) => h.id === analysisId);
  if (idx < 0) return;
  const item = current[idx];
  const nextItem: HistoryItem = { ...item };
  if (trimmed) nextItem.lyrics = trimmed;
  else delete nextItem.lyrics;
  const next = [...current];
  next[idx] = nextItem;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/**
 * Persist a manual correction for a single chord inside a stored analysis.
 * Pass `correction = null` to revert to the detector's original output.
 * No-op if the analysis isn't in history (e.g. an analysis opened before save).
 */
export async function updateAnalysisChord(
  analysisId: string,
  chordIdx: number,
  correction: UserCorrection | null,
): Promise<AnalysisResult | null> {
  const current = await loadHistory();
  const idx = current.findIndex((h) => h.id === analysisId);
  if (idx < 0) return null;

  const item = current[idx];
  const nextChords = item.analysis.chords.map((c) =>
    c.idx === chordIdx ? { ...c, user_correction: correction } : c,
  );
  const nextAnalysis: AnalysisResult = {
    ...item.analysis,
    chords: nextChords,
  };
  const nextItem = { ...item, analysis: nextAnalysis };
  const next = [...current];
  next[idx] = nextItem;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return nextAnalysis;
}
