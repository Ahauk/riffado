import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { saveAnalysis } from "../../history/storage";
import { uploadAndAnalyze } from "../../../services/api/analyses";
import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Analyzing">;

type UiState =
  | { kind: "uploading" }
  | { kind: "error"; title: string; message: string };

const BRAND_WORD_RE = /(rifarte|rifate|rifar)/gi;

/** Splits a title and renders any "rifar" variant in brand style + uppercase. */
function renderBrandedTitle(text: string) {
  const parts = text.split(BRAND_WORD_RE);
  return parts.map((part, i) => {
    if (BRAND_WORD_RE.test(part)) {
      // Reset regex state between tests (global regex quirk).
      BRAND_WORD_RE.lastIndex = 0;
      return (
        <Text key={i} style={styles.errorBrand}>
          {part.toUpperCase()}
        </Text>
      );
    }
    BRAND_WORD_RE.lastIndex = 0;
    return part;
  });
}

function friendlyError(raw: string): { title: string; message: string } {
  const lower = raw.toLowerCase();
  if (lower.includes("too_short") || lower.includes("too short")) {
    return {
      title: "No pudimos ayudarte a rifarte esta canción",
      message:
        "La grabación debe durar al menos 5 segundos. Intenta de nuevo con un fragmento un poco más largo.",
    };
  }
  if (lower.includes("no_harmony") || lower.includes("no harmony")) {
    return {
      title: "No pudimos ayudarte a rifarte esta canción",
      message:
        "No detectamos acordes claros. Prueba con una canción más acústica, un fragmento más limpio o acerca el micrófono a la bocina.",
    };
  }
  if (lower.includes("unreadable_audio") || lower.includes("no pudimos leer")) {
    return {
      title: "No pudimos ayudarte a rifarte esta canción",
      message:
        "El audio no se pudo procesar. Intenta de nuevo.",
    };
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return {
      title: "Sin conexión con el servidor",
      message:
        "Revisa que estés en la misma red que Riffado y vuelve a intentar.",
    };
  }
  return {
    title: "No pudimos ayudarte a rifarte esta canción",
    message: "Intenta de nuevo. Si vuelve a fallar, cambia de fragmento.",
  };
}

export function AnalyzingScreen({ navigation, route }: Props) {
  const { audioUri } = route.params;
  const [state, setState] = useState<UiState>({ kind: "uploading" });
  const runIdRef = useRef(0);

  const run = useCallback(async () => {
    const myRun = ++runIdRef.current;
    setState({ kind: "uploading" });
    try {
      const result = await uploadAndAnalyze(audioUri);
      if (runIdRef.current !== myRun) return;
      // Persist to history before navigating so Home reflects it on return.
      void saveAnalysis(result).catch((err) =>
        console.warn("saveAnalysis failed", err)
      );
      navigation.replace("Results", { analysis: result });
    } catch (e) {
      if (runIdRef.current !== myRun) return;
      const raw = e instanceof Error ? e.message : "";
      const friendly = friendlyError(raw);
      setState({ kind: "error", ...friendly });
    }
  }, [audioUri, navigation]);

  useEffect(() => {
    void run();
  }, [run]);

  if (state.kind === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.errorTitle}>{renderBrandedTitle(state.title)}</Text>
          <Text style={styles.errorHint}>{state.message}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.primary]} onPress={run}>
              <Text style={styles.btnLabel}>Reintentar</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
              <Text style={styles.btnLabelMuted}>Volver</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>Rifando...</Text>
        <Text style={styles.hint}>Analizando el fragmento</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.lg },
  hint: { ...typography.body, color: colors.textMuted },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorBrand: {
    fontFamily: BRAND_FONT,
    color: colors.primary,
    fontSize: 28,
    letterSpacing: 1.5,
  },
  errorHint: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  actions: { marginTop: spacing.xl, gap: spacing.sm, width: "100%" },
  btn: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primary: { backgroundColor: colors.primary },
  btnLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
  btnLabelMuted: { ...typography.body, color: colors.textMuted },
});
