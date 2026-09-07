import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { StatCell } from "@/components/ui";

interface FavoritesReadCardProps {
  favoritesCount: number;
  readCount: number;
  onPress: () => void;
}

/**
 * Single bottom-of-home card (not a shelf) summarizing favorited and
 * "read" book counts, navigating to app/favorites.tsx on tap.
 */
export function FavoritesReadCard({ favoritesCount, readCount, onPress }: FavoritesReadCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.card, { borderColor: theme.border.hairline }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("home.favoritesRead.accessibilityLabel", { favoritesCount, readCount })}
    >
      <Text style={[type.sectionHeading, styles.title, { color: theme.text.primary }]}>
        {t("home.favoritesRead.title")}
      </Text>
      <View style={styles.stats}>
        <StatCell value={String(favoritesCount)} label={t("home.favoritesRead.favoritesLabel")} />
        <StatCell value={String(readCount)} label={t("home.favoritesRead.readLabel")} />
      </View>
      <Text style={[monoType.moreLink, { color: theme.text.secondary }]}>{t("home.shelves.more")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xxxxl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  title: {
    marginBottom: spacing.xxs,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.xl,
  },
});
