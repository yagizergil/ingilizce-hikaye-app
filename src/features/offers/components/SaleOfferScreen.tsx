import { useCallback, useEffect, useRef } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { paywallMetrics, paywallType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { LoadingState, MascotAnim } from "@/components/ui";
import { PaywallLegal, usePurchaseFlow } from "@/features/paywall";

import { markOfferRedeemed } from "@/features/offers/api/offerApi";
import { cancelOfferReminder } from "@/features/offers/api/offerReminder";
import { reportRuleOutcome } from "@/features/offers/hooks/reportRuleOutcome";
import { useSaleOffer } from "@/features/offers/hooks/useSaleOffer";
import { SaleOfferCard } from "@/features/offers/components/SaleOfferCard";
import { periodOf } from "@/features/offers/offerModel";

import type { PaywallCloseReason } from "@/features/paywall";
import type { RuleTrigger } from "@/features/offers/types";

interface SaleOfferScreenProps {
  ruleId: string;
  onClose: () => void;
  /**
   * Teklif kurulamadı (indirimli ürün/offering yok). Çağıran sessizce normal
   * paywall'u açar -- ama kural bir paywall KAPANIŞINDAN geldiyse
   * (`paywall_closed`, kaskad) yalnızca kapatır: az önce kapatılan paywall'u
   * aynı kullanıcıya hemen yeniden göstermek anlamsız olurdu.
   */
  onFallback: (source: string, trigger: RuleTrigger) => void;
}

/**
 * İndirim ekranı (rapor C7 madde 5): tek teklif kartı, üstü çizili çapa
 * fiyat, sunucu bitişinden geri sayım, çıkışta bir kez onay.
 *
 * Kural motorunun açtığı bir ekran; OKUYUCUDAN AÇILMAZ (tetikleyicileri
 * `app_open` ve okuyucu dışı kaynaklardan `paywall_closed`).
 */
export function SaleOfferScreen({ ruleId, onClose, onFallback }: SaleOfferScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const { state, remaining } = useSaleOffer(ruleId);
  const source = `rule:${ruleId}`;
  const ready = state.status === "ready" ? state : null;

  // Teklif kurulamıyorsa sessizce normal paywall (ya da kural yoksa kapat).
  useEffect(() => {
    if (state.status === "fallback") {
      trackEvent("offer_fallback", { rule_id: ruleId, reason: state.reason });
      reportRuleOutcome(ruleId, "fallback");
      onFallback(source, state.trigger);
    } else if (state.status === "missing_rule") {
      trackEvent("offer_fallback", { rule_id: ruleId, reason: "missing_rule" });
      onClose();
    }
  }, [state, ruleId, source, onClose, onFallback]);

  const viewedRef = useRef(false);
  useEffect(() => {
    if (!ready || viewedRef.current) return;
    viewedRef.current = true;
    trackEvent("paywall_viewed", {
      source,
      placement: ready.rule.action.placement ?? "app_open",
      rule_id: ruleId,
      offering_id: ready.offeringId,
      paywall_id: "sale",
      discount_percent: ready.offer.percent,
    });
  }, [ready, ruleId, source]);

  const handleClosed = useCallback(
    (reason: PaywallCloseReason) => {
      if (reason === "purchased") reportRuleOutcome(ruleId, "purchased");
      onClose();
    },
    [onClose, ruleId],
  );
  const handlePurchased = useCallback(() => {
    if (ready) void markOfferRedeemed(ready.offeringId);
    void cancelOfferReminder();
  }, [ready]);
  const { busy, purchase, restore, outcomeRef } = usePurchaseFlow({
    source,
    onClose: handleClosed,
    onPurchased: handlePurchased,
  });

  // Çıkış onayı oturumda bir kez (Vocabulary §7.4); sayaç yoksa sorulmaz.
  const exitConfirmedRef = useRef(false);
  const handleDismiss = useCallback(() => {
    const leave = () => {
      if (outcomeRef.current === "pending") {
        trackEvent("paywall_dismissed", { source, rule_id: ruleId });
        reportRuleOutcome(ruleId, "dismissed");
      }
      onClose();
    };
    if (!remaining || remaining.expired || exitConfirmedRef.current) {
      leave();
      return;
    }
    exitConfirmedRef.current = true;
    trackEvent("offer_exit_confirm_shown", { rule_id: ruleId });
    Alert.alert(
      t("offers.sale.exitTitle"),
      t("offers.sale.exitBody", { hours: remaining.hours, minutes: remaining.minutes }),
      [
        { text: t("offers.sale.exitLeave"), style: "cancel", onPress: leave },
        {
          text: t("offers.sale.exitStay"),
          onPress: () => trackEvent("offer_exit_stayed", { rule_id: ruleId }),
        },
      ],
    );
  }, [onClose, outcomeRef, remaining, ruleId, source, t]);

  const periodKind = ready ? periodOf(ready.offer.sale) : null;
  const periodLabel =
    periodKind === "month" ? t("paywall.plan.periodMonth") : t("paywall.plan.periodYear");
  const isBusy = busy !== null;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      {!ready ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <MascotAnim name="crown" width={paywallMetrics.crownSize} style={styles.crown} />
          <Text style={[paywallType.title, styles.centered, { color: theme.text.primary }]}>
            {t("offers.sale.title")}
          </Text>
          <Text style={[paywallType.subtitle, styles.centered, { color: theme.text.secondary }]}>
            {t("offers.sale.subtitle")}
          </Text>
          <SaleOfferCard
            percent={ready.offer.percent}
            salePrice={ready.offer.sale.product.priceString}
            anchorPrice={ready.offer.anchor.product.priceString}
            periodLabel={periodLabel}
            remaining={remaining}
          />
        </ScrollView>
      )}

      <Pressable
        onPress={handleDismiss}
        hitSlop={spacing.sm}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={t("common.dismiss")}
        style={[styles.closeButton, { top: safeTop, backgroundColor: theme.bg.surface }]}
      >
        <Ionicons name="close" size={paywallMetrics.closeIcon} color={theme.text.secondary} />
      </Pressable>

      {/* Yasal blok ve CTA kaydırmanın DIŞINDA (Guideline 3.1.2(c) reddi). */}
      {ready ? (
        <View style={[styles.footer, { borderTopColor: theme.border.hairline }]}>
          <Pressable
            onPress={() => void purchase({ pkg: ready.offer.sale, plan: "sale", trialDays: null })}
            disabled={isBusy}
            accessibilityRole="button"
            style={[styles.cta, { backgroundColor: theme.accent, opacity: isBusy ? 0.6 : 1 }]}
          >
            <Text style={[paywallType.cta, { color: theme.text.onAccent }]}>
              {busy?.kind === "activating" ? t("paywall.activatingCta") : t("offers.sale.cta")}
            </Text>
          </Pressable>
          <PaywallLegal
            priceString={ready.offer.sale.product.priceString}
            trialDays={null}
            periodLabel={periodLabel}
            onRestore={() => void restore()}
            restoreBusy={busy?.kind === "restore"}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  crown: { alignSelf: "center" },
  centered: { textAlign: "center" },
  closeButton: {
    position: "absolute",
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    height: paywallMetrics.ctaHeight,
    borderRadius: paywallMetrics.ctaHeight / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
