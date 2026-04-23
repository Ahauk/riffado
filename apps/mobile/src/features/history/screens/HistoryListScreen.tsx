import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { timeAgo } from "../../../utils/time";
import { useHistory } from "../hooks/useHistory";
import { HistoryItem } from "../storage";

interface HistoryRowProps {
  item: HistoryItem;
  onPress: () => void;
}

function HistoryRow({ item, onPress }: HistoryRowProps) {
  const a = item.analysis;
  const uniqueChords = Array.from(
    new Set(a.chords.map((c) => c.simplified.name))
  );
  const modeLabel = a.key.mode === "major" ? "mayor" : "menor";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.pressed]}
      accessibilityRole="button"
    >
      <View style={rowStyles.topRow}>
        <Text style={rowStyles.key}>
          {a.key.root} {modeLabel}
        </Text>
        <Text style={rowStyles.meta}>{timeAgo(item.saved_at)}</Text>
      </View>
      <Text style={rowStyles.chords} numberOfLines={1}>
        {uniqueChords.join("  ·  ")}
      </Text>
      {a.progression_roman && (
        <Text style={rowStyles.progression} numberOfLines={1}>
          {a.progression_roman}
        </Text>
      )}
    </Pressable>
  );
}

export function HistoryListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, refresh } = useHistory();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Todavía no te haz rifado una rola</Text>
          <Text style={styles.emptyHint}>
            Toca el botón de abajo y saca tu primera canción.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => (
            <HistoryRow
              item={item}
              onPress={() =>
                navigation.navigate("Results", { analysis: item.analysis })
              }
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h1, color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sep: { height: spacing.sm },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  emptyHint: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});

const rowStyles = StyleSheet.create({
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  pressed: { opacity: 0.7 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  key: { ...typography.body, color: colors.text, fontWeight: "700" },
  meta: { ...typography.caption, color: colors.textMuted },
  chords: { ...typography.body, color: colors.text },
  progression: { ...typography.caption, color: colors.primarySoft, fontWeight: "600" },
});
