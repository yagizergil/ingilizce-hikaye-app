import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeMetrics, homeSpace, homeType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";

import { formatDay } from "@/features/subscription/api/storeLinks";
import { useSubscriptionLifecycleQuery } from "@/features/subscription/api/useSubscriptionLifecycleQuery";
import { statusBannerFor } from "@/features/subscription/statusBanner";

/**
 * Ana sayfadaki abonelik durum kartı: ödeme sorunu (C10), bitmek üzere
 * olan iptal edilmiş abonelik (C9) ve denemenin son günü (C12 / A8).
 * Okuyucuda GÖSTERİLMEZ -- yalnızca ana sayfaya yerleştiriliyor.
 */
export function SubscriptionStatusBanner() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { data: lifecycle } = useSubscriptionLifecycleQuery();
  const banner = useMemo(() => statusBannerFor(lifecycle ?? null, new Date()), [lifecycle]);
  const kind = banner?.kind ?? null;

  useEffect(() => {
    if (kind) trackEvent("subscription_banner_shown", { kind });
  }, [kind]);

  if (!banner) return null;

  const isBilling = banner.kind === "grace" || banner.kind === "billing_retry";
  let message: string;
  if (banner.kind === "grace") {
    message = banner.date
      ? t("subscription.billing.bannerGrace", { date: formatDay(banner.date, i18n.language) })
      : t("subscription.billing.bannerGraceNoDate");
  } else if (banner.kind === "billing_retry") {
    message = t("subscription.billing.bannerRetry");
  } else if (banner.kind === "ending") {
    message = t("subscription.ending.banner", { date: formatDay(banner.date, i18n.language) });
  } else {
    message = t("subscription.trial.lastDayBanner", {
      date: formatDay(banner.date, i18n.language),
    });
  }
  const cta = isBilling
    ? t("subscription.billing.bannerCta")
    : banner.kind === "ending"
      ? t("subscription.ending.bannerCta")
      : t("subscription.trial.lastDayCta");

  const open = () => {
    trackEvent("subscription_banner_tapped", { kind: banner.kind });
    router.push(isBilling ? "/billing-fix?source=banner" : "/subscription?source=banner");
  };

  return (
    <View style={[styles.card, { backgroundColor: isBilling ? theme.danger : detailColors.amber }]}>
      <Ionicons
        name={isBilling ? "alert-circle" : "time-outline"}
        size={22}
        color={isBilling ? detailColors.circle : detailColors.amberInk}
      />
      <Text
        style={[
          homeType.cardSub,
          styles.message,
          { color: isBilling ? detailColors.circle : detailColors.amberInk },
        ]}
      >
        {message}
      </Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}
      >
        <Text style={[detailType.statLabel, styles.ctaText]}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    marginHorizontal: homeMetrics.gutter,
    marginTop: homeSpace.md,
    padding: homeSpace.md,
    borderRadius: homeMetrics.cardRadius,
  },
  message: {
    flex: 1,
  },
  cta: {
    paddingHorizontal: homeSpace.md,
    height: homeMetrics.continueButton,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.circle,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: detailColors.title,
  },
  pressed: {
    opacity: 0.85,
  },
});
