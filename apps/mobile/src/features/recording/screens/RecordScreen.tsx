import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../navigation/types";
import { colors, radius, spacing, typography } from "../../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Record">;

export function RecordScreen({ navigation }: Props) {
  const onPressRifar = () => {
    // TODO: iniciar grabación real. Por ahora navegamos con un URI vacío
    // para ejercitar el flujo de pantallas.
    navigation.navigate("Analyzing", { audioUri: "" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Riffado</Text>
          <Text style={styles.subtitle}>¿Cómo sacaste esa canción?</Text>
        </View>

        <View style={styles.center}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rifar esta canción"
            onPress={onPressRifar}
            style={({ pressed }) => [
              styles.recordButton,
              pressed && styles.recordButtonPressed,
            ]}
          >
            <Text style={styles.recordLabel}>Rifar</Text>
          </Pressable>
          <Text style={styles.hint}>Toca y escucha 10-15 s de la canción</Text>
        </View>

        <View style={styles.footer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  header: { paddingTop: spacing.xl, alignItems: "center", gap: spacing.xs },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  center: { alignItems: "center", gap: spacing.lg },
  recordButton: {
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  recordButtonPressed: { backgroundColor: colors.primaryMuted, transform: [{ scale: 0.98 }] },
  recordLabel: { ...typography.h2, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted },
  footer: { height: spacing.xl },
});
