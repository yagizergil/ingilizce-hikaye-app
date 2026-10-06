import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
} from "@/theme";
import { UiIcon } from "@/components/ui";
import { useBookWordOverlapQuery } from "@/features/library/api/useBookWordOverlapQuery";

interface BookWordOverlapProps {
  bookId: string;
}

/** "Kelime defterindeki N kelime bu kitapta geçiyor" -- sıfırsa hiç görünmez. */
export function BookWordOverlap({ bookId }: BookWordOverlapProps) {
  const { t } = useTranslation();
  const { data } = useBookWordOverlapQuery(bookId);

  if (!data || data.count === 0) return null;

  return (
    <View style={styles.container}>
      <UiIcon name="bookmark" size={homeMetrics.rowIcon} />
      <View style={styles.text}>
        <Text style={[detailType.statLabel, { color: detailColors.title }]}>
          {t("bookDetail.wordOverlap", { count: data.count })}
        </Text>
        {data.sample.length > 0 ? (
          <Text style={[homeType.cardSub, { color: detailColors.muted }]} numberOfLines={1}>
            {data.sample.join(" · ")}
          </Text>
        ) : null}
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
    backgroundColor: homeColors.card,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  text: {
    flex: 1,
    gap: homeSpace.xs,
  },
});
