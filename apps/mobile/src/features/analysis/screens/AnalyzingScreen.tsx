import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { AnalysisResult } from "../../../types/api";
import { colors, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Analyzing">;

const MOCK_ANALYSIS: AnalysisResult = {
  analysis_id: "mock-0001",
  status: "completed",
  audio_duration_sec: 10.5,
  key: { root: "G", mode: "major", confidence: 0.81 },
  bpm: 92,
  suggested_capo: { fret: 0, reason: "Ya está en G mayor, con acordes abiertos cómodos" },
  overall_confidence: 0.78,
  chords: [
    {
      idx: 0,
      start_sec: 0,
      end_sec: 2.8,
      detected: { name: "G", root: "G", quality: "maj" },
      simplified: { name: "G", shape_id: "g_open" },
      confidence: 0.84,
    },
    {
      idx: 1,
      start_sec: 2.8,
      end_sec: 5.6,
      detected: { name: "D", root: "D", quality: "maj" },
      simplified: { name: "D", shape_id: "d_open" },
      confidence: 0.79,
    },
    {
      idx: 2,
      start_sec: 5.6,
      end_sec: 8.1,
      detected: { name: "Em", root: "E", quality: "min" },
      simplified: { name: "Em", shape_id: "em_open" },
      confidence: 0.81,
    },
    {
      idx: 3,
      start_sec: 8.1,
      end_sec: 10.5,
      detected: { name: "C", root: "C", quality: "maj" },
      simplified: { name: "C", shape_id: "c_open" },
      confidence: 0.76,
    },
  ],
  meta: { engine: "mock@0.1", processing_ms: 1500 },
};

export function AnalyzingScreen({ navigation }: Props) {
  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace("Results", { analysis: MOCK_ANALYSIS });
    }, 1500);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>Rifando...</Text>
        <Text style={styles.hint}>Analizando el fragmento</Text>
        <Pressable
          style={styles.cancel}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.cancelLabel}>Cancelar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.lg },
  hint: { ...typography.body, color: colors.textMuted },
  cancel: { marginTop: spacing.xl, padding: spacing.md },
  cancelLabel: { ...typography.body, color: colors.textMuted },
});
