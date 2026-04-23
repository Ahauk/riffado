import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { RootStackParamList } from "../../../navigation/types";
import { BRAND_FONT, colors, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

const INTRO_KEY = "@riffado:has_seen_intro";
const INTRO_MS = 4500;   // length of the first-time narrated screen
const LOGO_MS = 900;     // logo flash before entering Home

export function SplashScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<"loading" | "intro" | "logo">("loading");
  const narratedOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const seen = await AsyncStorage.getItem(INTRO_KEY);
      if (cancelled) return;
      if (seen === "1") {
        runLogoOnly();
      } else {
        runNarratedThenLogo();
      }
    })();

    function runNarratedThenLogo() {
      setPhase("intro");
      Animated.timing(narratedOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      setTimeout(async () => {
        await AsyncStorage.setItem(INTRO_KEY, "1");
        Animated.timing(narratedOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => runLogoOnly());
      }, INTRO_MS);
    }

    function runLogoOnly() {
      setPhase("logo");
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        navigation.replace("Main");
      }, LOGO_MS);
    }

    return () => {
      cancelled = true;
    };
  }, [navigation, narratedOpacity, logoOpacity]);

  return (
    <View style={styles.safe}>
      {phase === "intro" && (
        <Animated.View style={[styles.container, { opacity: narratedOpacity }]}>
          <Text style={styles.brand}>Riffado</Text>
          <Text style={styles.tagline}>
            Reproduce 10–15 segundos de una canción y te damos la progresión
            probable para tocarla en guitarra.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.note}>
            No somos Shazam: no identificamos canciones. Te damos herramientas
            para sacarla a oído.
          </Text>
        </Animated.View>
      )}
      {phase === "logo" && (
        <Animated.View style={[styles.container, { opacity: logoOpacity }]}>
          <Text style={styles.logo}>Riffado</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  brand: {
    fontFamily: BRAND_FONT,
    fontSize: 64,
    color: colors.text,
    letterSpacing: 3,
  },
  tagline: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
    lineHeight: 24,
  },
  divider: {
    height: 1,
    width: 40,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  note: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  logo: {
    fontFamily: BRAND_FONT,
    fontSize: 72,
    color: colors.primary,
    letterSpacing: 3,
  },
});
