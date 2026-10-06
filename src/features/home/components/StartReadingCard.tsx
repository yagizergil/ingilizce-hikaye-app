import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  mascotSize,
} from "@/theme";
import { MascotAnim } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

interface StartReadingCardProps {
  onPress: () => void;
}

/** Henüz kitaba başlamamış kullanıcı için: maskotlu "Hemen başla" kartı, Ara sekmesine gider. */
export function StartReadingCard({ onPress }: StartReadingCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("home.start.cta")}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.body}>
        <Text style={[homeType.sectionTitle, { color: palette.ink }]}>{t("home.start.title")}</Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("home.start.description")}
        </Text>
        <View style={styles.cta}>
          <Text style={[detailType.statLabel, styles.ctaText]}>{t("home.start.cta")}</Text>
        </View>
      </View>
      <MascotAnim name="books" width={mascotSize.card} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
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
    gap: homeSpace.xs,
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
