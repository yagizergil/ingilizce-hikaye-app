import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { isPurchasesAvailable, purchasePackage, restorePurchases } from "@/lib/revenuecat";
import { Button, LoadingState } from "@/components/ui";

import { useOfferingsQuery } from "@/features/paywall/api/useOfferingsQuery";
import { usePaywallFactsQuery } from "@/features/paywall/api/usePaywallFactsQuery";
import { subscriptionQueryKeys } from "@/features/paywall/api/useSubscriptionQuery";
import { waitForServerPremium } from "@/features/paywall/api/waitForServerPremium";
import { PaywallBenefits } from "@/features/paywall/components/PaywallBenefits";
import { PaywallLegal } from "@/features/paywall/components/PaywallLegal";
import { PlanOptionRow } from "@/features/paywall/components/PlanOptionRow";
import { buildPlanOptions } from "@/features/paywall/planModel";

interface PaywallScreenProps {
  onClose: () => void;
  /** Paywall'un nereden açıldığı — dönüşüm analizi için. */
  source: string;
}

/** Ekranın o anda hangi işi yaptığı. */
type Busy = null | { kind: "purchase"; id: string } | { kind: "restore" } | { kind: "activating" };

/**
 * Premium teklifi.
 *
 * NEREDE AÇILMAZ: reader ekranının hiçbir yerinde ve kelime kaydetme
 * sheet'inde (ürün ilkesi #1). Açıldığı yerler: Kelimelerim sekmesi,
 * Profil, kitap bitirme ekranı ve tekrar serisi kilometre taşı — hepsi
 * okuma akışının dışında.
 *
 * FİYAT KODA GÖMÜLÜ DEĞİL: paketler RevenueCat'ten geliyor,
 * `product.priceString` App Store'un o bölge için biçimlediği metin.
 *
 * SATIN ALMA SONRASI NE OLUYOR: yetkiyi artık istemci yazmıyor (yazamıyor
 * da — bkz. migration 028). RevenueCat webhook'u sunucuya yazana kadar
 * ekran "etkinleştiriliyor" durumunda bekliyor. Bu bekleme kozmetik değil:
 * ücretsiz katman sınırını sunucudaki tetikleyici zorluyor, dolayısıyla
 * sunucu 'premium' demeden ekranı kapatmak kullanıcıyı ödediği hâlde
 * sınırlı bir duruma bırakırdı.
 */
