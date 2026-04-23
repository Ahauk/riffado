import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { uploadAndAnalyze } from "../../../services/api/analyses";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Analyzing">;

type UiState =
  | { kind: "uploading" }
  | { kind: "error"; message: string };

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
      navigation.replace("Results", { analysis: result });
    } catch (e) {
      if (runIdRef.current !== myRun) return;
      const message =
        e instanceof Error ? e.message : "No pudimos analizar este audio.";
      setState({ kind: "error", message });
    }
  }, [audioUri, navigation]);

  useEffect(() => {
    void run();
  }, [run]);

  if (state.kind === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.errorTitle}>No pudimos rifar esta canción</Text>
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
