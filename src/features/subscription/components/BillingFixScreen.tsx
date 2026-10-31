import { useEffect } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { useTranslation } from "react-i18next";

import { detailType, homeType } from "@/theme";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui";
import { useHomePalette } from "@/features/home";

import {
  formatDay,
  openStoreBilling,
  openStoreSubscriptions,
} from "@/features/subscription/api/storeLinks";
import { useSubscriptionLifecycleQuery } from "@/features/subscription/api/useSubscriptionLifecycleQuery";
import { LifecycleCard } from "@/features/subscription/components/LifecycleCard";
import { LifecycleScaffold } from "@/features/subscription/components/LifecycleScaffold";

interface BillingFixScreenProps {
  source: string;
  onClose: () => void;
}

/**
 * "Ödemeyi düzelt" ekranı (C10). Ödeme sorunu varken paywall da BUNU
 * açıyor: sorunu olan bir aboneye yeniden satış yapmak yerine mevcut
 * aboneliğini kurtarmasına yardım ediliyor (Vocabulary §11.4).
 *
 * İki durum: grace (premium sürüyor, bitiş tarihi biliniyorsa yazılıyor)
 * ve billing retry (premium durdu, Apple tahsilatı yeniden deniyor; ödeme
 * düzelince webhook RENEWAL ile premium kendiliğinden açılır).
 */
export function BillingFixScreen({ source, onClose }: BillingFixScreenProps) {
  const { t, i18n } = useTranslation();
  const palette = useHomePalette();
  const { data: lifecycle } = useSubscriptionLifecycleQuery();
  const isRetry = lifecycle?.status === "billing_retry";
  const graceEnds = lifecycle?.status === "grace" ? lifecycle.graceEndsAt : null;

  useEffect(() => {
    trackEvent("billing_fix_opened", { source, status: lifecycle?.status ?? "unknown" });
    // Yalnızca açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = isRetry
    ? t("subscription.billing.bodyRetry")
    : graceEnds
      ? t("subscription.billing.body", { date: formatDay(graceEnds, i18n.language) })
      : t("subscription.billing.bodyNoDate");

  const fix = async () => {
    trackEvent("billing_fix_cta_tapped", { source });
    const opened = await openStoreBilling();
    if (!opened) Alert.alert(t("common.errorTitle"), t("subscription.manage.storeOpenError"));
  };

  const manage = async () => {
    trackEvent("billing_fix_manage_tapped", { source });
    const opened = await openStoreSubscriptions();
    if (!opened) Alert.alert(t("common.errorTitle"), t("subscription.manage.storeOpenError"));
  };

  const later = () => {
    trackEvent("billing_fix_dismissed", { source });
    onClose();
  };

  return (
    <LifecycleScaffold
      title={t(isRetry ? "subscription.billing.titleRetry" : "subscription.billing.title")}
      onBack={later}
    >
      <LifecycleCard>
        <Text style={[homeType.cardSub, { color: palette.ink }]}>{body}</Text>
        <Text style={[detailType.statLabel, styles.note, { color: palette.muted }]}>
          {t("subscription.billing.note")}
        </Text>
      </LifecycleCard>
      <Button label={t("subscription.billing.cta")} onPress={() => void fix()} fullWidth />
      <Button
        label={t("subscription.billing.manage")}
        onPress={() => void manage()}
        variant="secondary"
        fullWidth
      />
      <Button label={t("subscription.billing.later")} onPress={later} variant="ghost" fullWidth />
    </LifecycleScaffold>
  );
}

const styles = StyleSheet.create({
  note: {
    fontWeight: "400",
  },
});
