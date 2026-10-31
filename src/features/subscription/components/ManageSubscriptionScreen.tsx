import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { detailType, homeType } from "@/theme";
import { trackEvent } from "@/lib/analytics";
import { restorePurchases } from "@/lib/revenuecat";
import { Button, ErrorState, LoadingState } from "@/components/ui";
import { useHomePalette } from "@/features/home";
import { waitForServerPremium } from "@/features/paywall";

import { formatDay, openStoreSubscriptions } from "@/features/subscription/api/storeLinks";
import { useSubscriptionLifecycleQuery } from "@/features/subscription/api/useSubscriptionLifecycleQuery";
import { LifecycleCard } from "@/features/subscription/components/LifecycleCard";
import { LifecycleScaffold } from "@/features/subscription/components/LifecycleScaffold";
import { daysUntil } from "@/features/subscription/lifecycle";
import { manageCopyFor } from "@/features/subscription/manageCopy";

import type { ManageAction } from "@/features/subscription/manageCopy";

interface ManageSubscriptionScreenProps {
  source: string;
  onClose: () => void;
}

const ACTION_ROUTES: Partial<Record<ManageAction, string>> = {
  fixPayment: "/billing-fix?source=manage",
  cancel: "/cancel-subscription",
  winback: "/winback?source=manage",
  goPremium: "/paywall?source=manage_subscription",
};

/**
 * Uygulama içi "Aboneliği yönet" (C11 adım 1, durum E4/E6): durum,
 * yenileme/bitiş tarihi, ödeme sorunu, iptal akışına giriş, App Store
 * yönetimi ve geri yükleme. İptal ve plan değişikliği App Store'da yapılır.
 */
export function ManageSubscriptionScreen({ source, onClose }: ManageSubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const palette = useHomePalette();
  const queryClient = useQueryClient();
  const { data: lifecycle, isLoading, isError, refetch } = useSubscriptionLifecycleQuery();
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    trackEvent("manage_subscription_opened", { source });
  }, [source]);

  const openStore = async () => {
    trackEvent("manage_subscription_store_tapped", { status: lifecycle?.status ?? "unknown" });
    const opened = await openStoreSubscriptions();
    if (!opened) Alert.alert(t("common.errorTitle"), t("subscription.manage.storeOpenError"));
    void queryClient.invalidateQueries();
  };

  const runAction = (action: ManageAction) => {
    trackEvent("manage_subscription_action", { action, status: lifecycle?.status ?? "unknown" });
    const route = ACTION_ROUTES[action];
    if (route) router.push(route);
    else void openStore();
  };

  const restore = async () => {
    setRestoring(true);
    const outcome = await restorePurchases();
    const confirmed = outcome.status === "error" ? false : await waitForServerPremium();
    setRestoring(false);
    void queryClient.invalidateQueries();
    if (outcome.status === "error") {
      Alert.alert(t("common.errorTitle"), t("paywall.restoreErrorBody"));
    } else if (confirmed) {
      Alert.alert(t("paywall.restoreFoundTitle"), t("paywall.restoreFoundBody"));
    } else {
      Alert.alert(t("paywall.restoreEmptyTitle"), t("paywall.restoreEmptyBody"));
    }
  };

  const title = t("subscription.manage.title");
  if (isLoading) {
    return (
      <LifecycleScaffold title={title} onBack={onClose}>
        <LoadingState />
      </LifecycleScaffold>
    );
  }
  if (isError || !lifecycle) {
    return (
      <LifecycleScaffold title={title} onBack={onClose}>
        <ErrorState message={t("subscription.manage.loadError")} onRetry={() => void refetch()} />
      </LifecycleScaffold>
    );
  }

  const copy = manageCopyFor(lifecycle);
  const date = copy.date ? formatDay(copy.date, i18n.language) : "";
  const trialDaysLeft =
    lifecycle.status === "trial" ? daysUntil(lifecycle.expiresAt, new Date()) : null;

  return (
    <LifecycleScaffold title={title} onBack={onClose}>
      <LifecycleCard>
        <Text style={[detailType.sheetTitle, { color: palette.ink }]}>
          {t(`subscription.manage.status.${copy.status}`)}
        </Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t(`subscription.manage.detail.${copy.detail}`, { date })}
        </Text>
        {trialDaysLeft !== null ? (
          <Text style={[detailType.statLabel, { color: palette.ink }]}>
            {t("subscription.manage.trialDaysLeft", { count: trialDaysLeft })}
          </Text>
        ) : null}
      </LifecycleCard>
      {copy.actions.map((action, index) => (
        <Button
          key={action}
          label={t(`subscription.manage.actions.${action}`)}
          onPress={() => runAction(action)}
          variant={index === 0 ? "primary" : "secondary"}
          fullWidth
        />
      ))}
      <Button
        label={t("subscription.manage.actions.restore")}
        onPress={() => void restore()}
        loading={restoring}
        disabled={restoring}
        variant="ghost"
        fullWidth
      />
      <Text style={[detailType.statLabel, styles.footnote, { color: palette.muted }]}>
        {t("subscription.manage.footnote")}
      </Text>
    </LifecycleScaffold>
  );
}

const styles = StyleSheet.create({
  footnote: {
    textAlign: "center",
    fontWeight: "400",
  },
});
