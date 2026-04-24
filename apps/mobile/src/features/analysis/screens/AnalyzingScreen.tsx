import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
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

/** Rotating subtitles while we wait for the backend. Each line describes a
 * stage that really happens in the pipeline, but the timing is simulated —
 * the FastAPI call returns synchronously, so we can't report exact progress
 * without a protocol change (polling/SSE). Fase 3 del roadmap. */
const PHASES = [
  "Subiendo la canción...",
  "Escuchando las notas...",
  "Detectando los acordes...",
  "Calculando la tonalidad...",
  "Armando la progresión...",
  "Ya casi listo...",
];

/** Ease the progress bar from 0 to ~95% over ~40s; the response jumps it
 * to 100%. Feels responsive for short clips and honest for long uploads. */
const PROGRESS_SOFT_CAP_MS = 40_000;

const BRAND_WORD_RE_SEARCH = /(rifarte|rifate|rifar)/i;

/** Splits a title and renders any "rifar" variant in brand style + uppercase. */
function renderBrandedTitle(text: string) {
  const parts = text.split(BRAND_WORD_RE);
  return parts.map((part, i) => {
    if (BRAND_WORD_RE_SEARCH.test(part)) {
      return (
        <Text key={i} style={styles.errorBrand}>
          {part.toUpperCase()}
        </Text>
      );
    }
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
  if (lower.includes("too_long") || lower.includes("too long")) {
    return {
      title: "Rola muy larga para rifarte",
      message:
        "Solo podemos analizar canciones de hasta 3 minutos. Corta el archivo a un verso o coro y vuelve a intentar.",
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
  const [phaseIdx, setPhaseIdx] = useState(0);
  const runIdRef = useRef(0);

  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const run = useCallback(async () => {
    const myRun = ++runIdRef.current;
    setState({ kind: "uploading" });
    setPhaseIdx(0);
    progress.setValue(0);

    // Soft-fill: 0 → 0.95 across PROGRESS_SOFT_CAP_MS with easeOut so early
    // progress is fast and it asymptotes near the end. Jumps to 1.0 on
    // response.
    Animated.timing(progress, {
      toValue: 0.95,
      duration: PROGRESS_SOFT_CAP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    try {
      const result = await uploadAndAnalyze(audioUri);
      if (runIdRef.current !== myRun) return;

      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }).start();

      // Persist to history before navigating so Home reflects it on return.
      void saveAnalysis(result).catch((err) =>
        console.warn("saveAnalysis failed", err),
      );
      navigation.replace("Results", { analysis: result });
    } catch (e) {
      if (runIdRef.current !== myRun) return;
      const raw = e instanceof Error ? e.message : "";
      const friendly = friendlyError(raw);
      setState({ kind: "error", ...friendly });
    }
  }, [audioUri, navigation, progress]);

  // Rotate the subtitle every 3.5s while still loading.
  useEffect(() => {
    if (state.kind !== "uploading") return;
    const t = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length);
    }, 3500);
    return () => clearInterval(t);
  }, [state.kind]);

  // Breathing pulse on the spinner ring.
  useEffect(() => {
    if (state.kind !== "uploading") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state.kind, pulse]);

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

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.7],
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.spinnerWrap}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <View style={styles.ringCore} />
        </View>

        <Text style={styles.title}>Rifando tu rola</Text>
        <Text style={styles.phase}>{PHASES[phaseIdx]}</Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <Text style={styles.footerHint}>
          Esto puede tardar unos segundos. No cierres la app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const RING_SIZE = 120;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  spinnerWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.primary,
  },
  ringCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  title: {
    fontFamily: BRAND_FONT,
    fontSize: 36,
    color: colors.text,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  phase: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    minHeight: 22,
  },
  progressTrack: {
    width: "100%",
    maxWidth: 320,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },

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
