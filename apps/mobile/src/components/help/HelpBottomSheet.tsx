import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "../../theme/tokens";
import { HelpEntry } from "./helpContent";

interface Props {
  visible: boolean;
  entry: HelpEntry | null;
  onClose: () => void;
}

export function HelpBottomSheet({ visible, entry, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button">
        <View />
      </Pressable>
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <View style={styles.handle} />
        {entry && (
          <View style={styles.content}>
            <Text style={styles.title}>{entry.title}</Text>
            {entry.body.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
              <Text style={styles.closeLabel}>Entendido</Text>
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  content: { gap: spacing.md, paddingBottom: spacing.md },
  title: { ...typography.h2, color: colors.text },
  paragraph: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  close: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  closeLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
});
