import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { WaveformBars } from "../components/WaveformBars";
import { useRecording } from "../hooks/useRecording";

type Props = NativeStackScreenProps<RootStackParamList, "Record">;

const BUTTON_SIZE = 180;

function formatSeconds(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `00:${String(s).padStart(2, "0")}`;
}

export function RecordScreen({ navigation }: Props) {
  const rec = useRecording();
  const isRecording = rec.status === "recording";

  // Halo always breathes so the button feels alive; amplitude + speed
  // increase while recording.
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const amplitude = isRecording ? 1.15 : 1.06;
    const duration = isRecording ? 700 : 1400;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: amplitude,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);

  useEffect(() => {
    if (rec.status === "stopped" && rec.audioUri) {
      navigation.navigate("Analyzing", { audioUri: rec.audioUri });
      const t = setTimeout(rec.reset, 500);
      return () => clearTimeout(t);
    }
  }, [rec.status, rec.audioUri, navigation, rec.reset]);

  const label = isRecording ? "Detener" : "Rifar";
  const hint = isRecording
    ? `Escuchando... ${formatSeconds(rec.durationMs)}`
    : "Toca y escucha 10-15 s de la canción";

  const onPress = isRecording ? rec.stop : rec.start;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Riffado</Text>
          <Text style={styles.subtitle}>¿Cómo sacaste esa canción?</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.buttonWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                isRecording && styles.haloActive,
                { transform: [{ scale: pulse }] },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                pressed && styles.recordButtonPressed,
              ]}
            >
              {isRecording ? (
                <WaveformBars
                  samples={rec.samples}
                  width={BUTTON_SIZE * 0.75}
                  height={BUTTON_SIZE * 0.35}
                />
              ) : (
                <Text style={styles.recordLabel}>{label}</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.hint}>{hint}</Text>
          {isRecording && (
            <Pressable onPress={rec.stop} accessibilityRole="button">
              <Text style={styles.stopLink}>Detener</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.footer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  header: { paddingTop: spacing.xl, alignItems: "center", gap: spacing.xs },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  center: { alignItems: "center", gap: spacing.lg },
  buttonWrap: {
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: BUTTON_SIZE + 32,
    height: BUTTON_SIZE + 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    opacity: 0.18,
  },
  haloActive: { backgroundColor: colors.danger },
  recordButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  recordButtonActive: { backgroundColor: colors.danger, shadowColor: colors.danger },
  recordButtonPressed: { transform: [{ scale: 0.98 }] },
  recordLabel: { ...typography.h2, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted },
  stopLink: {
    ...typography.body,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
  footer: { height: spacing.xl },
});
