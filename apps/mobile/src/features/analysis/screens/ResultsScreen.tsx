import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HelpBottomSheet } from "../../../components/help/HelpBottomSheet";
import { InfoDot } from "../../../components/help/InfoDot";
import { HELP, HelpEntry } from "../../../components/help/helpContent";
import { ChordDiagramSvg } from "../../chords/components/ChordDiagramSvg";
import { ChordPickerSheet } from "../../chords/components/ChordPickerSheet";
import { findShape } from "../../chords/data/chordShapes";
import { getAnalysisById, updateAnalysisChord } from "../../history/storage";
import { RootStackParamList } from "../../../navigation/types";
import { AnalysisResult, ChordSegment } from "../../../types/api";
import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";
import { suggestAlternatives } from "../../../utils/chordSuggestions";
import { computeProgressionLabel, degreeOf } from "../../../utils/roman";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

type Tab = "chords" | "lyrics";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Chord as it should be displayed — correction if present, else detector. */
interface DisplayChord {
  name: string;
  shape_id: string;
  degree: string | null;
}

function displayOf(chord: ChordSegment): DisplayChord {
  if (chord.user_correction) {
    return {
      name: chord.user_correction.simplified.name,
      shape_id: chord.user_correction.simplified.shape_id,
      degree: chord.user_correction.degree,
    };
  }
  return {
    name: chord.simplified.name,
    shape_id: chord.simplified.shape_id,
    degree: chord.degree,
  };
}

interface ConfidenceBadge {
  label: string;
  color: string;
  bg: string;
}

function confidenceBadge(v: number): ConfidenceBadge | null {
  if (v >= 0.75) return null;
  if (v >= 0.5) return { label: "revísalo", color: "#E9B949", bg: "#3A2E10" };
  return { label: "puede ser otro", color: colors.textMuted, bg: colors.surfaceAlt };
}

interface ChordRowProps {
  chord: ChordSegment;
  onPress: () => void;
  onEditPress: () => void;
}

/** Extract the quality suffix the detector found beyond the simple triad. */
function richQualitySuffix(chord: ChordSegment): string | null {
  const full = chord.detected.name;
  const simple = chord.simplified.name;
  if (!full || full === simple) return null;
  if (full.startsWith(simple)) return full.slice(simple.length);
  // Detector name uses a different root (e.g. "G/B" simplified to "G").
  // We only surface the tail if it's a clean suffix; otherwise skip.
  return null;
}

