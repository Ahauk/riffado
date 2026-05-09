import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, spacing, typography } from "../../../theme/tokens";

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  /** Last row in a group: skip the bottom hairline so it doesn't double up. */
  last?: boolean;
}

export function SwitchRow({ label, hint, value, onChange, last }: Props) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.surfaceAlt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  text: { flex: 1, gap: 2 },
  label: { ...typography.body, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 16 },
});
