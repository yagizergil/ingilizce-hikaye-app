import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { detailType } from "@/theme";
import { trackError, trackEvent } from "@/lib/analytics";
import { purchasePackage, purchaseRetentionOffer } from "@/lib/revenuecat";
import { Button } from "@/components/ui";
import { useHomePalette } from "@/features/home";
import { waitForServerPremium } from "@/features/paywall";

import { openStoreSubscriptions } from "@/features/subscription/api/storeLinks";
import { useCancelFeedbackMutation } from "@/features/subscription/api/useCancelFeedbackMutation";
import { normalizeCancelNote, retentionChoiceFor } from "@/features/subscription/cancelFlow";
import { CancelLossStep } from "@/features/subscription/components/CancelLossStep";
import { CancelOfferStep } from "@/features/subscription/components/CancelOfferStep";
import { CancelReasonStep } from "@/features/subscription/components/CancelReasonStep";
import { LifecycleScaffold } from "@/features/subscription/components/LifecycleScaffold";
import { useCancelFlowContext } from "@/features/subscription/hooks/useCancelFlowContext";

import type { CancelReason, RetentionChoice } from "@/features/subscription/cancelFlow";

interface CancelFlowScreenProps {
  onClose: () => void;
}

type Step = "loss" | "reason" | "offer";

/**
 * İptal öncesi akış (C11): kaybedilecekler -> neden -> nedene göre seçenek.
 * "Yine de iptal et" HER adımda görünür ve App Store'un abonelik ekranını
 * açar; iptal zorlaştırılmaz (App Review). Teklif yalnızca ASC'de tanımlı
 * ve kullanıcıya uygunsa gösterilir; yoksa akış bilgilendirip yönlendirir.
 */
export function CancelFlowScreen({ onClose }: CancelFlowScreenProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const queryClient = useQueryClient();
  const ctx = useCancelFlowContext();
  const feedback = useCancelFeedbackMutation();
  const [step, setStep] = useState<Step>("loss");
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<RetentionChoice>("none");
  const [busy, setBusy] = useState(false);
  const status = ctx.lifecycle?.status ?? "unknown";

  useEffect(() => {
    trackEvent("cancel_flow_started", { status });
    // Yalnızca açılışta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toStore = async () => {
    trackEvent("cancel_flow_to_store", { step, reason: reason ?? "none", offer: choice });
    const opened = await openStoreSubscriptions();
    if (!opened) Alert.alert(t("common.errorTitle"), t("subscription.manage.storeOpenError"));
    void queryClient.invalidateQueries();
  };

  const submitReason = () => {
    if (!reason) return;
    const next = retentionChoiceFor(reason, {
      hasPromotionalOffer: ctx.promo !== null,
      canSwitchToMonthly: ctx.monthly !== null,
      hasSupportUrl: ctx.supportUrl !== null,
    });
    setChoice(next);
    trackEvent("cancel_reason_selected", { reason, offer: next });
    if (next !== "none") trackEvent("retention_offer_shown", { reason, offer: next });
    feedback.mutate({
      reason,
      note: normalizeCancelNote(note),
      productId: ctx.lifecycle?.productId ?? null,
      lifecycleStatus: status,
      offerShown: next,
    });
    setStep("offer");
  };

  const finishPurchase = async (confirmedTitle: string, confirmedBody: string) => {
    const confirmed = await waitForServerPremium();
    void queryClient.invalidateQueries();
    Alert.alert(
      confirmed ? confirmedTitle : t("paywall.activatingTitle"),
      confirmed ? confirmedBody : t("paywall.activatingBody"),
      [{ text: t("common.ok"), onPress: onClose }],
    );
  };

  const accept = async () => {
    trackEvent("retention_offer_accepted", { reason: reason ?? "none", offer: choice });
    if (choice === "goal") {
      router.replace("/(tabs)/profile");
      return;
    }
    if (choice === "support" && ctx.supportUrl) {
      try {
        await WebBrowser.openBrowserAsync(ctx.supportUrl);
      } catch (error) {
        trackError("subscription.supportLink", error);
      }
      return;
    }
    const context = { source: "cancel_flow", plan: choice };
    let outcome: Awaited<ReturnType<typeof purchasePackage>> | null = null;
    setBusy(true);
    if (choice === "promotional" && ctx.promo)
      outcome = await purchaseRetentionOffer(ctx.promo, context);
    if (choice === "monthly_switch" && ctx.monthly)
      outcome = await purchasePackage(ctx.monthly.pkg, context);
    if (outcome?.status === "error")
      Alert.alert(t("common.errorTitle"), t("paywall.purchaseError"));
    if (outcome?.status === "success" || outcome?.status === "not_entitled") {
      await finishPurchase(
        t("subscription.cancel.offer.acceptedTitle"),
        t(
          choice === "monthly_switch"
            ? "subscription.cancel.offer.monthlyAccepted"
            : "subscription.cancel.offer.promotionalAccepted",
        ),
      );
    }
    setBusy(false);
  };

  const priceString =
    choice === "promotional"
      ? (ctx.promo?.discount.priceString ?? null)
      : (ctx.monthly?.pkg.product.priceString ?? null);
  const legalPkg =
    choice === "promotional"
      ? ctx.promo?.pkg
      : choice === "monthly_switch"
        ? ctx.monthly?.pkg
        : null;
  const legal = legalPkg
    ? {
        regularPrice: legalPkg.product.priceString,
        periodLabel: t(
          legalPkg.packageType === "MONTHLY"
            ? "paywall.plan.periodMonth"
            : "paywall.plan.periodYear",
        ),
      }
    : null;

  return (
    <LifecycleScaffold title={t("subscription.cancel.title")} onBack={onClose}>
      {step === "loss" ? <CancelLossStep items={ctx.lossItems} /> : null}
      {step === "reason" ? (
        <CancelReasonStep reason={reason} note={note} onSelect={setReason} onChangeNote={setNote} />
      ) : null}
      {step === "offer" ? (
        <CancelOfferStep
          choice={choice}
          priceString={priceString}
          legal={legal}
          busy={busy}
          onAccept={() => void accept()}
        />
      ) : null}
      {step === "loss" ? (
        <>
          <Button label={t("subscription.cancel.keep")} onPress={onClose} fullWidth />
          <Button
            label={t("subscription.cancel.continue")}
            onPress={() => setStep("reason")}
            variant="secondary"
            fullWidth
          />
        </>
      ) : null}
      {step === "reason" ? (
        <Button
          label={t("subscription.cancel.continue")}
          onPress={submitReason}
          disabled={reason === null}
          fullWidth
        />
      ) : null}
      {step === "offer" ? (
        <Button
          label={t("subscription.cancel.keep")}
          onPress={onClose}
          variant="secondary"
          fullWidth
        />
      ) : null}
      <Button
        label={t("subscription.cancel.cancelAnyway")}
        onPress={() => void toStore()}
        variant="ghost"
        disabled={busy}
        fullWidth
      />
      <Text style={[detailType.statLabel, styles.note, { color: palette.muted }]}>
        {t("subscription.cancel.storeNote")}
      </Text>
    </LifecycleScaffold>
  );
}

const styles = StyleSheet.create({
  note: {
    textAlign: "center",
    fontWeight: "400",
  },
});
