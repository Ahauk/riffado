import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { ChordDiagramSvg } from "../components/ChordDiagramSvg";
import { findShape } from "../data/chordShapes";

type Props = NativeStackScreenProps<RootStackParamList, "ChordDetail">;

export function ChordDetailScreen({ route, navigation }: Props) {
  const { chord: initialChord, progression } = route.params;

  // Unique set of chord names in display order.
  const uniqueNames = Array.from(
    new Set(progression.map((c) => c.simplified.name))
  );

  const [activeName, setActiveName] = useState<string>(
    initialChord.simplified.name
  );

  const shape =
    findShape(activeName) ??
    findShape(initialChord.simplified.shape_id);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          hitSlop={12}
        >
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.header}>Diagrama</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.chordName}>{activeName}</Text>

        <View style={styles.diagramWrap}>
          {shape ? (
            <ChordDiagramSvg shape={shape} variant="detail" />
          ) : (
            <View style={styles.unknownBox}>
              <Text style={styles.unknownTitle}>{activeName}</Text>
              <Text style={styles.unknownHint}>
                Todavía no tenemos digitación para este acorde.
              </Text>
            </View>
          )}
        </View>

        {shape && (
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>
              Posición: {shape.base_fret}
            </Text>
            <Text style={styles.metaLabel}>
              Dificultad: {"●".repeat(shape.difficulty)}
              {"○".repeat(3 - shape.difficulty)}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.progression}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.progressionList}
        >
          {uniqueNames.map((name) => {
            const isActive = name === activeName;
            return (
              <Pressable
                key={name}
                onPress={() => setActiveName(name)}
                style={[styles.progressionTab, isActive && styles.progressionTabActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.progressionLabel,
                    isActive && styles.progressionLabelActive,
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
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
  backPlaceholder: { width: 24 },
  header: { ...typography.body, color: colors.text, fontWeight: "600" },

  content: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  chordName: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.primary,
  },
  diagramWrap: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unknownBox: {
    width: 180,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  unknownTitle: { ...typography.h2, color: colors.text },
  unknownHint: { ...typography.caption, color: colors.textMuted, textAlign: "center" },

  meta: { alignItems: "center", gap: 6 },
  metaLabel: { ...typography.caption, color: colors.textMuted },

  progression: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  progressionList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  progressionTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  progressionTabActive: { backgroundColor: colors.surfaceAlt },
  progressionLabel: { ...typography.body, color: colors.textMuted, fontWeight: "600" },
  progressionLabelActive: { color: colors.text },
});
