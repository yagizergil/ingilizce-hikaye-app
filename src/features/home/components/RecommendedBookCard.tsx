import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { BookCover3D, PressableScale } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { Book } from "@/features/library/types";

interface RecommendedBookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  /** İkincil bağlantı: kataloğa göz at. */
  onBrowse: () => void;
}

/**
 * "Senin için" kartı -- ana sayfanın birincil eylemi (henüz okuduğu kitap
 * yokken). Tek kitap, tek düğme (Hick yasası); seviye ve süre "bunu
 * okuyabilirim" güvenini veriyor.
 */
export function RecommendedBookCard({ book, onPress, onBrowse }: RecommendedBookCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <PressableScale
        onPress={() => onPress(book)}
        accessibilityRole="button"
        accessibilityLabel={t("home.recommended.accessibility", { title: book.title })}
        style={styles.main}
      >
        <BookCover3D
          uri={book.coverUrl}
          width={homeMetrics.continueCover}
          height={Math.round(homeMetrics.continueCover * 1.5)}
        />
        <View style={styles.body}>
          <Text style={[homeType.cardSub, { color: detailColors.amberDeep }]}>
            {t("home.recommended.eyebrow")}
          </Text>
          <Text style={[detailType.sectionTitle, { color: palette.ink }]} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={[homeType.cardSub, { color: palette.muted }]} numberOfLines={1}>
            {t("home.recommended.meta", { level: book.level, minutes: book.estimatedMinutes })}
          </Text>
          <View style={styles.cta}>
            <Text style={[detailType.statLabel, styles.ctaText]}>{t("home.recommended.cta")}</Text>
            <Ionicons name="arrow-forward" size={16} color={detailColors.amberInk} />
          </View>
        </View>
      </PressableScale>
      <Pressable onPress={onBrowse} accessibilityRole="link" hitSlop={homeSpace.sm}>
        <Text style={[homeType.seeAll, styles.browse]}>{t("home.recommended.browse")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    gap: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  main: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.lg,
  },
  pressed: {
    opacity: 0.9,
  },
  body: {
    flex: 1,
    gap: homeSpace.xs,
  },
  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.xs,
    marginTop: homeSpace.sm,
    height: homeMetrics.continueButton,
    paddingHorizontal: homeSpace.lg,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.amber,
  },
  ctaText: {
    color: detailColors.amberInk,
  },
  browse: {
    color: homeColors.orange,
    textAlign: "center",
  },
});
