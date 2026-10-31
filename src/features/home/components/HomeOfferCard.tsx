import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { trackEvent } from "@/lib/analytics";
import { useActivationStore } from "@/hooks/useActivationStore";
import { useHomePalette } from "@/features/home/useHomePalette";
import { HOME_OFFER_COOLDOWN_MS, shouldShowHomeOffer } from "@/features/home/homeOffer";
import { useHomeOfferStore } from "@/features/home/hooks/useHomeOfferStore";
import { useSubscriptionQuery, useTrialOffer } from "@/features/paywall";
import { useRuleCooldownHours } from "@/features/offers";

/**
 * Ana sayfadaki "ikinci şans" deneme kartı (1.1.0). Kural ve gerekçe
 * `homeOffer.ts` içinde. Bir oturumda gösterilmeye başlandıysa o oturum
 * boyunca durur (yeniden render'da kaybolmasın); kapatılınca 72 saat yok.
 */
export function HomeOfferCard() {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const { data: subscription } = useSubscriptionQuery();
  const trialDays = useTrialOffer();
  const { lastShownAt, sessionVisible, show, hide } = useHomeOfferStore();
  const firstChapterFinishedAt = useActivationStore((state) => state.firstChapterFinishedAt);
  const decidedRef = useRef(false);
  const rule = useRuleCooldownHours("home_offer", HOME_OFFER_COOLDOWN_MS / 3_600_000);

  useEffect(() => {
    if (decidedRef.current || !subscription || !rule.enabled) return;
    const eligible = shouldShowHomeOffer({
      cooldownMs: rule.cooldownHours * 3_600_000,
      now: Date.now(),
      firstChapterFinishedAt,
      lastShownAt,
      isPremium: subscription.isPremium,
      trialDays,
    });
    if (!eligible) return;
    decidedRef.current = true;
    show(Date.now());
    trackEvent("home_offer_shown", { trial_days: trialDays ?? 0 });
  }, [
    subscription,
    firstChapterFinishedAt,
    lastShownAt,
    trialDays,
    show,
    rule.enabled,
    rule.cooldownHours,
  ]);

  if (!sessionVisible || trialDays === null || subscription?.isPremium) return null;

  const dismiss = () => {
    trackEvent("home_offer_dismissed");
    hide(Date.now());
  };

  const open = () => {
    trackEvent("home_offer_tapped", { trial_days: trialDays });
    hide(Date.now());
    router.push("/paywall?source=home_offer");
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.body}>
        <Text style={[homeType.sectionTitle, { color: palette.ink }]}>
          {t("home.offer.title", { count: trialDays })}
        </Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>{t("home.offer.body")}</Text>
        <Pressable onPress={open} accessibilityRole="button" style={styles.cta}>
          <Text style={[detailType.statLabel, styles.ctaText]}>{t("home.offer.cta")}</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={dismiss}
        hitSlop={homeSpace.sm}
        accessibilityRole="button"
        accessibilityLabel={t("common.dismiss")}
      >
        <Ionicons name="close" size={20} color={palette.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    marginBottom: homeSpace.lg,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
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
