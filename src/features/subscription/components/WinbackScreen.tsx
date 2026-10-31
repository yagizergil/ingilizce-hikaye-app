import { useEffect, useMemo, useState } from "react";
import { Alert, Text } from "react-native";

import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { detailType, homeType } from "@/theme";
import { trackEvent } from "@/lib/analytics";
import { PROMO_OFFER_IDS, purchasePackage, purchaseRetentionOffer } from "@/lib/revenuecat";
import { Button, LoadingState, MascotAnim } from "@/components/ui";
import { useHomePalette } from "@/features/home";
import {
  buildPlanOptions,
  PaywallLegal,
  useOfferingsQuery,
  useSubscriptionQuery,
  waitForServerPremium,
} from "@/features/paywall";

import {
  useRetentionOfferQuery,
  useSaleOfferingQuery,
} from "@/features/subscription/api/useRetentionOfferQuery";
import { useSubscriptionLifecycleQuery } from "@/features/subscription/api/useSubscriptionLifecycleQuery";
import { LifecycleCard } from "@/features/subscription/components/LifecycleCard";
import { LifecycleScaffold } from "@/features/subscription/components/LifecycleScaffold";
import { winbackSourceFor } from "@/features/subscription/winbackOffer";

interface WinbackScreenProps {
  source: string;
  onClose: () => void;
}

/**
 * "Tekrar hoş geldin" (C9). Teklif yalnızca App Store Connect / RevenueCat'te
 * gerçekten tanımlı ve kullanıcıya uygunsa gösterilir; aksi hâlde ekran
 * ilerlemenin durduğunu söyler ve planlara yönlendirir. Fiyat koda gömülü
 * değil: hepsi StoreKit'in biçimlediği metin.
 */
export function WinbackScreen({ source, onClose }: WinbackScreenProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const queryClient = useQueryClient();
  const { data: lifecycle } = useSubscriptionLifecycleQuery();
  const { data: subscription } = useSubscriptionQuery();
  const { data: packages } = useOfferingsQuery();
  const status = lifecycle?.status ?? null;
  const isPaid = status === "lapsed_paid";
  const storeOffer = useRetentionOfferQuery(packages, {
    winback: true,
    promotionalIds: [PROMO_OFFER_IDS.winback],
    enabled: isPaid,
  });
  const sale = useSaleOfferingQuery(status === "lapsed_paid" || status === "lapsed_trial");
  const salePlan = useMemo(() => buildPlanOptions(sale.data ?? [])[0] ?? null, [sale.data]);
  const [busy, setBusy] = useState(false);

  const offerSource = winbackSourceFor({
    status,
    hasStoreOffer: Boolean(storeOffer.data),
    hasSalePackage: salePlan !== null,
  });
  const loading = (isPaid && storeOffer.isLoading) || sale.isLoading;

  useEffect(() => {
    if (loading) return;
    trackEvent("winback_shown", { source, status: status ?? "unknown", offer: offerSource });
  }, [loading, source, status, offerSource]);

  const purchase = async () => {
    setBusy(true);
    const context = { source: "winback", plan: offerSource };
    const outcome =
      offerSource === "store_offer" && storeOffer.data
        ? await purchaseRetentionOffer(storeOffer.data, context)
        : salePlan
          ? await purchasePackage(salePlan.pkg, context)
          : null;
    if (outcome?.status === "success" || outcome?.status === "not_entitled") {
      trackEvent("winback_purchased", { offer: offerSource });
      const confirmed = await waitForServerPremium();
      void queryClient.invalidateQueries();
      setBusy(false);
      Alert.alert(
        confirmed ? t("subscription.winback.purchasedTitle") : t("paywall.activatingTitle"),
        confirmed ? t("subscription.winback.purchasedBody") : t("paywall.activatingBody"),
        [{ text: t("common.ok"), onPress: onClose }],
      );
      return;
    }
    setBusy(false);
    if (outcome?.status === "error")
      Alert.alert(t("common.errorTitle"), t("paywall.purchaseError"));
  };

  const seePlans = () => {
    trackEvent("winback_see_plans", { offer: offerSource });
    router.replace("/paywall?source=winback");
  };

  const savedWords = subscription?.savedWordCount ?? 0;
  const offerPkg = offerSource === "store_offer" ? storeOffer.data?.pkg : salePlan?.pkg;
  const priceString =
    offerSource === "store_offer"
      ? (storeOffer.data?.discount.priceString ?? "")
      : (salePlan?.pkg.product.priceString ?? "");
  // Yenilemede alınacak NORMAL fiyat (3.1.2(a)): teklif ilk dönem içindir.
  const regularPrice = offerPkg?.product.priceString ?? "";
  const periodLabel =
    offerPkg?.packageType === "MONTHLY"
      ? t("paywall.plan.periodMonth")
      : t("paywall.plan.periodYear");

  return (
    <LifecycleScaffold title={t("subscription.winback.title")} onBack={onClose}>
      <MascotAnim name="home" width={140} />
      <LifecycleCard>
        <Text style={[homeType.cardSub, { color: palette.ink }]}>
          {savedWords > 0
            ? t("subscription.winback.bodyWords", { count: savedWords })
            : t("subscription.winback.body")}
        </Text>
      </LifecycleCard>
      {loading ? <LoadingState /> : null}
      {!loading && offerSource !== "none" ? (
        <LifecycleCard>
          <Text style={[detailType.sectionTitle, { color: palette.ink }]}>
            {t("subscription.winback.offerTitle")}
          </Text>
          <Text style={[homeType.cardSub, { color: palette.muted }]}>
            {t("subscription.winback.offerBody", { price: priceString, regular: regularPrice })}
          </Text>
          <Button
            label={t("subscription.winback.offerCta")}
            onPress={() => void purchase()}
            loading={busy}
            disabled={busy}
            fullWidth
          />
          <PaywallLegal priceString={regularPrice} trialDays={null} periodLabel={periodLabel} />
        </LifecycleCard>
      ) : null}
      {!loading && offerSource === "none" ? (
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("subscription.winback.noOffer")}
        </Text>
      ) : null}
      <Button
        label={t("subscription.winback.seePlans")}
        onPress={seePlans}
        variant={offerSource === "none" ? "primary" : "secondary"}
        disabled={busy}
        fullWidth
      />
      <Button
        label={t("subscription.winback.notNow")}
        onPress={onClose}
        variant="ghost"
        fullWidth
      />
    </LifecycleScaffold>
  );
}
