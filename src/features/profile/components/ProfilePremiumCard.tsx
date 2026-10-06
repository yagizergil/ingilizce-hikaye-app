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

interface ProfilePremiumCardProps {
  isPremium: boolean;
  onPress: () => void;
}

/**
 * Profilin tepesindeki premium kartı. Ücretsizde paywall'a götürür,
 * premium'da yalnızca teşekkür eder. Okuma ekranının DIŞINDA ve kullanıcının
 * kendi açtığı bir sayfada (Ürün İlkesi #1).
 */
export function ProfilePremiumCard({ isPremium, onPress }: ProfilePremiumCardProps) {
  const { t } = useTranslation();

  const body = (
    <>
      <View style={styles.texts}>
        <Text style={[detailType.sheetTitle, styles.title]}>
          {t(isPremium ? "profile.premium.activeTitle" : "profile.premium.title")}
        </Text>
        <Text style={[homeType.cardSub, styles.description]}>
          {t(isPremium ? "profile.premium.activeDescription" : "profile.premium.description")}
        </Text>
        {isPremium ? null : (
          <View style={styles.cta}>
            <Text style={[detailType.statLabel, styles.ctaText]}>{t("profile.premium.cta")}</Text>
          </View>
        )}
      </View>
      <MascotAnim name="crown" width={mascotSize.card} />
    </>
  );

  if (isPremium) return <View style={styles.card}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("profile.premium.title")}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    marginHorizontal: homeMetrics.gutter,
    marginTop: homeSpace.lg,
    paddingVertical: homeSpace.lg,
    paddingLeft: homeSpace.lg,
    paddingRight: homeSpace.md,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.peach,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.9,
  },
  texts: {
    flex: 1,
    gap: homeSpace.xs,
  },
  title: {
    color: detailColors.title,
  },
  description: {
    color: detailColors.muted,
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
