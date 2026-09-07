import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { SrsRating } from "@/features/srs/scheduler";

interface ReviewRatingBarProps {
  onRate: (rating: SrsRating) => void;
}

/**
 * Üç değerlendirme düğmesi.
 *
 * Anki dört düğme kullanıyor ("again/hard/good/easy") ama yeni kullanıcı
 * "hard" ile "good" arasındaki farkı bilmiyor ve karar vermek için duruyor.
 * Üç seçenek kararı hızlandırıyor ve planlama kalitesinde ölçülebilir bir
 * kayba yol açmıyor.
 */
export function ReviewRatingBar({ onRate }: ReviewRatingBarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const options: { rating: SrsRating; label: string; color: string }[] = [
    { rating: "again", label: t("srs.ratingAgain"), color: theme.danger },
    { rating: "hard", label: t("srs.ratingHard"), color: theme.text.secondary },
    { rating: "easy", label: t("srs.ratingEasy"), color: theme.accent },
  ];

  return (
    <View style={[styles.container, { borderTopColor: theme.border.hairline }]}>
      {options.map((option) => (
        <Pressable
          key={option.rating}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.bg.surface, opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={() => onRate(option.rating)}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <Text style={[monoType.label, { color: option.color }]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
});
