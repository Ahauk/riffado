import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { findShape, groupedByRoot } from "../data/chordShapes";

interface Props {
  visible: boolean;
  /** Currently displayed chord — corrected if user overrode, else detected. */
  currentName: string;
  /** Simplified name the detector assigned (what Results shows by default). */
  detectedName: string;
  /** Full detector output incl. 7ths/sus/etc. — may equal detectedName. */
  detectedFullName: string;
  /** Suggested alternatives — musically plausible, already filtered. */
  suggestions: string[];
  /** True when a user correction is already active on this chord. */
  hasCorrection: boolean;
  onPick: (chordName: string, shapeId: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function ChordPickerSheet({
  visible,
  currentName,
  detectedName,
  detectedFullName,
  suggestions,
  hasCorrection,
  onPick,
  onReset,
  onClose,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const groups = groupedByRoot();

  // Resolve suggestions to (name, shapeId) tuples — drop anything without a
  // diagram as a belt-and-suspenders guard (suggestAlternatives already filters).
  const suggestionShapes = suggestions
    .map((name) => {
      const s = findShape(name);
      return s ? { name, shape_id: s.shape_id } : null;
    })
    .filter((x): x is { name: string; shape_id: string } => x !== null);

  // Transparency: the detector may have heard a richer chord (Gmaj7) that we
  // simplified to a triad (G). Surface that in the header so the user knows.
  const hasRicherDetection =
    detectedFullName && detectedFullName !== detectedName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <View />
      </Pressable>
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Cambiar acorde</Text>
          <Text style={styles.subtitle}>
            {hasCorrection
              ? `Ahora: ${currentName}  ·  detectado: ${detectedName}`
              : hasRicherDetection
                ? `Detectado: ${detectedFullName}  (mostrado como ${detectedName})`
                : `Detectado: ${detectedName}`}
          </Text>
          <Text style={styles.hint}>
            A veces la mezcla confunde al detector. Elige el acorde que oigas
            más claro.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {suggestionShapes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Más probables</Text>
              <View style={styles.chipRow}>
                {suggestionShapes.map((s) => {
                  const selected = s.name === currentName;
                  return (
                    <Pressable
                      key={`sug-${s.shape_id}`}
                      onPress={() => onPick(s.name, s.shape_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Elegir ${s.name}`}
                      style={[
                        styles.chip,
                        styles.chipPrimary,
                        selected && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          styles.chipLabelPrimary,
                          selected && styles.chipLabelSelected,
                        ]}
                      >
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <Pressable
            onPress={() => setShowAll((v) => !v)}
            accessibilityRole="button"
            style={styles.toggle}
            hitSlop={6}
          >
            <Text style={styles.toggleLabel}>
              {showAll ? "▾ Ocultar todos los acordes" : "▸ Ver todos los acordes"}
            </Text>
          </Pressable>

          {showAll &&
            groups.map((g) => (
              <View key={g.root} style={styles.group}>
                <Text style={styles.groupLabel}>{g.root}</Text>
                <View style={styles.chipRow}>
                  {g.shapes.map((s) => {
                    const selected = s.chord_name === currentName;
                    return (
                      <Pressable
                        key={s.shape_id}
                        onPress={() => onPick(s.chord_name, s.shape_id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Elegir ${s.chord_name}`}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            selected && styles.chipLabelSelected,
                          ]}
                        >
                          {s.chord_name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
        </ScrollView>

        <View style={styles.footer}>
          {hasCorrection && (
            <Pressable
              onPress={onReset}
              accessibilityRole="button"
              style={styles.resetBtn}
            >
              <Text style={styles.resetLabel}>Restaurar detección original</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={styles.closeBtn}
          >
            <Text style={styles.closeLabel}>Cerrar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.sm,
    maxHeight: "80%",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },

  section: { gap: spacing.xs },
  sectionLabel: {
    ...typography.caption,
    color: colors.primarySoft,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  toggle: { paddingVertical: spacing.xs, alignSelf: "flex-start" },
  toggleLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },

  group: { gap: spacing.xs },
  groupLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPrimary: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
  chipLabelPrimary: { color: colors.primarySoft },
  chipLabelSelected: { color: colors.text },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetBtn: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  resetLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
  closeBtn: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  closeLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
});
