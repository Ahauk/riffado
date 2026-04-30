import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { HelpBottomSheet } from "../../../components/help/HelpBottomSheet";
import { InfoDot } from "../../../components/help/InfoDot";
import { HELP, HelpEntry } from "../../../components/help/helpContent";
import { ChordDiagramSvg } from "../../chords/components/ChordDiagramSvg";
import { ChordPickerSheet } from "../../chords/components/ChordPickerSheet";
import { findShape } from "../../chords/data/chordShapes";
import {
  getHistoryItemById,
  renameAnalysis,
  setLyrics,
  updateAnalysisChord,
} from "../../history/storage";
import { RootStackParamList } from "../../../navigation/types";
import { AnalysisResult, ChordSegment } from "../../../types/api";
import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";
import { suggestAlternatives } from "../../../utils/chordSuggestions";
import { computeProgressionLabel, degreeOf } from "../../../utils/roman";
import { AudioPlayerBar } from "../components/AudioPlayerBar";
import { ShareableCard } from "../components/ShareableCard";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

type Tab = "chords" | "lyrics";

const LYRICS_ACCESSORY_ID = "riffado-lyrics-accessory";

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
  active: boolean;
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

function ChordRow({ chord, active, onPress, onEditPress }: ChordRowProps) {
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
      accessibilityState={active ? { selected: true } : undefined}
      style={({ pressed }) => [
        rowStyles.row,
        active && rowStyles.rowActive,
        pressed && rowStyles.rowPressed,
      ]}
    >
      <Text style={[rowStyles.time, active && rowStyles.timeActive]}>
        {formatTime(chord.start_sec)}
      </Text>
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
  const [customTitle, setCustomTitle] = useState<string | undefined>();
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const [lyrics, setLyricsState] = useState<string>("");
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);
  const listRef = useRef<FlatList<ChordSegment>>(null);

  // Audio playback lives at the screen level so its `currentTime` can drive
  // both the player bar AND the chord-row highlight. updateInterval=100ms
  // gives a smooth-enough scroll without burning much CPU.
  const player = useAudioPlayer(audioUri ?? null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  // When coming back from ChordDetail, re-read storage so corrections made
  // there show up here. The analysis is already persisted right after
  // /v1/analyze so this should always find a match. We also pull the
  // custom_title and audio_uri from the same record.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getHistoryItemById(analysis.analysis_id).then((item) => {
        if (!alive || !item) return;
        setAnalysis(item.analysis);
        setCustomTitle(item.custom_title);
        setAudioUri(item.audio_uri);
        setLyricsState(item.lyrics ?? "");
      });
      return () => { alive = false; };
    }, [analysis.analysis_id]),
  );

  const modeLabel = analysis.key.mode === "major" ? "mayor" : "menor";
  const keyLabel = `${analysis.key.root} ${modeLabel}`;
  const capo = analysis.suggested_capo.fret;
  const headerTitle = customTitle?.trim() || "Progresión";
  // Recompute the progression fingerprint every render so user corrections
  // show up immediately and the pill stays in sync with the chord list.
  const progressionLabel = useMemo(
    () => computeProgressionLabel(analysis.chords, analysis.key),
    [analysis.chords, analysis.key],
  );

  // The chord whose [start_sec, end_sec) contains the current playback time.
  // null before the first chord, or when there is no audio. Stays put when
  // paused so the user keeps a visual anchor on the row they were practising.
  const activeChordIdx = useMemo(() => {
    if (!audioUri) return null;
    const t = status.currentTime ?? 0;
    if (t <= 0) return null;
    for (const c of analysis.chords) {
      if (t >= c.start_sec && t < c.end_sec) return c.idx;
    }
    return null;
  }, [audioUri, status.currentTime, analysis.chords]);

  // Auto-scroll the active chord into view while playing. We skip when paused
  // so the user can scroll manually without being yanked back. scrollToIndex
  // can fail for far-off rows; the failure handler retries with a best-effort
  // offset estimate.
  useEffect(() => {
    if (activeChordIdx === null) return;
    if (!status.playing) return;
    if (tab !== "chords") return;
    const arrayIdx = analysis.chords.findIndex((c) => c.idx === activeChordIdx);
    if (arrayIdx < 0) return;
    listRef.current?.scrollToIndex({
      index: arrayIdx,
      animated: true,
      viewPosition: 0.5,
    });
  }, [activeChordIdx, status.playing, tab, analysis.chords]);

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

  const promptRename = useCallback(() => {
    Alert.prompt(
      "Renombrar análisis",
      "Dale un nombre para encontrarlo más fácil (ej. Let It Be – verso).",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar nombre",
          style: "destructive",
          onPress: async () => {
            await renameAnalysis(analysis.analysis_id, "");
            setCustomTitle(undefined);
          },
        },
        {
          text: "Guardar",
          onPress: async (text?: string) => {
            if (text == null) return;
            await renameAnalysis(analysis.analysis_id, text);
            setCustomTitle(text.trim() || undefined);
          },
        },
      ],
      "plain-text",
      customTitle ?? "",
    );
  }, [analysis.analysis_id, customTitle]);

  const handleLyricsBlur = useCallback(() => {
    void setLyrics(analysis.analysis_id, lyrics);
  }, [analysis.analysis_id, lyrics]);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Wait one frame so the off-screen ShareableCard is mounted before capture.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Compartir no disponible", "Tu dispositivo no soporta compartir desde la app.");
        return;
      }
      const uri = await captureRef(shareRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Compartir tu rola",
      });
    } catch (e) {
      console.warn("share failed", e);
      Alert.alert("No pudimos compartir", "Intenta de nuevo en un momento.");
    } finally {
      setSharing(false);
    }
  }, [sharing]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={promptRename}
            accessibilityRole="button"
            accessibilityLabel="Renombrar análisis"
            hitSlop={8}
            style={styles.titlePress}
          >
            <Text style={styles.title} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.editGlyph}>✎</Text>
          </Pressable>
          <Pressable
            onPress={() => setHelpEntry(HELP.tonality)}
            accessibilityRole="button"
            style={styles.titleRomanPress}
          >
            <Text style={styles.titleRoman} numberOfLines={1}>
              {keyLabel}
            </Text>
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <Pressable
            onPress={() => setHelpEntry(HELP.tonality)}
            style={styles.metaPill}
            accessibilityRole="button"
          >
            <Text style={styles.metaPillLabel}>{keyLabel}</Text>
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
        <View style={styles.shareRow}>
          <Pressable
            onPress={handleShare}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Compartir progresión como imagen"
            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
            hitSlop={6}
          >
            <Text style={styles.shareGlyph}>↗</Text>
            <Text style={styles.shareLabel}>{sharing ? "..." : "Compartir"}</Text>
          </Pressable>
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
        {audioUri && (
          <View style={styles.playerWrap}>
            <AudioPlayerBar player={player} status={status} />
          </View>
        )}
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
          ref={listRef}
          data={analysis.chords}
          extraData={activeChordIdx}
          keyExtractor={(c) => String(c.idx)}
          renderItem={({ item }) => (
            <ChordRow
              chord={item}
              active={item.idx === activeChordIdx}
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
          onScrollToIndexFailed={(info) => {
            // FlatList sometimes fails when the target row hasn't been
            // measured yet (e.g. far down the list). Retry with a best-effort
            // estimate after layout settles.
            const wait = new Promise((r) => setTimeout(r, 80));
            void wait.then(() => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            });
          }}
        />
      ) : (
        <View style={styles.lyricsWrap}>
          <TextInput
            value={lyrics}
            onChangeText={setLyricsState}
            onBlur={handleLyricsBlur}
            multiline
            scrollEnabled
            textAlignVertical="top"
            placeholder="Pega aquí la letra de tu rola para tenerla a la mano mientras tocas…"
            placeholderTextColor={colors.textMuted}
            style={styles.lyricsInput}
            accessibilityLabel="Letra de la canción"
            inputAccessoryViewID={
              Platform.OS === "ios" ? LYRICS_ACCESSORY_ID : undefined
            }
          />
        </View>
      )}

      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={LYRICS_ACCESSORY_ID}>
          <View style={styles.lyricsAccessory}>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar teclado"
            >
              <Text style={styles.lyricsAccessoryDone}>Listo</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
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

      {/* Off-screen card used by react-native-view-shot to capture the
          shareable PNG. Lives behind the rest of the screen and never
          receives touches. */}
      <View pointerEvents="none" style={styles.shareStage}>
        <ShareableCard
          ref={shareRef}
          analysis={analysis}
          progressionLabel={progressionLabel}
          customTitle={customTitle}
        />
      </View>
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
  titlePress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  title: { ...typography.h1, color: colors.text, flexShrink: 1 },
  editGlyph: { color: colors.textMuted, fontSize: 18 },
  titleRomanPress: { flexShrink: 0 },
  titleRoman: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
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
  shareRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareBtnDisabled: { opacity: 0.5 },
  shareGlyph: { color: colors.text, fontSize: 14, fontWeight: "700" },
  shareLabel: { ...typography.caption, color: colors.text, fontWeight: "700" },
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
  playerWrap: { marginTop: spacing.sm },

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

  lyricsWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  lyricsInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  lyricsAccessory: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  lyricsAccessoryDone: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
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

  shareStage: {
    position: "absolute",
    left: -2000,
    top: 0,
    opacity: 0,
  },
});

const ACTIVE_BORDER = 3;

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
    // Reserve the active border slot so non-active rows don't shift when
    // a sibling becomes active.
    borderLeftWidth: ACTIVE_BORDER,
    borderLeftColor: "transparent",
    borderRadius: radius.sm,
  },
  rowActive: {
    backgroundColor: colors.primaryTint,
    borderLeftColor: colors.primary,
  },
  rowPressed: { opacity: 0.6 },
  time: { ...typography.caption, color: colors.textMuted, width: 48 },
  timeActive: { color: colors.primarySoft, fontWeight: "700" },
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
