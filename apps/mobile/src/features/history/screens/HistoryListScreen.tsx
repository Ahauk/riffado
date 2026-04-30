import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useRef } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { colors, radius, spacing, typography } from "../../../theme/tokens";
import { displayChord, displayKey } from "../../../utils/notation";
import { timeAgo } from "../../../utils/time";
import { useNotation } from "../../settings/NotationContext";
import { useHistory } from "../hooks/useHistory";
import { HistoryItem } from "../storage";

interface HistoryRowProps {
  item: HistoryItem;
  onPress: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

interface DeleteActionProps {
  progress: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
}

/** Red "Borrar" action that slides in from the right as the row is swiped. */
function DeleteAction({ progress, onPress }: DeleteActionProps) {
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
    extrapolate: "clamp",
  });
  return (
    <Animated.View
      style={[rowStyles.deleteAction, { transform: [{ translateX }] }]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Borrar del historial"
        style={rowStyles.deleteBtn}
      >
        <Text style={rowStyles.deleteLabel}>Borrar</Text>
      </Pressable>
    </Animated.View>
  );
}

function HistoryRow({ item, onPress, onDelete, onRename }: HistoryRowProps) {
  const { notation } = useNotation();
  const a = item.analysis;
  const uniqueChords = Array.from(
    new Set(a.chords.map((c) => displayChord(c.simplified.name, notation).primary))
  );
  const keyLabel = displayKey(a.key.root, a.key.mode, notation).primary;
  const title = item.custom_title?.trim() || keyLabel;
  const showSubtitle = Boolean(item.custom_title?.trim());
  const swipeRef = useRef<Swipeable>(null);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "Borrar análisis",
      `¿Seguro que quieres borrar este análisis de ${keyLabel}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => swipeRef.current?.close(),
        },
        { text: "Borrar", style: "destructive", onPress: onDelete },
      ],
    );
  }, [keyLabel, onDelete]);

  const promptRename = useCallback(() => {
    Alert.prompt(
      "Renombrar análisis",
      "Dale un nombre para encontrarlo más fácil (ej. Let It Be – verso).",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar nombre",
          style: "destructive",
          onPress: () => onRename(""),
        },
        {
          text: "Guardar",
          onPress: (text?: string) => {
            if (text != null) onRename(text);
          },
        },
      ],
      "plain-text",
      item.custom_title ?? "",
    );
  }, [item.custom_title, onRename]);

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={(progress) => (
        <DeleteAction progress={progress} onPress={confirmDelete} />
      )}
      rightThreshold={40}
      overshootRight={false}
    >
      <Pressable
        onPress={onPress}
        onLongPress={promptRename}
        delayLongPress={350}
        style={({ pressed }) => [rowStyles.row, pressed && rowStyles.pressed]}
        accessibilityRole="button"
        accessibilityHint="Mantén presionado para renombrar"
      >
        <View style={rowStyles.topRow}>
          <Text style={rowStyles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={rowStyles.meta}>{timeAgo(item.saved_at)}</Text>
        </View>
        {showSubtitle && (
          <Text style={rowStyles.subtitle} numberOfLines={1}>
            {keyLabel}
          </Text>
        )}
        <Text style={rowStyles.chords} numberOfLines={1}>
          {uniqueChords.join("  ·  ")}
        </Text>
        {a.progression_roman && (
          <Text style={rowStyles.progression} numberOfLines={1}>
            {a.progression_roman}
          </Text>
        )}
      </Pressable>
    </Swipeable>
  );
}

export function HistoryListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, refresh, remove, rename } = useHistory();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        {items.length > 0 && (
          <Text style={styles.hint}>
            Mantén presionado un análisis para renombrarlo.
          </Text>
        )}
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
              onDelete={() => void remove(item.id)}
              onRename={(title) => void rename(item.id, title)}
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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
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
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  subtitle: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
  meta: { ...typography.caption, color: colors.textMuted },
  chords: { ...typography.body, color: colors.text },
  progression: { ...typography.caption, color: colors.primarySoft, fontWeight: "600" },

  deleteAction: {
    justifyContent: "center",
    paddingLeft: spacing.sm,
  },
  deleteBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: "100%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
});
