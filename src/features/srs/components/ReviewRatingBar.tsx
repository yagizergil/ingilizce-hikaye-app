import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { SrsRating } from "@/features/srs/scheduler";

interface ReviewRatingBarProps {
  onRate: (rating: SrsRating) => void;
}

/**
 * Üç değerlendirme düğmesi (yuvarlak hap).
 *
 * Anki dört düğme kullanıyor ("again/hard/good/easy") ama yeni kullanıcı
 * "hard" ile "good" arasındaki farkı bilmiyor ve karar vermek için duruyor.
 * Üç seçenek kararı hızlandırıyor ve planlama kalitesinde ölçülebilir bir
 * kayba yol açmıyor.
 */
export function ReviewRatingBar({ onRate }: ReviewRatingBarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const options: { rating: SrsRating; label: string; background: string; color: string }[] = [
    {
      rating: "again",
      label: t("srs.ratingAgain"),
      background: homeColors.peach,
      color: theme.danger,
    },
    {
      rating: "hard",
      label: t("srs.ratingHard"),
      background: homeColors.peach,
      color: detailColors.amberInk,
    },
    {
      rating: "easy",
      label: t("srs.ratingEasy"),
      background: detailColors.amber,
      color: detailColors.amberInk,
    },
  ];

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable
          key={option.rating}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: option.background, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => onRate(option.rating)}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <Text style={[detailType.cta, { color: option.color }]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: homeSpace.md,
    paddingHorizontal: homeMetrics.gutter,
    paddingTop: homeSpace.md,
    paddingBottom: homeSpace.xl,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: homeMetrics.continueButton + homeSpace.lg,
    borderRadius: (homeMetrics.continueButton + homeSpace.lg) / 2,
  },
});
