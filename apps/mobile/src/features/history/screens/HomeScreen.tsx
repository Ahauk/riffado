import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { useTabBarVisibility } from "../../../navigation/TabBarContext";
import { WaveformBars } from "../../recording/components/WaveformBars";
import { useRecording } from "../../recording/hooks/useRecording";
import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";

const BUTTON_SIZE = 240;

function formatSeconds(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function HomeScreen() {
  const rootNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setHidden } = useTabBarVisibility();

  const rec = useRecording();
  const isRecording = rec.status === "recording";
  // `starting` catches the brief gap between tapping Rifate and iOS actually
  // flipping isRecording to true (permission prompt, prepareToRecord).
  const [starting, setStarting] = useState(false);
  const immersive = isRecording || starting;

  // Ask the animated tab bar to slide away.
  useLayoutEffect(() => {
    setHidden(immersive);
  }, [immersive, setHidden]);

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

  // Neon breathing: one animated value drives both opacity and scale on the
  // glow layers. 0 = dim & small, 1 = bright & expanded — same feel as the
  // pulsing halo around the Rifate button.
  const neon = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(neon, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(neon, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [neon]);

  // Outer "far bloom" — the wide diffuse aura that spills into the scene.
  const farBloomOpacity = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1],
  });
  const farBloomScale = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.35],
  });
  // Mid bloom — the halo that hugs the glyphs.
  const bloomOpacity = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });
  const bloomScale = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.22],
  });
  // Near glow — fills the letter shape with soft purple.
  const glowOpacity = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const glowScale = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });
  // Hot flare — a lavender highlight that only kicks in near the peak,
  // giving the sensation that the gas ionises hotter at full brightness.
  const flareOpacity = neon.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 0.9],
  });
  const flareScale = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.18],
  });
  // Core "thinning": at peak the white letters lose a touch of presence
  // (opacity) and shrink subtly (scale) so the expanding purple looks like
  // it's eating into them — mimics a heavier stroke weight disappearing.
  const coreOpacity = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.78],
  });
  const coreScale = neon.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  useEffect(() => {
    if (rec.status === "stopped" && rec.audioUri) {
      rootNav.navigate("Analyzing", { audioUri: rec.audioUri });
      const t = setTimeout(rec.reset, 500);
      return () => clearTimeout(t);
    }
  }, [rec.status, rec.audioUri, rootNav, rec.reset]);

  const label = isRecording ? "Detener" : "Rifate";
  const hint = isRecording
    ? `Escuchando... ${formatSeconds(rec.durationMs)}`
    : "Reproduce hasta 60 segundos de una canción";

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await rec.start();
    } finally {
      setStarting(false);
    }
  }, [rec]);

  const onPress = isRecording ? rec.stop : handleStart;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {!immersive && (
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            {/* Far bloom — the wide purple aura that bleeds into the scene. */}
            <Animated.Text
              style={[
                styles.brandFarBloom,
                {
                  opacity: farBloomOpacity,
                  transform: [{ scale: farBloomScale }],
                },
              ]}
              pointerEvents="none"
            >
              Riffado
            </Animated.Text>
            {/* Mid bloom — halo that hugs the glyphs. */}
            <Animated.Text
              style={[
                styles.brandBloom,
                {
                  opacity: bloomOpacity,
                  transform: [{ scale: bloomScale }],
                },
              ]}
              pointerEvents="none"
            >
              Riffado
            </Animated.Text>
            {/* Hot flare — lavender highlight visible only near peak brightness. */}
            <Animated.Text
              style={[
                styles.brandFlare,
                {
                  opacity: flareOpacity,
                  transform: [{ scale: flareScale }],
                },
              ]}
              pointerEvents="none"
            >
              Riffado
            </Animated.Text>
            {/* Near glow — fills the letter shape with soft purple. */}
            <Animated.Text
              style={[
                styles.brandGlow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
              pointerEvents="none"
            >
              Riffado
            </Animated.Text>
            {/* White core — the "tube" of the neon sign; thins slightly at
                peak so the expanding purple appears to eat into it. */}
            <Animated.Text
              style={[
                styles.brand,
                {
                  opacity: coreOpacity,
                  transform: [{ scale: coreScale }],
                },
              ]}
            >
              Riffado
            </Animated.Text>
          </View>
          <Pressable
            onPress={() => rootNav.navigate("Settings")}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            hitSlop={10}
          >
            <Text style={styles.settingsIcon}>⚙︎</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.hero}>
        {!immersive && (
          <Text style={styles.tagline}>¿Estás listo para sacar esa canción?</Text>
        )}

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
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.cta,
              isRecording && styles.ctaActive,
              pressed && styles.ctaPressed,
            ]}
          >
            {isRecording ? (
              <WaveformBars
                samples={rec.samples}
                width={BUTTON_SIZE * 0.7}
                height={BUTTON_SIZE * 0.35}
              />
            ) : (
              <Text style={styles.ctaLabel}>{label}</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.hint}>{hint}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandWrap: {
    position: "relative",
    // Give the bloom room to spill out without clipping against siblings.
    paddingHorizontal: 28,
    marginHorizontal: -28,
    paddingVertical: 14,
    marginVertical: -14,
  },
  brand: {
    fontFamily: BRAND_FONT,
    fontSize: 38,
    color: colors.text,
    letterSpacing: 2,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  brandGlow: {
    position: "absolute",
    top: 14,
    left: 28,
    fontFamily: BRAND_FONT,
    fontSize: 38,
    color: colors.primary,
    letterSpacing: 2,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  brandBloom: {
    position: "absolute",
    top: 14,
    left: 28,
    fontFamily: BRAND_FONT,
    fontSize: 38,
    color: "transparent",
    letterSpacing: 2,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  brandFarBloom: {
    position: "absolute",
    top: 14,
    left: 28,
    fontFamily: BRAND_FONT,
    fontSize: 38,
    color: "transparent",
    letterSpacing: 2,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 56,
  },
  brandFlare: {
    position: "absolute",
    top: 14,
    left: 28,
    fontFamily: BRAND_FONT,
    fontSize: 38,
    color: "transparent",
    letterSpacing: 2,
    textShadowColor: colors.primarySoft,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  settingsIcon: { color: colors.textMuted, fontSize: 24 },

  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  tagline: { ...typography.body, color: colors.textMuted },

  buttonWrap: {
    width: BUTTON_SIZE + 48,
    height: BUTTON_SIZE + 48,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    opacity: 0.18,
  },
  haloActive: { backgroundColor: colors.danger },
  cta: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  ctaActive: { backgroundColor: colors.danger, shadowColor: colors.danger },
  ctaPressed: { transform: [{ scale: 0.98 }] },
  ctaLabel: {
    fontFamily: BRAND_FONT,
    fontSize: 48,
    color: colors.text,
    letterSpacing: 2,
  },
  hint: { ...typography.caption, color: colors.textMuted },
});
