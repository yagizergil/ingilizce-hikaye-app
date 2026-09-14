import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { paywallMetrics, paywallType, radius, spacing } from "@/theme";
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
import { PaywallPlanCard } from "@/features/paywall/components/PaywallPlanCard";
import { buildPlanOptions } from "@/features/paywall/planModel";

// Lottie kaynağı proje kökündeki assets/ altında; alias (@) src/ işaret
// ettiği için burada göreli yol kullanılıyor.
import crownAnimation from "../../../../assets/crown.json";

import type { ReactNode } from "react";

interface PaywallScreenProps {
  onClose: () => void;
  /** Paywall'un nereden açıldığı — dönüşüm analizi için. */
  source: string;
  /**
   * Başlığın hemen altına giren ekstra blok (onboarding'in deneme takvimi).
   *
   * NEDEN AYRI BİR PAYWALL YAZILMADI: fiyat, plan seçimi, geri yükleme ve
   * yasal blok tek yerde kalmalı. Apple reddi (3.1.2(c)) tam olarak bu
   * bloğun görünürlüğüyle ilgiliydi; ikinci bir kopya, düzeltmenin yalnızca
   * birinde yaşaması demek olurdu.
   */
  intro?: ReactNode;
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
export function PaywallScreen({ onClose, source, intro }: PaywallScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { data: packages, isLoading, isFetching, refetch } = useOfferingsQuery();
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
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      {/* Kaydırma göstergesi AÇIK. Kapalıydı ve bu, Apple reddinin (3.1.2(c),
          2026-09-09) doğrudan sebebiydi: iPad'de içerik taşıyor, inceleyen
          kişi kesilmiş bir düğme görüyor ve altta daha fazlası olduğuna dair
          hiçbir işaret bulunmuyordu. */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleDismiss}
            hitSlop={spacing.sm}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel={t("common.dismiss")}
            style={[styles.closeButton, { backgroundColor: theme.bg.surface }]}
          >
            <Ionicons name="close" size={paywallMetrics.closeIcon} color={theme.text.secondary} />
          </Pressable>
        </View>

        {/* Taç -- assets/crown.json (Lottie). Statik bir ikon yerine
            animasyon: referansın tepesinde de hareketli bir taç var ve
            ekranın tek "kutlama" öğesi bu. */}
        <LottieView source={crownAnimation} autoPlay loop style={styles.crown} />

        <Text style={[paywallType.title, styles.centered, { color: theme.text.primary }]}>
          {t("paywall.title")}
        </Text>
        <Text style={[paywallType.subtitle, styles.centered, { color: theme.text.secondary }]}>
          {t("paywall.subtitle")}
        </Text>

        {intro}

        {!isPurchasesAvailable ? (
          <Text style={[paywallType.legal, styles.centered, { color: theme.text.secondary }]}>
            {t("paywall.unavailableInExpoGo")}
          </Text>
        ) : isLoading ? (
          <LoadingState />
        ) : options.length === 0 ? (
          <View style={styles.plans}>
            <Text style={[paywallType.legal, styles.centered, { color: theme.text.secondary }]}>
              {t("paywall.noPackages")}
            </Text>
            <Button
              label={t("paywall.retryPackages")}
              variant="secondary"
              onPress={() => {
                trackEvent("paywall_packages_retry", { source });
                void refetch();
              }}
              loading={isFetching}
              fullWidth
            />
          </View>
        ) : (
          <PaywallPlanCard
            options={options}
            selectedId={selected?.pkg.identifier ?? null}
            disabled={isBusy}
            onSelect={(option) => {
              trackEvent("paywall_plan_selected", {
                plan: option.kind,
                package_id: option.pkg.identifier,
                source,
              });
              setSelectedId(option.pkg.identifier);
            }}
          />
        )}

        <Text
          style={[paywallType.sectionLabel, styles.sectionLabel, { color: theme.text.secondary }]}
        >
          {t("paywall.benefitsSectionTitle")}
        </Text>

        <PaywallBenefits
          aiFreeLimit={facts?.aiFreeLimit ?? 0}
          aiPremiumLimit={facts?.aiPremiumLimit ?? 0}
          freeWordLookups={facts?.freeWordLookups ?? 0}
        />

        {facts && facts.bookCount > 0 ? (
          <Text style={[paywallType.legal, styles.centered, { color: theme.text.secondary }]}>
            {t("paywall.socialProof", { count: facts.bookCount })}
          </Text>
        ) : null}

        <Text style={[paywallType.legal, styles.centered, { color: theme.text.secondary }]}>
          {t("paywall.freeAlwaysNote")}
        </Text>
      </ScrollView>

      {/* SABİT ALT BÖLÜM — kaydırmanın DIŞINDA ve bu bilinçli.
       *
       * Apple 1.0(6) sürümünü Guideline 3.1.2(c) ile reddetti: Kullanım
       * Koşulları bağlantısını bulamadı. Bağlantı ekranda VARDI ama
       * kaydırma alanının en altındaydı ve inceleme cihazında (iPad Air
       * 11") içerik taştığı için hiç görünmedi.
       *
       * Kaydırmayı düzeltmek tek başına yetmez: aynı hata her yeni ekran
       * boyutunda geri gelebilir. Bloğu kaydırmanın dışına almak sorunu
       * sınıf olarak ortadan kaldırıyor — yasal bağlantılar ve satın alma
       * düğmesi, cihaz ne olursa olsun her zaman ekranda. */}
      <View style={[styles.footer, { borderTopColor: theme.border.hairline }]}>
        <PaywallLegal
          priceString={selected?.pkg.product.priceString ?? null}
          trialDays={selected?.trial?.days ?? null}
          periodLabel={periodLabel}
          onRestore={isPurchasesAvailable ? () => void handleRestore() : undefined}
          restoreBusy={busy?.kind === "restore"}
        />

        {isPurchasesAvailable && options.length > 0 ? (
          <Pressable
            onPress={() => void handlePurchase()}
            disabled={isBusy || selected === null}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.accent,
                opacity: isBusy || selected === null ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[paywallType.cta, { color: theme.text.onAccent }]}>
              {busy?.kind === "activating" ? t("paywall.activatingCta") : ctaLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/**
 * Yerleşim. Sayısal ölçüler `paywallMetrics` ve `paywallType` içinde --
 * hepsi docs/reference/paywall1.jpeg ve paywall2.jpeg'den piksel olarak
 * çıkarıldı (1pt = 2.4046px).
 */
const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  headerRow: {
    alignItems: "flex-start",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  crown: {
    width: paywallMetrics.crownSize,
    height: paywallMetrics.crownSize,
    alignSelf: "center",
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    textAlign: "center",
  },
  sectionLabel: {
    paddingTop: spacing.sm,
  },
  plans: {
    gap: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    height: paywallMetrics.ctaHeight,
    // Ölçüm: köşe içe çekilmesi 18 pt -- tam hap (25) değil.
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
