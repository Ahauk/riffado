import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";
import { displayChord, toLatinRoot } from "../../../utils/notation";
import { useNotation } from "../../settings/NotationContext";
import { CircleOfFifthsSvg } from "../components/CircleOfFifthsSvg";
import {
  CHORD_FORMULAS,
  CHROMATIC_ROOTS,
  ChordFormula,
} from "../data/chordFormulas";

export function LearnScreen() {
  const { notation } = useNotation();
  const [root, setRoot] = useState<string>("C");
  const [formula, setFormula] = useState<ChordFormula>(CHORD_FORMULAS[0]);

  const chordName = `${root}${formula.suffix}`;
  const chordDual = displayChord(chordName, notation);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Aprende</Text>
        <Text style={styles.hint}>
          Elige un acorde y mira qué notas lo forman en el círculo de quintas.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.diagramCard}>
          <View style={styles.chordHeader}>
            <Text style={styles.chordName}>{chordDual.primary}</Text>
            {chordDual.secondary !== "" && (
              <Text style={styles.chordNameAlt}>{chordDual.secondary}</Text>
            )}
          </View>
          <CircleOfFifthsSvg
            root={root}
            intervals={formula.intervals}
            notation={notation}
            size={290}
          />
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Fórmula</Text>
            <Text style={styles.formulaValue}>{formula.formula}</Text>
          </View>
          <Text style={styles.description}>{formula.description}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escuchar acorde — próximamente"
          disabled
          style={[styles.audioBtn, styles.audioBtnDisabled]}
        >
          <Text style={styles.audioBtnLabel}>♪ Escuchar — próximamente</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Raíz</Text>
        <View style={styles.rootGrid}>
          {CHROMATIC_ROOTS.map((r) => {
            const selected = r === root;
            const label = notation === "latin" ? toLatinRoot(r) : r;
            return (
              <Pressable
                key={r}
                onPress={() => setRoot(r)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.rootChip, selected && styles.rootChipSelected]}
              >
                <Text
                  style={[
                    styles.rootChipLabel,
                    selected && styles.rootChipLabelSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Tipo</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {CHORD_FORMULAS.map((f) => {
            const selected = f.id === formula.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFormula(f)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
              >
                <Text
                  style={[
                    styles.typeChipLabel,
                    selected && styles.typeChipLabelSelected,
                  ]}
                >
                  {f.esLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 4,
  },
  title: {
    fontFamily: BRAND_FONT,
    fontSize: 36,
    color: colors.text,
    letterSpacing: 1.5,
  },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },

  diagramCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  chordHeader: { alignItems: "center", gap: 2 },
  chordName: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.primary,
  },
  chordNameAlt: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  formulaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  formulaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  formulaValue: {
    ...typography.h2,
    color: colors.primarySoft,
    fontWeight: "700",
    letterSpacing: 1,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },

  audioBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  audioBtnDisabled: { opacity: 0.6 },
  audioBtnLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },

  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.xs,
  },

  rootGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rootChip: {
    minWidth: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  rootChipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  rootChipLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  rootChipLabelSelected: { color: colors.text },

  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  typeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  typeChipLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  typeChipLabelSelected: { color: colors.text },
});
