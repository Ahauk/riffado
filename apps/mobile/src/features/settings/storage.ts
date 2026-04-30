import AsyncStorage from "@react-native-async-storage/async-storage";

export type Notation = "english" | "latin";

const KEY = "@riffado:settings:notation";
const DEFAULT: Notation = "english";

export async function getNotation(): Promise<Notation> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === "latin" || raw === "english" ? raw : DEFAULT;
  } catch (e) {
    console.warn("getNotation failed", e);
    return DEFAULT;
  }
}

export async function setNotation(notation: Notation): Promise<void> {
  await AsyncStorage.setItem(KEY, notation);
}
