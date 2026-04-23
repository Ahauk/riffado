import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChordDiagramSvg } from "../../chords/components/ChordDiagramSvg";
import { findShape } from "../../chords/data/chordShapes";
import { RootStackParamList } from "../../../navigation/types";
import { ChordSegment } from "../../../types/api";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

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
}

function ChordRow({ chord, onPress }: ChordRowProps) {
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
        <Text style={rowStyles.name}>{chord.simplified.name}</Text>
        {badge && (
          <View style={[rowStyles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[rowStyles.badgeLabel, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
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

  const modeLabel = analysis.key.mode === "major" ? "mayor" : "menor";
  const capo = analysis.suggested_capo.fret;
  const capoLabel = capo === 0 ? "sin capo" : `capo ${capo}`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Progresión</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>
              {analysis.key.root} {modeLabel}
            </Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>{capoLabel}</Text>
          </View>
        </View>
        {capo > 0 && (
          <Text style={styles.capoReason}>{analysis.suggested_capo.reason}</Text>
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
        <Text style={styles.ctaLabel}>Rifar otra</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.h1, color: colors.text },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  metaPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  metaPillLabel: { ...typography.caption, color: colors.text, fontWeight: "600" },
  capoReason: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },

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
  ctaLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
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
  nameWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { ...typography.h2, color: colors.text },
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
