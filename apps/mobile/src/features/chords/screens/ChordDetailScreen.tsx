import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { ChordSegment } from "../../../types/api";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { suggestAlternatives } from "../../../utils/chordSuggestions";
import { displayChord } from "../../../utils/notation";
import { degreeOf } from "../../../utils/roman";
import { updateAnalysisChord } from "../../history/storage";
import { useNotation } from "../../settings/NotationContext";
import { ChordDiagramSvg } from "../components/ChordDiagramSvg";
import { ChordPickerSheet } from "../components/ChordPickerSheet";
import { findShape } from "../data/chordShapes";

type Props = NativeStackScreenProps<RootStackParamList, "ChordDetail">;

/** Resolves display name/shape/correction state for a segment. */
function displayFor(seg: ChordSegment) {
  const corrected = Boolean(seg.user_correction);
  const name = corrected
    ? seg.user_correction!.simplified.name
    : seg.simplified.name;
  const shape_id = corrected
    ? seg.user_correction!.simplified.shape_id
    : seg.simplified.shape_id;
  return { name, shape_id, corrected };
}

export function ChordDetailScreen({ route, navigation }: Props) {
  const { analysisId, chord: initialChord, progression, keyInfo } = route.params;
  const { notation } = useNotation();

  // Local copy of the progression so corrections re-render without bouncing
  // back to Results. When the user goes back, Results re-reads from history
  // and picks up the same mutations.
  const [segments, setSegments] = useState<ChordSegment[]>(progression);

  // Active tab = chord *index* (not name), so corrections don't accidentally
  // collapse two segments that now share a name.
  const [activeIdx, setActiveIdx] = useState<number>(initialChord.idx);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeSeg = useMemo(
    () => segments.find((s) => s.idx === activeIdx) ?? initialChord,
    [segments, activeIdx, initialChord],
  );
  const active = displayFor(activeSeg);
  const shape = findShape(active.shape_id) ?? findShape(active.name);

  // Tabs: one chip per unique display name, preserving first-occurrence order
  // but keyed by the segment idx so state survives renames.
  const tabs = useMemo(() => {
    const seen = new Set<string>();
    const out: { idx: number; label: string }[] = [];
    for (const s of segments) {
      const rawName = displayFor(s).name;
      if (!seen.has(rawName)) {
        seen.add(rawName);
        out.push({ idx: s.idx, label: displayChord(rawName, notation).primary });
      }
    }
    return out;
  }, [segments, notation]);

  const applyCorrection = useCallback(
    async (name: string, shape_id: string) => {
      const correction = {
        simplified: { name, shape_id },
        degree: degreeOf(name, keyInfo),
        corrected_at: Date.now(),
      };
      setSegments((prev) =>
        prev.map((s) =>
          s.idx === activeIdx ? { ...s, user_correction: correction } : s,
        ),
      );
      await updateAnalysisChord(analysisId, activeIdx, correction);
    },
    [analysisId, activeIdx, keyInfo],
  );

  const resetCorrection = useCallback(async () => {
    setSegments((prev) =>
      prev.map((s) => (s.idx === activeIdx ? { ...s, user_correction: null } : s)),
    );
    await updateAnalysisChord(analysisId, activeIdx, null);
  }, [analysisId, activeIdx]);

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
        <View style={styles.chordNameWrap}>
          <Text style={styles.chordName}>
            {displayChord(active.name, notation).primary}
          </Text>
          {displayChord(active.name, notation).secondary !== "" && (
            <Text style={styles.chordNameAlt}>
              {displayChord(active.name, notation).secondary}
            </Text>
          )}
        </View>
        {active.corrected && (
          <Text style={styles.correctedHint}>
            Corregido por ti · detectado: {displayChord(activeSeg.simplified.name, notation).primary}
          </Text>
        )}

        <View style={styles.diagramWrap}>
          {shape ? (
            <ChordDiagramSvg shape={shape} variant="detail" />
          ) : (
            <View style={styles.unknownBox}>
              <Text style={styles.unknownTitle}>{active.name}</Text>
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

        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          style={styles.changeBtn}
        >
          <Text style={styles.changeBtnLabel}>Cambiar acorde</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.progression}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.progressionList}
        >
          {tabs.map((t) => {
            const isActive = t.idx === activeIdx;
            return (
              <Pressable
                key={t.idx}
                onPress={() => setActiveIdx(t.idx)}
                style={[styles.progressionTab, isActive && styles.progressionTabActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.progressionLabel,
                    isActive && styles.progressionLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ChordPickerSheet
        visible={pickerOpen}
        currentName={active.name}
        detectedName={activeSeg.simplified.name}
        detectedFullName={activeSeg.detected.name}
        suggestions={suggestAlternatives(
          activeSeg.simplified.name,
          activeSeg.detected.name,
          keyInfo,
        )}
        hasCorrection={active.corrected}
        onPick={async (name, shape_id) => {
          await applyCorrection(name, shape_id);
          setPickerOpen(false);
        }}
        onReset={async () => {
          await resetCorrection();
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
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
  backPlaceholder: { width: 24 },
  header: { ...typography.body, color: colors.text, fontWeight: "600" },

  content: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  chordNameWrap: { alignItems: "center", gap: 2 },
  chordName: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.primary,
  },
  chordNameAlt: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  correctedHint: {
    ...typography.caption,
    color: colors.primarySoft,
    marginTop: -spacing.sm,
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

  changeBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  changeBtnLabel: {
    ...typography.body,
    color: colors.primarySoft,
    fontWeight: "700",
  },

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
