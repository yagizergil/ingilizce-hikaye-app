import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface LoadingStateProps {
  message?: string;
}

/** Token fix: `type.bodySmall` no longer exists — `monoType.rowText` is the
 * closest equivalent small body text in the new mono-carries-all-UI-text
 * system (see typography.ts header comment). */
export function LoadingState({ message }: LoadingStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.accent} />
      {message ? <Text style={[monoType.rowText, { color: theme.text.secondary }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
});