function ChordRow({ chord, onPress, onEditPress }: ChordRowProps) {
  const display = displayOf(chord);
  const shape = findShape(display.shape_id) ?? findShape(display.name);
  const badge = confidenceBadge(chord.confidence);
  const corrected = Boolean(chord.user_correction);
  const richSuffix = corrected ? null : richQualitySuffix(chord);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver diagrama de ${display.name}`}
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.rowPressed]}
    >
      <Text style={rowStyles.time}>{formatTime(chord.start_sec)}</Text>
      <View style={rowStyles.nameWrap}>
        <View style={rowStyles.nameTopRow}>
          <Text style={rowStyles.name}>
            {display.name}
            {richSuffix && (
              <Text style={rowStyles.richSuffix}> {richSuffix}</Text>
            )}
          </Text>
          {corrected && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onEditPress(); }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Editar acorde (corregido por ti)"
              style={rowStyles.correctedMark}
            >
              <Text style={rowStyles.correctedMarkLabel}>✎ tú</Text>
            </Pressable>
          )}
          {!corrected && badge && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onEditPress(); }}
              style={[rowStyles.badge, { backgroundColor: badge.bg }]}
              accessibilityRole="button"
              accessibilityLabel={`Corregir acorde — ${badge.label}`}
              hitSlop={6}
            >
              <Text style={[rowStyles.badgeLabel, { color: badge.color }]}>
                {badge.label}
              </Text>
            </Pressable>
          )}
        </View>
        {display.degree && (
          <Text style={rowStyles.degree}>{display.degree}</Text>
        )}
      </View>
      <View style={rowStyles.diagramBox}>
        {shape ? (
          <ChordDiagramSvg shape={shape} variant="mini" />
        ) : (
          <Text style={rowStyles.unknownDiagram}>—</Text>
        )}
      </View>
    </Pressable>
  );
}

export function ResultsScreen({ route, navigation }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult>(route.params.analysis);
  const [tab, setTab] = useState<Tab>("chords");
  const [helpEntry, setHelpEntry] = useState<HelpEntry | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // When coming back from ChordDetail, re-read storage so corrections made
  // there show up here. The analysis is already persisted right after
  // /v1/analyze so this should always find a match.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getAnalysisById(analysis.analysis_id).then((fresh) => {
        if (alive && fresh) setAnalysis(fresh);
      });
      return () => { alive = false; };
    }, [analysis.analysis_id]),
  );

  const modeLabel = analysis.key.mode === "major" ? "mayor" : "menor";
  const capo = analysis.suggested_capo.fret;
  // Recompute the progression fingerprint every render so user corrections
  // show up immediately and the pill stays in sync with the chord list.
  const progressionLabel = useMemo(
    () => computeProgressionLabel(analysis.chords, analysis.key),
    [analysis.chords, analysis.key],
  );
  const editingChord =
    editingIdx !== null
      ? analysis.chords.find((c) => c.idx === editingIdx) ?? null
      : null;

  const applyCorrection = useCallback(
    async (chordIdx: number, newName: string, newShapeId: string) => {
      const degree = degreeOf(newName, analysis.key);
      const correction = {
        simplified: { name: newName, shape_id: newShapeId },
        degree,
        corrected_at: Date.now(),
      };
      setAnalysis((prev) => ({
        ...prev,
        chords: prev.chords.map((c) =>
          c.idx === chordIdx ? { ...c, user_correction: correction } : c,
        ),
      }));
      await updateAnalysisChord(analysis.analysis_id, chordIdx, correction);
    },
    [analysis.analysis_id, analysis.key],
  );

  const resetCorrection = useCallback(
    async (chordIdx: number) => {
      setAnalysis((prev) => ({
        ...prev,
        chords: prev.chords.map((c) =>
          c.idx === chordIdx ? { ...c, user_correction: null } : c,
        ),
      }));
      await updateAnalysisChord(analysis.analysis_id, chordIdx, null);
    },
    [analysis.analysis_id],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Progresión</Text>
          <Pressable
            onPress={() => setHelpEntry(HELP.tonality)}
            accessibilityRole="button"
            style={styles.titleRomanPress}
          >
            <Text style={styles.titleRoman} numberOfLines={1}>
              {analysis.key.root} {modeLabel}
            </Text>
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <Pressable
            onPress={() => setHelpEntry(HELP.tonality)}
            style={styles.metaPill}
            accessibilityRole="button"
          >
            <Text style={styles.metaPillLabel}>
              {analysis.key.root} {modeLabel}
            </Text>
          </Pressable>
          {progressionLabel.length > 0 && (
            <Pressable
              onPress={() => setHelpEntry(HELP.progression)}
              style={styles.metaPill}
              accessibilityRole="button"
            >
              <Text style={styles.metaPillLabel}>{progressionLabel}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.capoRow}>
          <Text style={styles.capoLine}>
            {capo === 0
              ? analysis.suggested_capo.reason
              : `¿Más fácil? ${analysis.suggested_capo.reason}`}
          </Text>
          <InfoDot
            onPress={() => setHelpEntry(HELP.capo)}
            accessibilityLabel="Qué es un capo"
          />
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("chords")}
          style={[styles.tab, tab === "chords" && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === "chords" && styles.tabLabelActive]}>
            Acordes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("lyrics")}
          style={[styles.tab, tab === "lyrics" && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === "lyrics" && styles.tabLabelActive]}>
            Letra
          </Text>
        </Pressable>
      </View>

      {tab === "chords" ? (
        <FlatList
          data={analysis.chords}
          keyExtractor={(c) => String(c.idx)}
          renderItem={({ item }) => (
            <ChordRow
              chord={item}
              onPress={() =>
                navigation.navigate("ChordDetail", {
                  analysisId: analysis.analysis_id,
                  chord: item,
                  progression: analysis.chords,
                  keyInfo: analysis.key,
                })
              }
              onEditPress={() => setEditingIdx(item.idx)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      ) : (
        <View style={styles.emptyLyrics}>
          <Text style={styles.emptyTitle}>Letra — próximamente</Text>
          <Text style={styles.emptyHint}>
            Todavía no mostramos letras. Pronto podrás pegarlas para seguir la
            canción mientras tocas.
          </Text>
        </View>
      )}

      {tab === "chords" && (
        <View style={styles.footerHintRow}>
          <Text style={styles.footerHint}>
            Toca la etiqueta amarilla o gris para corregir el acorde. Los
            marcados son los que más vale la pena comprobar a oído.
          </Text>
          <InfoDot
            onPress={() => setHelpEntry(HELP.confidence)}
            accessibilityLabel="Qué significan las etiquetas"
          />
        </View>
      )}

      <Pressable style={styles.cta} onPress={() => navigation.popToTop()}>
        <Text style={styles.ctaLabel}>Rifate otra</Text>
      </Pressable>

      <HelpBottomSheet
        visible={helpEntry !== null}
        entry={helpEntry}
        onClose={() => setHelpEntry(null)}
      />

      <ChordPickerSheet
        visible={editingChord !== null}
        currentName={editingChord ? displayOf(editingChord).name : ""}
        detectedName={editingChord ? editingChord.simplified.name : ""}
        detectedFullName={editingChord ? editingChord.detected.name : ""}
        suggestions={
          editingChord
            ? suggestAlternatives(
                editingChord.simplified.name,
                editingChord.detected.name,
                analysis.key,
              )
            : []
        }
        hasCorrection={Boolean(editingChord?.user_correction)}
        onPick={async (name, shapeId) => {
          if (editingChord) {
            await applyCorrection(editingChord.idx, name, shapeId);
          }
          setEditingIdx(null);
        }}
        onReset={async () => {
          if (editingChord) {
            await resetCorrection(editingChord.idx);
          }
          setEditingIdx(null);
        }}
        onClose={() => setEditingIdx(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, gap: spacing.sm },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: { ...typography.h1, color: colors.text },
  titleRomanPress: { flexShrink: 1 },
  titleRoman: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  metaPillLabel: { ...typography.caption, color: colors.primarySoft, fontWeight: "700" },
  capoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  capoLine: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.primary },
  tabLabel: { ...typography.body, color: colors.textMuted },
  tabLabelActive: { color: colors.text, fontWeight: "600" },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  sep: { height: 1, backgroundColor: colors.border },

  emptyLyrics: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.text },
  emptyHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },

  footerHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },
  cta: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
  },
  ctaLabel: {
    fontFamily: BRAND_FONT,
    fontSize: 24,
    color: colors.text,
    letterSpacing: 1.5,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowPressed: { opacity: 0.6 },
  time: { ...typography.caption, color: colors.textMuted, width: 48 },
  nameWrap: { flex: 1, gap: 2 },
  nameTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { ...typography.h2, color: colors.text },
  richSuffix: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  degree: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeLabel: { fontSize: 11, fontWeight: "600" },
  correctedMark: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  correctedMarkLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primarySoft,
  },
  diagramBox: {
    width: 40,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  unknownDiagram: { color: colors.textMuted },
});
