import { StyleSheet, Text, View } from "react-native";

import { homeType, spacing, mascotSize } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { MascotAnim } from "@/components/ui/MascotAnim";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Boş durum: kitap okuyan animasyonlu maskot, kalın başlık, gri açıklama ve isteğe bağlı eylem. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <MascotAnim name="books" width={mascotSize.empty} />
      <Text style={[homeType.sectionTitle, styles.title, { color: theme.text.primary }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[homeType.cardSub, styles.description, { color: theme.text.secondary }]}>
          {description}
        </Text>
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