export function PaywallScreen({ onClose, source }: PaywallScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { data: packages, isLoading } = useOfferingsQuery();
  const { data: facts } = usePaywallFactsQuery();

  const [busy, setBusy] = useState<Busy>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const options = useMemo(() => buildPlanOptions(packages ?? []), [packages]);

  // Önerilen plan (yıllık) ön seçili gelir. `selectedId` yalnızca kullanıcı
  // başka bir plana dokunduğunda doluyor, yani paketler geç yüklendiğinde
  // seçim yine de doğru yere düşüyor.
  const selected =
    options.find((option) => option.pkg.identifier === selectedId) ??
    options.find((option) => option.isRecommended) ??
    options[0] ??
    null;

  /**
   * Huni ölçümü (bkz. docs/plans/2026-09-07-buyume-onerileri.md, Ö12).
   *
   * NEDEN: telemetri paywall'ın AÇILDIĞINI ve satın almanın BİTTİĞİNİ
   * görüyordu ama aradaki kaybı hiç görmüyordu. "100 kişi paywall'ı açtı,
   * 3'ü satın aldı" biliniyordu; 97'sinin nerede ve ne kadar sonra
   * vazgeçtiği bilinmiyordu — yani hiçbir iyileştirmenin işe yarayıp
   * yaramadığı ölçülemiyordu.
   *
   * `viewedAtRef` süreyi, `outcomeRef` ise kapanışın bir vazgeçme mi yoksa
   * başarılı satın almanın doğal sonucu mu olduğunu ayırıyor —
   * `onClose()` her iki durumda da çağrılıyor.
   */
  // 0 ile baslatiliyor; gercek deger asagidaki effect'te yaziliyor.
  // `useRef(Date.now())` render sirasinda saf olmayan bir cagri olurdu.
  const viewedAtRef = useRef(0);
  const outcomeRef = useRef<"pending" | "purchased">("pending");

  useEffect(() => {
    viewedAtRef.current = Date.now();
    trackEvent("paywall_viewed", { source });
  }, [source]);

  const handleDismiss = useCallback(() => {
    if (outcomeRef.current === "pending") {
      trackEvent("paywall_dismissed", {
        source,
        seconds_on_screen: Math.round((Date.now() - viewedAtRef.current) / 1000),
        // Plan seçtiyse niyet vardı ama fiyatta vazgeçti; hiç seçmediyse
        // teklif en baştan tutmadı. İkisi çok farklı sorunlar.
        selected_plan: selected?.kind ?? "none",
        had_packages: options.length > 0,
      });
    }
    onClose();
  }, [onClose, options.length, selected, source]);

  const refreshStatus = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.all });
  }, [queryClient]);

  const handlePurchase = useCallback(async () => {
    if (!selected) return;

    setBusy({ kind: "purchase", id: selected.pkg.identifier });
    const outcome = await purchasePackage(selected.pkg, { source, plan: selected.kind });

    if (outcome.status === "cancelled") {
      setBusy(null);
      return;
    }

    if (outcome.status === "error") {
      setBusy(null);
      Alert.alert(t("common.errorTitle"), t("paywall.purchaseError"));
      return;
    }

    if (outcome.status === "not_entitled") {
      setBusy(null);
      Alert.alert(t("paywall.notEntitledTitle"), t("paywall.notEntitledBody"));
      return;
    }

    // Apple onayladı. Kapanış artık bir vazgeçme değil.
    outcomeRef.current = "purchased";
    if (selected.trial) {
      // Deneme başlangıcı ayrı bir olay: deneme→ödeme dönüşümü ancak
      // denemenin ne zaman başladığı bilinirse ölçülebilir.
      trackEvent("trial_started", {
        source,
        plan: selected.kind,
        trial_days: selected.trial.days,
      });
    }

    // Sunucunun webhook ile yetkiyi yazmasını bekle.
    setBusy({ kind: "activating" });
    const confirmed = await waitForServerPremium();
    setBusy(null);
    refreshStatus();

    if (confirmed) {
      onClose();
      return;
    }

    // Zaman aşımı bir hata değil: satın alma Apple tarafında tamamlandı,
    // yalnızca sunucu tarafı gecikti. Kullanıcıyı bu ekranda tutmanın
    // faydası yok — durumu açıkça söyleyip kapatıyoruz.
    Alert.alert(t("paywall.activatingTitle"), t("paywall.activatingBody"), [
      { text: t("common.ok"), onPress: onClose },
    ]);
  }, [onClose, refreshStatus, selected, source, t]);

  const handleRestore = useCallback(async () => {
    setBusy({ kind: "restore" });
    const restored = await restorePurchases();

    if (!restored) {
      setBusy(null);
      refreshStatus();
      Alert.alert(t("paywall.restoreEmptyTitle"), t("paywall.restoreEmptyBody"));
      return;
    }

    // Geri yükleme de sunucuda bir RevenueCat olayı doğurur; satın almayla
    // aynı bekleme geçerli.
    setBusy({ kind: "activating" });
    const confirmed = await waitForServerPremium();
    setBusy(null);
    refreshStatus();

    Alert.alert(
      confirmed ? t("paywall.restoreFoundTitle") : t("paywall.activatingTitle"),
      confirmed ? t("paywall.restoreFoundBody") : t("paywall.activatingBody"),
      [{ text: t("common.ok"), onPress: onClose }],
    );
  }, [onClose, refreshStatus, t]);

  const ctaLabel = selected?.trial
    ? t("paywall.ctaTrial", { count: selected.trial.days })
    : t("paywall.ctaSubscribe");

  const periodLabel =
    selected?.kind === "annual"
      ? t("paywall.plan.periodYear")
      : selected?.kind === "monthly"
        ? t("paywall.plan.periodMonth")
        : "";

  const isBusy = busy !== null;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={spacing.sm}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={t("common.dismiss")}
        >
          <Ionicons name="close" size={24} color={theme.text.secondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[type.display, { color: theme.text.primary }]}>{t("paywall.title")}</Text>
        <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
          {t("paywall.subtitle")}
        </Text>

        {facts && facts.bookCount > 0 ? (
          <Text style={[monoType.eyebrow, { color: theme.accent }]}>
            {t("paywall.socialProof", { count: facts.bookCount })}
          </Text>
        ) : null}

        <PaywallBenefits
          aiFreeLimit={facts?.aiFreeLimit ?? 0}
          aiPremiumLimit={facts?.aiPremiumLimit ?? 0}
        />

        {!isPurchasesAvailable ? (
          <Text style={[monoType.label, styles.notice, { color: theme.text.secondary }]}>
            {t("paywall.unavailableInExpoGo")}
          </Text>
        ) : isLoading ? (
          <LoadingState />
        ) : options.length === 0 ? (
          <Text style={[monoType.label, styles.notice, { color: theme.text.secondary }]}>
            {t("paywall.noPackages")}
          </Text>
        ) : (
          <>
            <View style={styles.plans} accessibilityRole="radiogroup">
              {options.map((option) => (
                <PlanOptionRow
                  key={option.pkg.identifier}
                  option={option}
                  selected={selected?.pkg.identifier === option.pkg.identifier}
                  onSelect={() => {
                    trackEvent("paywall_plan_selected", {
                      plan: option.kind,
                      package_id: option.pkg.identifier,
                      source,
                    });
                    setSelectedId(option.pkg.identifier);
                  }}
                  disabled={isBusy}
                />
              ))}
            </View>

            <Button
              label={busy?.kind === "activating" ? t("paywall.activatingCta") : ctaLabel}
              onPress={() => void handlePurchase()}
              fullWidth
              loading={busy?.kind === "purchase" || busy?.kind === "activating"}
              disabled={isBusy || selected === null}
            />

            <PaywallLegal
              priceString={selected?.pkg.product.priceString ?? null}
              trialDays={selected?.trial?.days ?? null}
              periodLabel={periodLabel}
            />
          </>
        )}

        <Text style={[monoType.label, styles.notice, { color: theme.text.secondary }]}>
          {t("paywall.freeAlwaysNote")}
        </Text>

        {isPurchasesAvailable ? (
          <Button
            label={t("paywall.restore")}
            onPress={() => void handleRestore()}
            variant="secondary"
            fullWidth
            loading={busy?.kind === "restore"}
            disabled={isBusy}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: "flex-start",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  plans: {
    gap: spacing.sm,
  },
  notice: {
    textAlign: "center",
  },
});
