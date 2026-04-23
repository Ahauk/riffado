import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HELP, HelpEntry } from "../../../components/help/helpContent";
import { HelpBottomSheet } from "../../../components/help/HelpBottomSheet";
import { RootStackParamList } from "../../../navigation/types";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const GLOSSARY_KEYS = ["tonality", "progression", "capo", "confidence"] as const;

export function SettingsScreen({ navigation }: Props) {
  const [entry, setEntry] = useState<HelpEntry | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.header}>Ajustes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Glosario</Text>
        <Text style={styles.sectionHint}>
          Los conceptos que usamos en la app, explicados en corto. Toca
          cualquiera para ver el detalle.
        </Text>
        <View style={styles.group}>
          {GLOSSARY_KEYS.map((key) => {
            const h = HELP[key];
            return (
              <Pressable
                key={key}
                onPress={() => setEntry(h)}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.itemTitle}>{h.title}</Text>
                <Text style={styles.itemArrow}>›</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Acerca de</Text>
        <View style={styles.group}>
          <View style={styles.item}>
            <Text style={styles.itemTitle}>Riffado</Text>
            <Text style={styles.itemValue}>0.1.0</Text>
          </View>
        </View>
      </ScrollView>

      <HelpBottomSheet
        visible={entry !== null}
        entry={entry}
        onClose={() => setEntry(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: "space-between",
  },
  back: { color: colors.text, fontSize: 32, lineHeight: 32, paddingHorizontal: spacing.xs },
  header: { ...typography.body, color: colors.text, fontWeight: "600" },

  content: { padding: spacing.lg, gap: spacing.sm },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  sectionHint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemPressed: { backgroundColor: colors.surfaceAlt },
  itemTitle: { ...typography.body, color: colors.text, flex: 1 },
  itemArrow: { color: colors.textMuted, fontSize: 22 },
  itemValue: { ...typography.body, color: colors.textMuted },
});
