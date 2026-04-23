import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { ChordSegment } from "../../../types/api";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ChordRow({ chord }: { chord: ChordSegment }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.time}>{formatTime(chord.start_sec)}</Text>
      <Text style={rowStyles.name}>{chord.simplified.name}</Text>
      <Text style={rowStyles.confidence}>{Math.round(chord.confidence * 100)}%</Text>
    </View>
  );
}

export function ResultsScreen({ route, navigation }: Props) {
  const { analysis } = route.params;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Progresión</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            Tonalidad: {analysis.key.root} {analysis.key.mode === "major" ? "mayor" : "menor"}
          </Text>
          <Text style={styles.meta}>Capo: {analysis.suggested_capo.fret}</Text>
        </View>
      </View>

      <FlatList
        data={analysis.chords}
        keyExtractor={(c) => String(c.idx)}
        renderItem={({ item }) => <ChordRow chord={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />

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
  metaRow: { flexDirection: "row", gap: spacing.md },
  meta: { ...typography.caption, color: colors.textMuted },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sep: { height: 1, backgroundColor: colors.border },
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
  time: { ...typography.caption, color: colors.textMuted, width: 48 },
  name: { ...typography.h2, color: colors.text, flex: 1 },
  confidence: { ...typography.caption, color: colors.success },
});
