import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Token fix for the new type system — see EmptyState.tsx for the same
 * `type.heading`/`type.body` -> `type.sectionHeading`/`monoType.rowText`
 * rationale. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[type.sectionHeading, { color: theme.danger }]}>{t("common.errorTitle")}</Text>
      <Text style={[monoType.rowText, styles.message, { color: theme.text.secondary }]}>{message}</Text>
      {onRetry ? <Button label={t("common.retry")} onPress={onRetry} variant="secondary" size="sm" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  message: {
    textAlign: "center",
  },
});
