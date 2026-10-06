import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { homeColors, homeMetrics, homeSpace, homeType, detailColors, detailType } from "@/theme";
import { BookCover3D, PressableScale } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { Book } from "@/features/library/types";

interface ContinueReadingCardProps {
  book: Book;
  /** Kitabın tamamındaki ilerleme, 0-100. */
  progressPercent: number;
  onPress: (book: Book) => void;
}

/**
 * Ana sayfanın "Kaldığın yer" kartı: sol kapak, sağda başlık, yazar,
 * ilerleme çubuğu ve amber "Devam et" hapı. Kartın tamamı dokunulabilir.
 */
export function ContinueReadingCard({ book, progressPercent, onPress }: ContinueReadingCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const percent = Math.min(100, Math.max(0, Math.round(progressPercent)));

  return (
    <PressableScale
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={t("home.continue.accessibility", { title: book.title, percent })}
      style={[styles.card, { backgroundColor: palette.card }]}
    >
      <BookCover3D
        uri={book.coverUrl}
        width={homeMetrics.continueCover}
        height={Math.round(homeMetrics.continueCover * 1.5)}
      />
      <View style={styles.body}>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>{t("home.continue.title")}</Text>
        <Text style={[homeType.bookTitle, styles.title, { color: palette.ink }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[homeType.bookAuthor, { color: palette.muted }]} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={[homeType.statLabel, { color: palette.muted }]}>
            {t("home.continue.percent", { percent })}
          </Text>
        </View>
        <View style={styles.cta}>
          <Text style={[detailType.statLabel, styles.ctaText]}>{t("home.continue.cta")}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    flexDirection: "row",
    gap: homeSpace.lg,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  pressed: {
    opacity: 0.9,
  },
  body: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  title: {
    marginTop: homeSpace.xxs,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
    marginTop: homeSpace.sm,
  },
  track: {
    flex: 1,
    height: homeMetrics.levelBarHeight,
    borderRadius: homeMetrics.levelBarHeight / 2,
    backgroundColor: homeColors.orangeTrack,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: homeColors.orange,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: homeSpace.sm,
    height: homeMetrics.continueButton,
    paddingHorizontal: homeSpace.lg,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: detailColors.amberInk,
  },
});
