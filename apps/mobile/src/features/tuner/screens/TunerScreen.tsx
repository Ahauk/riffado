import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";
import { TunerNeedle } from "../components/TunerNeedle";
import { useTuner } from "../hooks/useTuner";
import { tuningQuality } from "../utils/noteMapping";

/** Friendly hint based on how far off the user is. */
function tuningHint(cents: number): { text: string; tone: "ok" | "off" } | null {
  if (cents > 5) return { text: "Aflójale tantito", tone: "off" };
  if (cents < -5) return { text: "Apriétale tantito", tone: "off" };
  if (Math.abs(cents) <= 5) return { text: "¡Ya quedó!", tone: "ok" };
  return null;
}

export function TunerScreen() {
  const { status, reading, confidence, start, stop } = useTuner();

  // Auto-start when the tab becomes focused, auto-stop when it loses focus.
  // The user shouldn't have to tap a button to begin tuning — opening the
  // tab IS the intent.
  useFocusEffect(
    useCallback(() => {
      void start();
      return () => {
        void stop();
      };
    }, [start, stop]),
  );

  const cents = reading?.cents ?? 0;
  const quality = useMemo(
    () => (reading ? tuningQuality(reading.cents) : "off"),
    [reading],
  );
  const isActive = status === "listening" && reading != null;
  const hint = reading && isActive ? tuningHint(reading.cents) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Afinador</Text>
        <Text style={styles.subtitle}>
          Toca una cuerda y la aguja te dice qué tan afinado estás.
        </Text>
      </View>

      <View style={styles.stage}>
        <TunerNeedle cents={cents} quality={quality} active={isActive} />

        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>
            {reading ? reading.label : "—"}
          </Text>
          <Text
            style={[
              styles.centsLabel,
              isActive && quality === "in-tune" && styles.centsInTune,
            ]}
          >
            {reading
              ? `${reading.cents > 0 ? "+" : ""}${reading.cents} ¢`
              : status === "listening"
                ? "Escuchando..."
                : ""}
          </Text>
          {reading?.suggestedString && (
            <Text style={styles.stringHint}>
              cuerda {reading.suggestedString}
            </Text>
          )}
          {hint && (
            <Text
              style={[
                styles.tuningHint,
                hint.tone === "ok" && styles.tuningHintOk,
              ]}
            >
              {hint.text}
            </Text>
          )}
          {reading && (
            <Text style={styles.freqLine}>
              actual {reading.inputFreq.toFixed(1)} Hz · meta{" "}
              {reading.targetFreq.toFixed(1)} Hz
            </Text>
          )}
        </View>

        {status === "denied" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Sin permiso de micrófono</Text>
            <Text style={styles.errorBody}>
              El afinador necesita el micrófono para escuchar tus cuerdas.
              Actívalo en Ajustes del sistema y vuelve a abrir esta pestaña.
            </Text>
          </View>
        )}
        {status === "error" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Algo salió mal</Text>
            <Text style={styles.errorBody}>
              No pudimos arrancar el afinador. Intenta cerrar y volver a abrir
              esta pestaña.
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => void start()}>
              <Text style={styles.retryLabel}>Reintentar</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          Verde = afinada (±5 ¢) · Amarillo = cerca (±15 ¢) · Gris = sigue ajustando.
        </Text>
        <Text style={styles.confidenceHint}>
          {status === "listening"
            ? `Confianza: ${Math.round(confidence * 100)}%`
            : status === "starting"
              ? "Preparando micrófono..."
              : ""}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  noteBlock: {
    alignItems: "center",
    gap: spacing.xs,
  },
  noteLabel: {
    fontFamily: BRAND_FONT,
    fontSize: 84,
    color: colors.text,
    letterSpacing: 4,
    lineHeight: 88,
  },
  centsLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  centsInTune: { color: colors.success },
  stringHint: {
    ...typography.caption,
    color: colors.primarySoft,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  tuningHint: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  tuningHintOk: { color: colors.success },
  freqLine: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    marginTop: spacing.xs,
  },
  errorCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    maxWidth: 360,
  },
  errorTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  errorBody: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  retryLabel: { ...typography.caption, color: colors.text, fontWeight: "700" },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  confidenceHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    minHeight: 18,
  },
});
