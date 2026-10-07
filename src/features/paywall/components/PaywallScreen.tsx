import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  homeMetrics,
  paywallMetrics,
  paywallType,
  radius,
  searchColors,
  spacing,
  mascotSize,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { isPurchasesAvailable, purchasePackage, restorePurchases } from "@/lib/revenuecat";
import { Button, LoadingState, MascotAnim } from "@/components/ui";

import { useOfferingsQuery } from "@/features/paywall/api/useOfferingsQuery";
import { usePaywallFactsQuery } from "@/features/paywall/api/usePaywallFactsQuery";
import {
  trialEligibilityOrNone,
  useTrialEligibilityQuery,
} from "@/features/paywall/api/useTrialEligibilityQuery";
import { waitForServerPremium } from "@/features/paywall/api/waitForServerPremium";
import { PaywallActivity } from "@/features/paywall/components/PaywallActivity";
import { PaywallBenefits } from "@/features/paywall/components/PaywallBenefits";
import { PaywallLegal } from "@/features/paywall/components/PaywallLegal";
import { PaywallPlanCard } from "@/features/paywall/components/PaywallPlanCard";
import { buildPlanOptions } from "@/features/paywall/planModel";

import type { ReactNode } from "react";

interface PaywallScreenProps {
  onClose: () => void;
  /** Paywall'un nereden açıldığı — dönüşüm analizi için. */
  source: string;
  /** Kota bittiği için gelindiyse kullanıcının takıldığı kelime. */
  blockedWord?: string | null;
  /**
   * Başlığın hemen altına giren ekstra blok (onboarding'in deneme takvimi).
   *
   * NEDEN AYRI BİR PAYWALL YAZILMADI: fiyat, plan seçimi, geri yükleme ve
   * yasal blok tek yerde kalmalı. Apple reddi (3.1.2(c)) tam olarak bu
   * bloğun görünürlüğüyle ilgiliydi; ikinci bir kopya, düzeltmenin yalnızca
   * birinde yaşaması demek olurdu.
   */
  intro?: ReactNode;
  /**
   * Gösterilecek RevenueCat teklifi. Onboarding kendi teklifini
   * ("onboarding") istiyor; tanımlı değilse varsayılana düşülüyor
   * (bkz. `fetchOfferingPackages`).
   */
  offeringId?: string | null;
  /**
   * Başlığın üstünde "sana özel" şeridi gösterilsin mi.
   *
   * YALNIZCA GERÇEK BİR AVANTAJ VARSA: şerit, yıllık planın aylığa göre
   * ÖLÇÜLEN tasarrufunu yazıyor (`savingsPercent`, RevenueCat fiyatlarından
   * hesaplanıyor). Uydurma bir "%50 indirim" yazmak yanıltıcı metadata
   * olurdu (Guideline 2.3.1); tasarruf hesaplanamıyorsa şerit hiç
   * görünmüyor.
   */
  highlightIntroOffer?: boolean;
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
export function PaywallScreen({
  onClose,
  source,
  blockedWord = null,
  intro,
  offeringId,
  highlightIntroOffer = false,
}: PaywallScreenProps) {
  const { t } = useTranslation();
  const { theme, themeName } = useTheme();
  const queryClient = useQueryClient();
  const { data: packages, isLoading, isFetching, refetch } = useOfferingsQuery(offeringId);
  const { data: facts } = usePaywallFactsQuery();
  const { data: trialEligible } = useTrialEligibilityQuery(packages);

  const [busy, setBusy] = useState<Busy>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * DENEME İDDİASI UYGUNLUĞA BAĞLI (Guideline 2.3.1).
   *
   * `trialEligibilityOrNone` yanıt gelmeden ya da çağrı başarısız olduğunda
   * boş küme veriyor: deneme cümlesi (CTA'da "7 gün ücretsiz dene", yasal
   * blokta "İlk 7 gün ücretsiz") o sırada HİÇ yazılmıyor. Denemesini
   * kullanmış birine yazılması, ödeme anında ücret çekilmesi demekti.
   */
  const options = useMemo(
    () => buildPlanOptions(packages ?? [], trialEligibilityOrNone(trialEligible)),
    [packages, trialEligible],
  );

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

  /**
   * Premium AÇILDIKTAN SONRA HER ŞEYİN yenilenmesi gerekiyor -- yalnızca
   * abonelik durumunun değil.
   *
   * ÇÖZÜLEN HATA (2026-09-15): burada yalnızca `subscriptionQueryKeys.all`
   * invalidate ediliyordu. Ama premium'a bağlı başka sorgular AYRI query
   * key'ler kullanıyor -- `bookAudioAccessKeys` ("Dinle" düğmesinin
   * görünürlüğü), `wordQuotaQueryKey` (kelime çevirisi rozeti), cümle
   * çevirisi kotası. Bunlar kendi `staleTime`'ları dolana kadar (bazıları
   * 60 saniye) ESKİ "ücretsiz" durumu göstermeye devam ediyordu: kullanıcı
   * paywall'dan satın alıp kitap detayına döndüğünde "Dinle" düğmesi
   * HÂLÂ görünmüyordu -- ki bu tam olarak ADR-012'nin "erişim yoksa
   * düğme hiç görünmez" kuralı yüzünden fark edilmesi zor bir sessiz
   * hataydı: kullanıcı arıza mı yoksa satın almanın işlemediğini mi
   * düşüneceğini bilemezdi.
   *
   * Parametresiz `invalidateQueries()` TÜM önbelleği geçersiz kılıyor.
   * Maliyeti kabul edilebilir: bu yalnızca satın alma/geri yükleme
   * BAŞARILI olduğunda, oturum başına birkaç kez çalışan bir olay.
   */
  const refreshStatus = useCallback(() => {
    void queryClient.invalidateQueries();
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

    /**
     * "YETKİ GÖRÜNMÜYOR" KARARINI SUNUCU VERİR, İSTEMCİ DEĞİL.
     *
     * DENETİM BULGUSU (2026-09-19): burada karar RevenueCat SDK'sının
     * İSTEMCİDEKİ anlık görüntüsüne bakılarak veriliyordu. Oysa uygulamanın
     * gerçek kapısı sunucudaki `user_entitlements` satırı (ADR-009). Webhook
     * sunucuya düzgün ulaşmış ama yerel görüntü bayatsa, ödemesi BAŞARILI
     * olan kullanıcı korkutucu bir uyarı görüyor ve uyarı onu geri yüklemeye
     * yönlendiriyordu -- ki o da (yukarıdaki hata yüzünden) "aboneliğin yok"
     * diyordu. 7 Eylül'de gerçek para kaybettiren olayla aynı şekil: onarım
     * kodu depoda var ama hiçbir yol ona ulaşmıyordu.
     */
    if (outcome.status === "not_entitled") {
      setBusy({ kind: "activating" });
      const confirmed = await waitForServerPremium();
      setBusy(null);
      refreshStatus();

      if (confirmed) {
        outcomeRef.current = "purchased";
        Alert.alert(t("paywall.restoreFoundTitle"), t("paywall.restoreFoundBody"), [
          { text: t("common.ok"), onPress: onClose },
        ]);
        return;
      }

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

  /**
   * GERİ YÜKLEME ÜÇ FARKLI SONUÇ VERİR, ÜÇÜ DE AYRI ANLATILIR.
   *
   * DENETİM BULGUSU (2026-09-19): `restorePurchases()` eskiden üç durumu da
   * tek bir `false`'a indiriyordu -- gerçekten abonelik olmaması, ağ/StoreKit
   * hatası ve SDK'nın hiç kurulamamış olması. Çağıran bunların hepsine
   * "Bu Apple hesabında aktif bir abonelik yok" diyordu. Yani uygulamayı
   * zayıf bağlantıda yeniden kuran ÖDEYEN bir aboneye, olgusal olarak
   * YANLIŞ bir cümle gösteriliyordu; kullanıcı denemeyi bırakıyordu.
   *
   * Ayrıca "abonelik bulunamadı" kararı artık istemcinin anlık görüntüsüyle
   * verilmiyor: gerçek kapı sunucudaki satır (ADR-009). `waitForServerPremium`
   * bir kez `sync-entitlement` onarımını da çalıştırıyor, yani kaçan bir
   * webhook burada telafi ediliyor -- bu yol daha önce bu daldan HİÇ
   * çağrılmıyordu.
   */
  const handleRestore = useCallback(async () => {
    setBusy({ kind: "restore" });
    const outcome = await restorePurchases();

    // Mağazaya sorulamadı. Bu bir bilgi eksikliği, "aboneliğin yok" bilgisi
    // değil -- öyle sunmak ödeyen kullanıcıya yalan söylemek olurdu.
    if (outcome.status === "error") {
      setBusy(null);
      Alert.alert(t("common.errorTitle"), t("paywall.restoreErrorBody"));
      return;
    }

    setBusy({ kind: "activating" });
    const confirmed = await waitForServerPremium();
    setBusy(null);
    refreshStatus();

    // Mağaza bir şey bulamadı VE sunucu da doğrulamadı: ancak şimdi
    // "abonelik yok" denebilir.
    if (outcome.status === "none" && !confirmed) {
      Alert.alert(t("paywall.restoreEmptyTitle"), t("paywall.restoreEmptyBody"));
      return;
    }

    Alert.alert(
      confirmed ? t("paywall.restoreFoundTitle") : t("paywall.activatingTitle"),
      confirmed ? t("paywall.restoreFoundBody") : t("paywall.activatingBody"),
      [{ text: t("common.ok"), onPress: onClose }],
    );
  }, [onClose, refreshStatus, t]);

  // Başlık, paywall'ın açıldığı ana göre: kullanıcı o an neyi istiyorsa
  // onu söyle (dinlemek, quiz, kelime...). Bilinmeyen kaynakta genel başlık.
  const headline = HEADLINE_BY_SOURCE[source] ?? null;

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
      {themeName === "light" ? (
        <Svg style={styles.sky} width="100%" height={homeMetrics.paywallSky}>
          <Defs>
            <LinearGradient id="paywallSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={searchColors.skyTop} />
              <Stop offset="1" stopColor={searchColors.skyBottom} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#paywallSky)" />
        </Svg>
      ) : null}
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

        {/* Taçlı maskot (assets/anim/mascot-crown.webp): ekranın tek
            "kutlama" öğesi. */}
        <MascotAnim name="crown" width={mascotSize.hero} style={styles.crown} />

        {highlightIntroOffer && selected?.savingsPercent != null ? (
          <View style={[styles.introRibbon, { backgroundColor: theme.accent }]}>
            <Text style={[paywallType.planBadge, { color: theme.text.onAccent }]}>
              {t("paywall.introOffer", { percent: selected.savingsPercent })}
            </Text>
          </View>
        ) : null}

        <Text style={[paywallType.title, styles.centered, { color: theme.text.primary }]}>
          {t(headline ? `paywall.headlines.${headline}.title` : "paywall.title")}
        </Text>
        <Text style={[paywallType.subtitle, styles.centered, { color: theme.text.secondary }]}>
          {t(headline ? `paywall.headlines.${headline}.subtitle` : "paywall.subtitle")}
        </Text>

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

        {/* Ek içerik (onboarding'in deneme takvimi) planların ALTINDA
            (kullanıcı bulgusu, 2026-10-07): üstteyken aylık planı ekranın
            dışına itiyor, onboarding paywall'ı diğerlerinden farklı ve
            yıllığa yönlendirici görünüyordu. */}
        {intro}

        {/* Kullanıcının kendi rakamları. Geçmişi yoksa `activity` null
            geliyor ve blok hiç çizilmiyor -- gerekçe o bileşenin içinde.
            Planların ALTINDA (kullanıcı bulgusu, 2026-10-07): üstteyken
            yıllık ve aylık plan aynı ekranda görünmüyordu. */}
        {facts?.activity ? (
          <PaywallActivity activity={facts.activity} blockedWord={blockedWord} />
        ) : null}

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
        {/* Buton ÜSTTE, deneme/fiyat metni altında (kullanıcı bulgusu,
            2026-09-25): göz önce eylemi görüyor, koşulu hemen altında. */}
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
        {isPurchasesAvailable && options.length > 0 ? (
          <Text style={[paywallType.legal, styles.centered, { color: theme.text.secondary }]}>
            {t("paywall.cancelAnytime")}
          </Text>
        ) : null}

        <PaywallLegal
          priceString={selected?.pkg.product.priceString ?? null}
          trialDays={selected?.trial?.days ?? null}
          periodLabel={periodLabel}
          onRestore={isPurchasesAvailable ? () => void handleRestore() : undefined}
          restoreBusy={busy?.kind === "restore"}
        />
      </View>
    </SafeAreaView>
  );
}

const HEADLINE_BY_SOURCE: Record<string, string> = {
  audio: "listen",
  reader_listen: "listen",
  book_quiz: "quiz",
  quiz_level_passed: "quiz",
  word_quota: "words",
  word_quota_badge: "words",
  sentence_quota: "sentences",
  smart_practice: "practice",
};

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
  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  crown: {
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
  introRibbon: {
    alignSelf: "center",
    height: paywallMetrics.badgeHeight + spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: paywallMetrics.ctaHeight / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
