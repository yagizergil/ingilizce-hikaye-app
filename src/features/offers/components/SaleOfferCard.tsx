import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { paywallMetrics, paywallType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { Remaining } from "@/features/offers/offerModel";

interface SaleOfferCardProps {
  percent: number;
  salePrice: string;
  anchorPrice: string;
  periodLabel: string;
  /** Sunucu bitiş anına kalan süre; teklif açılamadıysa null (sayaç yok). */
  remaining: Remaining | null;
}

/**
 * Tek teklif kartı: indirim rozeti, üstü çizili normal fiyat, indirimli
 * fiyat ve sunucu bitişinden geri sayım (rapor C7 madde 5).
 *
 * Yüzde ve iki fiyat da RevenueCat'ten gelen GERÇEK fiyatlar
 * (`resolveSaleOffer`); sayaç yalnızca sunucu `expires_at` varken çizilir.
 */
export function SaleOfferCard({
  percent,
  salePrice,
  anchorPrice,
  periodLabel,
  remaining,
}: SaleOfferCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.accent }]}>
      <View style={[styles.badge, { backgroundColor: theme.accent }]}>
        <Text style={[paywallType.planBadge, { color: theme.text.onAccent }]}>
          {t("offers.sale.badge", { percent })}
        </Text>
      </View>
      <Text
        style={[paywallType.planNote, styles.anchor, { color: theme.text.secondary }]}
        accessibilityLabel={t("offers.sale.anchorA11y", { price: anchorPrice })}
      >
        {t("offers.sale.price", { price: anchorPrice, period: periodLabel })}
      </Text>
      <Text style={[paywallType.title, styles.centered, { color: theme.text.primary }]}>
        {t("offers.sale.price", { price: salePrice, period: periodLabel })}
      </Text>
      {remaining && !remaining.expired ? (
        <Text style={[paywallType.planNote, styles.centered, { color: theme.text.primary }]}>
          {t("offers.sale.endsIn", { hours: remaining.hours, minutes: remaining.minutes })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: paywallMetrics.cardRadius,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    height: paywallMetrics.badgeHeight + spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  anchor: {
    textDecorationLine: "line-through",
  },
  centered: {
    textAlign: "center",
  },
});
