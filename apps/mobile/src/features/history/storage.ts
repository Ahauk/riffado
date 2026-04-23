import AsyncStorage from "@react-native-async-storage/async-storage";

import { AnalysisResult } from "../../types/api";

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
