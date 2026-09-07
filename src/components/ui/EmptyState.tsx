import { StyleSheet, Text, View } from "react-native";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Token fix for the new Fraunces/Literata/Plex Mono system: the old
 * `type.heading`/`type.body` (a generic sans scale) no longer exist —
 * `type` is now Fraunces-only display sizes and small UI text lives in
 * `monoType`. Title now uses `type.sectionHeading` (Fraunces, matches the
 * weight/role every mockup uses for a section-level heading); description
 * uses `monoType.rowText` (13px mono body), consistent with how the
 * mockups render any non-reading-surface paragraph text.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[type.sectionHeading, styles.title, { color: theme.text.primary }]}>{title}</Text>
      {description ? (
        <Text style={[monoType.rowText, styles.description, { color: theme.text.secondary }]}>{description}</Text>
      ) : null}
      {action}
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
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
  },
});
