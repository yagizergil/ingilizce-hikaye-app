import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { BookSeriesData } from "@/features/library/api/useBookSeriesQuery";

interface BookSeriesInfoProps {
  series: BookSeriesData;
  onPressNextBook: (bookId: string) => void;
}

/**
 * book-detail series block: "Bu serinin N. kitabı" (mono, matching
 * `monoType.meta` — the same running-metadata style book-detail/home use
 * for non-label mono text) plus either a "Sonraki kitap: ..." link to the
 * next book in the series, or — if this is the last book — a quiet
 * completion note instead of a dead link.
 */
export function BookSeriesInfo({ series, onPressNextBook }: BookSeriesInfoProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[monoType.meta, { color: theme.text.secondary }]}>
        {t("bookDetail.series.position", { index: series.currentIndex + 1 })} — {t(series.collectionTitleKey)}
      </Text>
      {series.nextBook ? (
        <Pressable
          onPress={() => onPressNextBook((series.nextBook as NonNullable<typeof series.nextBook>).id)}
          accessibilityRole="link"
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Text style={[monoType.meta, styles.nextBook, { color: theme.accent }]}>
            {t("bookDetail.series.nextBook", { title: series.nextBook.title })}
          </Text>
        </Pressable>
      ) : (
        <Text style={[monoType.meta, styles.nextBook, { color: theme.text.secondary }]}>
          {t("bookDetail.series.lastBook")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xxs,
  },
  nextBook: {
    marginTop: spacing.xxs,
  },
});
