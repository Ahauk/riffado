import AsyncStorage from "@react-native-async-storage/async-storage";

export type Notation = "english" | "latin";

const KEYS = {
  notation: "@riffado:settings:notation",
  showDegrees: "@riffado:settings:showDegrees",
  showCapo: "@riffado:settings:showCapo",
} as const;

const DEFAULTS = {
  notation: "english" as Notation,
  showDegrees: true,
  showCapo: true,
};

export async function getNotation(): Promise<Notation> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.notation);
    return raw === "latin" || raw === "english" ? raw : DEFAULTS.notation;
  } catch (e) {
    console.warn("getNotation failed", e);
    return DEFAULTS.notation;
  }
}

export async function setNotation(notation: Notation): Promise<void> {
  await AsyncStorage.setItem(KEYS.notation, notation);
}

async function getBool(key: string, fallback: boolean): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return fallback;
  } catch (e) {
    console.warn(`getBool ${key} failed`, e);
    return fallback;
  }
}

async function setBool(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? "true" : "false");
}

export const getShowDegrees = () => getBool(KEYS.showDegrees, DEFAULTS.showDegrees);
export const setShowDegrees = (v: boolean) => setBool(KEYS.showDegrees, v);
export const getShowCapo = () => getBool(KEYS.showCapo, DEFAULTS.showCapo);
export const setShowCapo = (v: boolean) => setBool(KEYS.showCapo, v);
