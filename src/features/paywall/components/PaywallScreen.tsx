import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { homeMetrics, paywallMetrics, paywallType, radius, searchColors, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { isPurchasesAvailable } from "@/lib/revenuecat";
import { Button, LoadingState, MascotAnim } from "@/components/ui";

import { useOfferingsQuery } from "@/features/paywall/api/useOfferingsQuery";
import { usePaywallFactsQuery } from "@/features/paywall/api/usePaywallFactsQuery";
import {
  trialEligibilityOrNone,
  useTrialEligibilityQuery,
} from "@/features/paywall/api/useTrialEligibilityQuery";
import { PaywallActivity } from "@/features/paywall/components/PaywallActivity";
import { PaywallBenefits } from "@/features/paywall/components/PaywallBenefits";
import { PaywallLegal } from "@/features/paywall/components/PaywallLegal";
import { PaywallPlanCard } from "@/features/paywall/components/PaywallPlanCard";
import { buildPlanOptions } from "@/features/paywall/planModel";
import { computePaywallLayout } from "@/features/paywall/paywallLayout";
import { headlineKeyFor } from "@/features/paywall/paywallHeadlines";
import { placementFor } from "@/features/paywall/paywallSources";
import { takeTriggerLatencyMs } from "@/features/paywall/openPaywall";
import { PaywallTrialTimeline } from "@/features/paywall/components/PaywallTrialTimeline";
import { usePurchaseFlow } from "@/features/paywall/hooks/usePurchaseFlow";
import { canOfferReminders } from "@/features/reminders";

import type { ReactNode } from "react";
import type { PaywallCloseReason } from "@/features/paywall/hooks/usePurchaseFlow";

interface PaywallScreenProps {
  /**
   * `reason`: satın almadan mı kapandı. Teklif motoru (`paywall_closed`)
   * ve onboarding çıkış teklifi yalnızca "dismissed"i dinliyor.
   */
  onClose: (reason: PaywallCloseReason) => void;
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
  /**
   * "timeline" (1.1.0, onboarding): seçili plan denemeye uygunsa CTA'nın
   * hemen üstünde Bugün / hatırlatma / tahsilat çizelgesi, "N gün ücretsiz
   * başla" CTA'sı ve yalnızca üç fayda.
   */
  variant?: "standard" | "timeline";
  /** Kişisel başlık (onboarding cevaplarından, çağıran çeviriyor). */
  headlineOverride?: { title: string; subtitle: string } | null;
}

/** Zaman çizelgeli varyantta gösterilen üç fayda. */
const TIMELINE_BENEFITS = ["studioAudio", "unlimitedLookups", "smartPractice"];

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
  variant = "standard",
  headlineOverride = null,
}: PaywallScreenProps) {
  const { t } = useTranslation();
  const { theme, themeName } = useTheme();
  const {
    data: packages,
    isLoading,
    isFetching,
    isError: offeringsFailed,
    refetch,
  } = useOfferingsQuery(offeringId);
  /** C15: her paywall olayına eklenen yer türü (kaynaktan türetiliyor). */
  const placement = placementFor(source);
  const { data: facts } = usePaywallFactsQuery();
  const { data: trialEligible } = useTrialEligibilityQuery(packages);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Bildirim izni reddedilmişse çizelge "hatırlatırız" demiyor.
  const [canRemind, setCanRemind] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (variant !== "timeline") return;
    let alive = true;
    void canOfferReminders().then((value) => {
      if (alive) setCanRemind(value);
    });
    return () => {
      alive = false;
    };
  }, [variant]);

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
  const { busy, purchase, restore, outcomeRef } = usePurchaseFlow({ source, placement, onClose });

  useEffect(() => {
    viewedAtRef.current = Date.now();
    // load_ms: openPaywall() tetiklemesinden ekranın açılmasına (C14). Gömülü
    // (onboarding) ya da derin bağlantıyla açılışta tetikleme yok, alan yok.
    const loadMs = takeTriggerLatencyMs(source);
    trackEvent("paywall_viewed", {
      source,
      placement,
      variant,
      ...(loadMs !== null ? { load_ms: loadMs } : {}),
    });
  }, [source, placement, variant]);

  /**
   * Paket gelmedi (C14 `paywall_view_failed`): kullanıcı fiyatı hiç görmedi.
   * Eskiden yalnızca `paywall_dismissed.had_packages=false` ile, ekran
   * KAPANINCA anlaşılıyordu. Ekran başına bir kez.
   */
  const viewFailedTrackedRef = useRef(false);
  const packagesSettledEmpty =
    isPurchasesAvailable && !isLoading && !isFetching && options.length === 0;
  useEffect(() => {
    if (!packagesSettledEmpty || viewFailedTrackedRef.current) return;
    viewFailedTrackedRef.current = true;
    trackEvent("paywall_view_failed", {
      source,
      placement,
      reason: offeringsFailed ? "offerings_error" : "no_packages",
    });
  }, [packagesSettledEmpty, offeringsFailed, source, placement]);

  const handleDismiss = useCallback(() => {
    if (outcomeRef.current === "pending") {
      trackEvent("paywall_dismissed", {
        source,
        placement,
        seconds_on_screen: Math.round((Date.now() - viewedAtRef.current) / 1000),
        // Plan seçtiyse niyet vardı ama fiyatta vazgeçti; hiç seçmediyse
        // teklif en baştan tutmadı. İkisi çok farklı sorunlar.
        selected_plan: selected?.kind ?? "none",
        had_packages: options.length > 0,
      });
    }
    onClose("dismissed");
  }, [onClose, options.length, outcomeRef, selected, source, placement]);

  /**
   * Satın alma ve geri yükleme akışı `usePurchaseFlow`'da (indirim ekranı ve
   * onboarding çıkış teklifiyle ORTAK). ADR-009 gerekçeleri orada.
   */
  const handlePurchase = useCallback(async () => {
    if (!selected) return;
    await purchase({
      pkg: selected.pkg,
      plan: selected.kind,
      trialDays: selected.trial?.days ?? null,
    });
  }, [purchase, selected]);

  const handleRestore = useCallback(async () => {
    await restore();
  }, [restore]);

  // Başlık, paywall'ın açıldığı ana göre: kullanıcı o an neyi istiyorsa
  // onu söyle (dinlemek, quiz, kelime...). Bilinmeyen kaynakta genel başlık.
  const headline = headlineKeyFor(source);
  const titleText =
    headlineOverride?.title ??
    t(headline ? `paywall.headlines.${headline}.title` : "paywall.title");
  const subtitleText =
    headlineOverride?.subtitle ??
    t(headline ? `paywall.headlines.${headline}.subtitle` : "paywall.subtitle");

  const isTimeline = variant === "timeline";
  const ctaLabel = selected?.trial
    ? t(isTimeline ? "paywall.ctaTrialStart" : "paywall.ctaTrial", { count: selected.trial.days })
    : t("paywall.ctaSubscribe");
  // Seçili planda deneme yok ama başka planda var (tipik: aylık seçildi):
  // açıkça söyle -- kullanıcı "ücretsiz" sanıp ödemesin.
  const trialElsewhere = !selected?.trial && options.some((option) => option.trial !== null);
  const showTimeline = isTimeline && selected?.trial != null && selected.trial.days >= 2;

  const timelineTrackedRef = useRef(false);
  useEffect(() => {
    if (!showTimeline || timelineTrackedRef.current) return;
    timelineTrackedRef.current = true;
    trackEvent("paywall_timeline_shown", { source, placement, can_remind: canRemind });
  }, [showTimeline, source, placement, canRemind]);

  const periodLabel =
    selected?.kind === "annual"
      ? t("paywall.plan.periodYear")
      : selected?.kind === "monthly"
        ? t("paywall.plan.periodMonth")
        : "";

  const isBusy = busy !== null;

  // Kahraman alanı kalan yüksekliğe göre: iki plan + CTA her telefonda
  // kaydırmadan görünür (bkz. paywallLayout.ts ve testi).
  const { height: windowHeight } = useWindowDimensions();
  const { top: safeTop } = useSafeAreaInsets();
  const hasIntroRibbon = highlightIntroOffer && selected?.savingsPercent != null;
  const layout = useMemo(
    () =>
      computePaywallLayout({ windowHeight, safeTop, hasIntroRibbon, hasTimeline: showTimeline }),
    [windowHeight, safeTop, hasIntroRibbon, showTimeline],
  );

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
      <ScrollView
        contentContainerStyle={[styles.content, { gap: layout.gap, paddingTop: layout.topPadding }]}
      >
        {/* Taçlı maskot (assets/anim/mascot-crown.webp): ekranın tek
            "kutlama" öğesi. Boyu kalan yüksekliğe göre; çok kısa ekranda
            hiç çizilmiyor -- planlar her zaman önce gelir. */}
        {layout.mascotHeight > 0 ? (
          <MascotAnim name="crown" width={layout.mascotHeight} style={styles.crown} />
        ) : null}

        {hasIntroRibbon && selected?.savingsPercent != null ? (
          <View style={[styles.introRibbon, { backgroundColor: theme.accent }]}>
            <Text style={[paywallType.planBadge, { color: theme.text.onAccent }]}>
              {t("paywall.introOffer", { percent: selected.savingsPercent })}
            </Text>
          </View>
        ) : null}

        <Text
          style={[
            layout.compact ? paywallType.titleCompact : paywallType.title,
            styles.centered,
            { color: theme.text.primary },
          ]}
        >
          {titleText}
        </Text>
        {layout.showSubtitle ? (
          <Text
            style={[
              layout.compact ? paywallType.subtitleCompact : paywallType.subtitle,
              styles.centered,
              { color: theme.text.secondary },
            ]}
          >
            {subtitleText}
          </Text>
        ) : null}

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
                trackEvent("paywall_packages_retry", { source, placement });
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
                placement,
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

        {/* 1.1.0: deneme zaman çizelgesi planların hemen altında, yani
            sabit alttaki CTA'nın hemen üstünde. Yalnızca SEÇİLİ plan
            gerçekten denemeye uygunken (uygunluk sorgusu + introPrice). */}
        {showTimeline && selected?.trial ? (
          <PaywallTrialTimeline
            trialDays={selected.trial.days}
            priceString={selected.pkg.product.priceString}
            periodLabel={periodLabel}
            canRemind={canRemind}
            now={now}
          />
        ) : null}
        {trialElsewhere ? (
          <Text style={[paywallType.legal, styles.centered, { color: theme.text.secondary }]}>
            {t("paywall.noTrialOnPlan")}
          </Text>
        ) : null}

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
          only={isTimeline ? TIMELINE_BENEFITS : undefined}
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

      {/* Kapat düğmesi köşede yüzüyor: ayrı bir satır olarak planları 60 pt
          aşağı itiyordu. Maskot ortalı ve dar, çakışmıyor; maskot yoksa
          içerik üstten düğme kadar boşluk bırakıyor. */}
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

/**
 * Yerleşim. Sayısal ölçüler `paywallMetrics` ve `paywallType` içinde --
 * hepsi docs/reference/paywall1.jpeg ve paywall2.jpeg'den piksel olarak
 * çıkarıldı (1pt = 2.4046px).
 */
const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    left: spacing.md,
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
