import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";

const RING_SIZE = 120;

interface OnboardingSuccessStepProps {
  /** Kullanıcı premium'a geçtiyse metin ona göre değişiyor. */
  premium: boolean;
  onContinue: () => void;
}

/**
 * Onboarding'in son ekranı (referans: `docs/reference/bookvo-15-basarili.jpeg`).
 *
 * Referansta ortada taç taşıyan bir halka, altında "Harika!" başlığı ve
 * tek bir düğme var. İlerleme çubuğu YOK -- akış bitti.
 *
 * METİN İKİ DURUMLU: referans bu ekranı yalnızca satın alma sonrası
 * gösteriyor. Bizde paywall atlanabiliyor (ücretsiz katman gerçekten
 * kullanılabilir olmalı, ürün ilkesi #2), o yüzden vazgeçen kullanıcıya
 * "premium başladı" demek yanlış olurdu; ona kurulumun bittiği söyleniyor.
 */
export function OnboardingSuccessStep({ premium, onContinue }: OnboardingSuccessStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [scale] = useState(() => new Animated.Value(0.7));

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.ring,
            { backgroundColor: `${theme.accent}22`, borderColor: theme.accent },
            { transform: [{ scale }] },
          ]}
        >
          <Ionicons name={premium ? "trophy" : "checkmark"} size={48} color={theme.accent} />
        </Animated.View>

        <Text style={[type.display, styles.centered, { color: theme.text.primary }]}>
          {t("onboarding.success.title")}
        </Text>
        <Text style={[monoType.rowText, styles.centered, { color: theme.text.secondary }]}>
          {premium ? t("onboarding.success.bodyPremium") : t("onboarding.success.bodyFree")}
        </Text>
      </View>

      <View style={styles.footer}>
        <OnboardingFooterButton label={t("onboarding.success.cta")} onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  centered: {
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});
