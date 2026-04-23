import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../../theme/tokens";

interface Props {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function InfoDot({ onPress, accessibilityLabel = "Más información" }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.dot}
    >
      <Text style={styles.label}>?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "700",
    lineHeight: 12,
  },
});
