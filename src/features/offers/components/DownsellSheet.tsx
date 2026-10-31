import { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { paywallMetrics, paywallType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { isPurchasesAvailable } from "@/lib/revenuecat";
import { useRegisterDialog } from "@/hooks/useDialogGuard";
import { LoadingState, MascotAnim } from "@/components/ui";
import {
  PaywallLegal,
  readTrial,
  trialEligibilityOrNone,
  usePurchaseFlow,
  useTrialEligibilityQuery,
} from "@/features/paywall";

import { useNamedOfferingQuery } from "@/features/offers/api/useNamedOfferingQuery";
import { reportRuleOutcome } from "@/features/offers/hooks/reportRuleOutcome";
import { resolveDownsellPackage } from "@/features/offers/offerModel";

import type { PaywallCloseReason } from "@/features/paywall";
import type { Rule } from "@/features/offers/types";

interface DownsellSheetProps {
  rule: Rule;
  /** Satın alsa da almasa da akış devam eder. */
  onDone: () => void;
}

/**
 * Onboarding çıkış teklifi (rapor C8, Babbel "küçük başla" deseni): ana
 * paywall'u satın almadan kapatan kullanıcıya TEK plan (Lingo: aylık), tek
 * CTA ve "Hayır, teşekkürler". Ömür boyu bir kez (kural `max_shows=1`).
 *
 * Paket yoksa (offering tanımsız ve varsayılanda da aylık yok) sheet hiç
 * görünmeden akış devam eder -- kullanıcıya boş bir teklif gösterilmez.
 */
export function DownsellSheet({ rule, onDone }: DownsellSheetProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const offeringQuery = useNamedOfferingQuery(rule.action.offering_id ?? "downsell");
  const pkg = useMemo(
    () =>
      offeringQuery.data
        ? resolveDownsellPackage(
            offeringQuery.data.requested,
            offeringQuery.data.current,
            rule.action.package_type ?? "MONTHLY",
          )
        : null,
    [offeringQuery.data, rule.action.package_type],
  );
  const { data: eligible } = useTrialEligibilityQuery(pkg ? [pkg] : undefined);
  // Deneme yalnızca kullanıcı GERÇEKTEN uygunsa yazılır (Guideline 2.3.1).
  const trialDays =
    pkg && trialEligibilityOrNone(eligible).has(pkg.product.identifier)
      ? (readTrial(pkg)?.days ?? null)
      : null;

  const unavailable =
    !isPurchasesAvailable || offeringQuery.isError || (offeringQuery.isSuccess && !pkg);
  useRegisterDialog(!unavailable);

  const params = useMemo(
    () => ({
      rule_id: rule.id,
      experiment: rule.action.experiment ?? "",
      variant: "downsell",
      offering_found: offeringQuery.data?.requested != null,
    }),
    [offeringQuery.data, rule],
  );

  useEffect(() => {
    if (!unavailable) return;
    trackEvent("offer_fallback", { rule_id: rule.id, reason: "no_downsell_package" });
    reportRuleOutcome(rule.id, "fallback");
    onDone();
  }, [unavailable, onDone, rule.id]);

  const shownRef = useRef(false);
  useEffect(() => {
    if (!pkg || shownRef.current) return;
    shownRef.current = true;
    trackEvent("paywall_downsell_shown", { ...params, package_id: pkg.identifier });
  }, [pkg, params]);

  const source = rule.action.source ?? "downsell_onboarding";
  const handleClosed = useCallback(
    (reason: PaywallCloseReason) => {
      if (reason === "purchased") {
        trackEvent("paywall_downsell_accepted", params);
        reportRuleOutcome(rule.id, "purchased");
      }
      onDone();
    },
    [onDone, params, rule.id],
  );
  const { busy, purchase, restore } = usePurchaseFlow({ source, onClose: handleClosed });

  const decline = useCallback(() => {
    trackEvent("paywall_downsell_declined", params);
    reportRuleOutcome(rule.id, "dismissed");
    onDone();
  }, [onDone, params, rule.id]);

  const isBusy = busy !== null;

  return (
    <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
      <SafeAreaView
        edges={["bottom"]}
        style={[styles.sheet, { backgroundColor: theme.bg.primary }]}
      >
        {!pkg ? (
          <LoadingState />
        ) : (
          <>
            <MascotAnim name="crown" width={paywallMetrics.crownSize} style={styles.center} />
            <Text style={[paywallType.title, styles.text, { color: theme.text.primary }]}>
              {t("offers.downsell.title")}
            </Text>
            <Text style={[paywallType.subtitle, styles.text, { color: theme.text.secondary }]}>
              {t("offers.downsell.body")}
            </Text>
            <Text style={[paywallType.planPrice, styles.text, { color: theme.text.primary }]}>
              {t("offers.downsell.price", { price: pkg.product.priceString })}
            </Text>
            <Pressable
              onPress={() => void purchase({ pkg, plan: "monthly", trialDays })}
              disabled={isBusy}
              accessibilityRole="button"
              style={[styles.cta, { backgroundColor: theme.accent, opacity: isBusy ? 0.6 : 1 }]}
            >
              <Text style={[paywallType.cta, { color: theme.text.onAccent }]}>
                {busy?.kind === "activating"
                  ? t("paywall.activatingCta")
                  : t("offers.downsell.cta")}
              </Text>
            </Pressable>
            <Pressable
              onPress={decline}
              disabled={isBusy}
              accessibilityRole="button"
              hitSlop={spacing.sm}
            >
              <Text style={[paywallType.legal, styles.text, { color: theme.text.secondary }]}>
                {t("offers.downsell.decline")}
              </Text>
            </Pressable>
            <PaywallLegal
              priceString={pkg.product.priceString}
              trialDays={trialDays}
              periodLabel={t("paywall.plan.periodMonth")}
              onRestore={() => void restore()}
              restoreBusy={busy?.kind === "restore"}
            />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: paywallMetrics.cardRadius,
    borderTopRightRadius: paywallMetrics.cardRadius,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  center: { alignSelf: "center" },
  text: { textAlign: "center" },
  cta: {
    height: paywallMetrics.ctaHeight,
    borderRadius: paywallMetrics.ctaHeight / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
