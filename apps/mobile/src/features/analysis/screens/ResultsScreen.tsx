import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HelpBottomSheet } from "../../../components/help/HelpBottomSheet";
import { InfoDot } from "../../../components/help/InfoDot";
import { HELP, HelpEntry } from "../../../components/help/helpContent";
import { ChordDiagramSvg } from "../../chords/components/ChordDiagramSvg";
import { findShape } from "../../chords/data/chordShapes";
import { RootStackParamList } from "../../../navigation/types";
import { ChordSegment } from "../../../types/api";
import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

type Tab = "chords" | "lyrics";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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
  onBadgePress: () => void;
}

function ChordRow({ chord, onPress, onBadgePress }: ChordRowProps) {
  const shape =
    findShape(chord.simplified.shape_id) ?? findShape(chord.simplified.name);
  const badge = confidenceBadge(chord.confidence);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver diagrama de ${chord.simplified.name}`}
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.rowPressed]}
    >
      <Text style={rowStyles.time}>{formatTime(chord.start_sec)}</Text>
      <View style={rowStyles.nameWrap}>
        <View style={rowStyles.nameTopRow}>
          <Text style={rowStyles.name}>{chord.simplified.name}</Text>
          {badge && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onBadgePress(); }}
              style={[rowStyles.badge, { backgroundColor: badge.bg }]}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={[rowStyles.badgeLabel, { color: badge.color }]}>
                {badge.label}
              </Text>
            </Pressable>
          )}
        </View>
        {chord.degree && (
          <Text style={rowStyles.degree}>{chord.degree}</Text>
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
  const { analysis } = route.params;
  const [tab, setTab] = useState<Tab>("chords");
  const [helpEntry, setHelpEntry] = useState<HelpEntry | null>(null);

  const modeLabel = analysis.key.mode === "major" ? "mayor" : "menor";
  const capo = analysis.suggested_capo.fret;

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
            <Text style={styles.metaPillHint}> ?</Text>
          </Pressable>
          {analysis.progression_roman && (
            <Pressable
              onPress={() => setHelpEntry(HELP.progression)}
              style={styles.metaPill}
              accessibilityRole="button"
            >
              <Text style={styles.metaPillLabel}>{analysis.progression_roman}</Text>
              <Text style={styles.metaPillHint}> ?</Text>
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
                  chord: item,
                  progression: analysis.chords,
                })
              }
              onBadgePress={() => setHelpEntry(HELP.confidence)}
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
        <Text style={styles.footerHint}>
          Toca cualquier acorde para ver su diagrama. Los marcados como
          “revísalo” o “puede ser otro” son los que más vale la pena
          comprobar a oído.
        </Text>
      )}

      <Pressable style={styles.cta} onPress={() => navigation.popToTop()}>
        <Text style={styles.ctaLabel}>Rifate otra</Text>
      </Pressable>

      <HelpBottomSheet
        visible={helpEntry !== null}
        entry={helpEntry}
        onClose={() => setHelpEntry(null)}
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
  metaPillHint: { ...typography.caption, color: colors.primarySoft, fontWeight: "700", opacity: 0.7 },
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

  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    lineHeight: 18,
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
  diagramBox: {
    width: 40,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  unknownDiagram: { color: colors.textMuted },
});
