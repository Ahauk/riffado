import AsyncStorage from "@react-native-async-storage/async-storage";

import { AnalysisResult, UserCorrection } from "../../types/api";

export interface HistoryItem {
  id: string;
  saved_at: number;
  analysis: AnalysisResult;
}

const KEY = "@riffado:history";
const MAX_ITEMS = 50;

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

export async function saveAnalysis(analysis: AnalysisResult): Promise<void> {
  const current = await loadHistory();
  const deduped = current.filter((h) => h.id !== analysis.analysis_id);
  const next: HistoryItem[] = [
    { id: analysis.analysis_id, saved_at: Date.now(), analysis },
    ...deduped,
  ].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function removeAnalysis(id: string): Promise<void> {
  const current = await loadHistory();
  const next = current.filter((h) => h.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getAnalysisById(
  id: string,
): Promise<AnalysisResult | null> {
  const current = await loadHistory();
  return current.find((h) => h.id === id)?.analysis ?? null;
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
