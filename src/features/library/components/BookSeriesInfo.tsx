import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailMetrics, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";

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

  return (
    <View style={styles.container}>
      <UiIcon name="books" size={homeMetrics.rowIcon} />
      <View style={styles.texts}>
        <Text style={[homeType.statLabel, { color: detailColors.title }]}>
          {t("bookDetail.series.position", { index: series.currentIndex + 1 })} —{" "}
          {t(series.collectionTitleKey)}
        </Text>
        {series.nextBook ? (
          <Pressable
            onPress={() =>
              onPressNextBook((series.nextBook as NonNullable<typeof series.nextBook>).id)
            }
            accessibilityRole="link"
            hitSlop={homeSpace.sm}
          >
            <Text style={[homeType.statLabel, { color: detailColors.amberDeep }]}>
              {t("bookDetail.series.nextBook", { title: series.nextBook.title })}
            </Text>
          </Pressable>
        ) : (
          <Text style={[homeType.cardSub, { color: detailColors.muted }]}>
            {t("bookDetail.series.lastBook")}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    marginHorizontal: detailMetrics.gutter,
    marginTop: homeSpace.lg,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.peach,
  },
  texts: {
    flex: 1,
    gap: homeSpace.xs,
  },
});
