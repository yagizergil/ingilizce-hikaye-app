import { useCallback, useEffect, useRef } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { spacing } from "@/theme";
import { levelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import {
  Card,
  LoadingState,
  ErrorState,
  Hairline,
  SectionHeader,
  ScreenHeader,
} from "@/components/ui";
import { useVocabularyQuery } from "@/features/vocabulary";
import { ReaderSettingsSheet, useReaderSettings } from "@/features/reader";
import { useOnboardingStatusQuery } from "@/features/onboarding";
import { ReminderSettingsRow } from "@/features/reminders";
import { useActiveLanguagePairQuery } from "@/features/languagePair";
import { getLanguage } from "@/lib/languages";
import { openWriteReviewPage } from "@/lib/storeReview";
import { reloadApp } from "@/lib/rtl";

import { useProfileAuthStatus } from "@/features/profile/api/useProfileAuthStatus";
import { useProfileStatsQuery } from "@/features/profile/api/useProfileStatsQuery";
import { useSubscriptionStatusQuery } from "@/features/profile/api/useSubscriptionStatusQuery";
import { ProfileHero } from "@/features/profile/components/ProfileHero";
import { ProfileAccountRow } from "@/features/profile/components/ProfileAccountRow";
import { ProfileFooter } from "@/features/profile/components/ProfileFooter";

/**
 * Profil ekranı.
 *
 * YENİDEN TASARIM (2026-09-07). Öncesi: ekran başlıktan hemen sonra dört
 * istatistik kutusuyla açılıyor, ardından ayar satırları geliyordu. İki
 * ayrı sorun vardı:
 *
 * 1. **Sayılar çalışmıyordu.** `user_reading_stats` tablosunu okuyan taraf
 *    yazılmış, YAZAN taraf hiç yazılmamıştı; "bu hafta kaç gün / kaç
 *    dakika" sonsuza kadar sıfırdı. Çözüm ekranın dışında:
 *    `record_reading_session` (migration 026) + `useReadingSession`.
 * 2. **Ekranın bir amacı yoktu.** Kimlik yok, ilerleme hissi yok, geri
 *    dönme sebebi yok — dört ölü sayı ve bir ayarlar listesi. Rakiplerin
 *    (Duolingo, LingQ, Beelinguapp) profil ekranları sırasıyla kimlik ->
 *    seri -> haftalık grafik -> toplamlar -> ayarlar akışını izliyor,
 *    çünkü bu ekranın işi kullanıcıya kendi ilerlemesini göstermek.
 *
 * Yeni sıralama aynı akış: `ProfileHero` (kimlik) -> `StreakCard` (bugün
 * neden dönmeli) -> `WeeklyMinutesChart` (alışkanlık örüntüsü) ->
 * `ProfileStatsGrid` (tüm zamanlar) -> hesap satırları.
 *
 * Ürün ilkesi #1 korunuyor: premium teklifi yalnızca "Abonelik" satırında,
 * kullanıcının kendi dokunuşuyla açılıyor; hiçbir kartta promosyon yok.
 */
export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { theme, themeName } = useTheme();
  /** Yazı boyutu ve tema satırlarının açtığı sheet -- okuma ekranındakiyle
   * AYNI bileşen (gerekçe satırların yanındaki notta). */
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const queryClient = useQueryClient();
  const { isAnonymous, email, displayName, memberSince } = useProfileAuthStatus();
  const fontScalePercent = useReaderSettings((state) => state.fontScale);

  const statsQuery = useProfileStatsQuery();
  const vocabularyQuery = useVocabularyQuery();
  const subscriptionQuery = useSubscriptionStatusQuery();
  const onboardingQuery = useOnboardingStatusQuery();
  const languagePairQuery = useActiveLanguagePairQuery();

  useEffect(() => {
    trackEvent("profile_viewed");
  }, []);

  const handleRetry = useCallback(() => {
    void statsQuery.refetch();
    void vocabularyQuery.refetch();
    void subscriptionQuery.refetch();
  }, [statsQuery, vocabularyQuery, subscriptionQuery]);

  const handleDeleteAccount = useCallback(() => {
    trackEvent("profile_delete_account_opened");
    router.push("/delete-account");
  }, []);

  /**
   * GELİŞTİRİCİ ARACI: akışı SIFIRDAN, hiç hesap yokmuş gibi başlatır.
   *
   * NEDEN SADECE `onboarding_completed_at`'i NULL'A ÇEKMİYORUZ (eski hâli
   * buydu): o zaman dil çifti, beğenilen kitaplar, kaydedilen kelimeler ve
   * seviye yerinde kalıyordu. Akış bunları okuyup adımları önceden dolu
   * gösteriyordu -- yani ilk kullanıcının GÖRDÜĞÜ şey test edilemiyordu,
   * ki bu aracın tek amacı o.
   *
   * Şimdi hesabın kendisi siliniyor (hesap silme ekranıyla AYNI edge
   * function -- ikinci bir silme yolu yazmak, ikisinin zamanla ayrışması
   * demek olurdu), ardından yeni bir anonim oturum açılıyor. Sonuç: taze
   * bir `auth.uid()`, boş bir profil, sıfırdan onboarding.
   *
   * Önbellek de tamamen temizleniyor: eski hesabın kitapları ve kelimeleri
   * TanStack Query'de duruyor olurdu ve yeni hesap onları kendi verisi
   * sanırdı.
   *
   * Yalnızca `__DEV__` altında çağrılıyor (bkz. çağrıldığı yer).
   */
  const handleReplayOnboarding = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("no session");

      const response = await fetch(`${env.supabaseUrl}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("delete failed");

      // `scope: "local"` -- sunucuya çıkış isteği GÖNDERMİYORUZ. Hesap bir
      // satır önce silindi, yani elimizdeki jeton artık var olmayan bir
      // kullanıcıya ait; sunucu çıkışı 403 döner ve bu, oturumu yerelde
      // temizlemesi gereken adımı hataya çevirirdi.
      await supabase.auth.signOut({ scope: "local" });
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      queryClient.clear();

      /**
       * UYGULAMAYI YENİDEN YÜKLÜYORUZ -- ekran değiştirmiyoruz.
       *
       * Önce `router.replace("/")` deniyordu ve düğme "çalışmıyor" gibi
       * görünüyordu: onboarding kapısı hâlâ mount hâlindeydi ve kendi
       * sorgusu eski oturumun cevabını (onboarding tamamlandı) taşıyordu,
       * dolayısıyla akış yerine ana sayfa açılıyordu. Yeniden yükleme
       * bütün durumu -- oturum, sorgu önbelleği, kapılar, i18n -- taze
       * kurulumun yaptığı sırayla yeniden kuruyor. Zaten bu düğmenin
       * taklit etmek istediği şey tam olarak taze kurulum.
       */
      /**
       * DENETİM BULGUSU (2026-09-19): burada `DevSettings.reload()` vardı
       * ve o API YALNIZCA geliştirme derlemelerinde var. Yayın
       * derlemesinde çağrı sessizce hiçbir şey yapıyor, yani "hesabımı
       * sil"e basan kullanıcı hesabı silinmiş olduğu hâlde aynı ekranda
       * eski oturumun verisiyle kalıyordu. `reloadApp` (bkz. src/lib/rtl.ts)
       * `expo-updates` üzerinden yayında da çalışıyor.
       */
      const reloaded = await reloadApp();
      if (!reloaded) {
        // Yeniden yükleme yapılamadıysa (Expo Go) en azından köke dön --
        // sessizce aynı ekranda kalmak en kötü sonuç.
        router.replace("/");
      }
    } catch (error) {
      Alert.alert(
        t("common.errorTitle"),
        error instanceof Error ? error.message : t("account.delete.error"),
      );
    }
  }, [queryClient, t]);

  // Paywall'un açıldığı üç yerden biri (diğerleri: Kelimelerim şeridi ve
  // kitap bitirme ekranı). Hepsi okuma akışının DIŞINDA -- ürün ilkesi #1.
  const handleOpenStatistics = useCallback(() => {
    trackEvent("profile_statistics_opened");
    router.push("/statistics");
  }, []);

  const handleOpenPaywall = useCallback(() => {
    trackEvent("paywall_opened", { source: "profile" });
    router.push("/paywall?source=profile");
  }, []);

  const handleRateUs = useCallback(() => {
    void openWriteReviewPage();
  }, []);

  const stats = statsQuery.data;

  const isLoading =
    statsQuery.isLoading || vocabularyQuery.isLoading || subscriptionQuery.isLoading;
  const isError = statsQuery.isError || vocabularyQuery.isError || subscriptionQuery.isError;

  const languageCode = i18n.language.startsWith("tr") ? "tr" : "en";
  const subscriptionTier = subscriptionQuery.data ?? "free";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <ScreenHeader title={t("profile.title")} />

      {isLoading ? (
        <LoadingState message={t("profile.loading")} />
      ) : isError || !stats ? (
        <ErrorState message={t("profile.error")} onRetry={handleRetry} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHero
            displayName={displayName}
            email={email}
            isAnonymous={isAnonymous}
            targetLevel={onboardingQuery.data?.targetLevel ?? null}
            memberSince={memberSince}
          />

          {/* İSTATİSTİKLER ARTIK AYRI BİR EKRAN (bkz. StatisticsScreen).
              Seri kartı, haftalık grafik ve dört sayı burada, ayarların en
              üstünde duruyordu; "dili değiştir" için gelen kullanıcı
              aradığı satıra ulaşmadan önce üç blok istatistik geçiyordu.
              Şimdi ayarlarda tek satır, içerik kendi sayfasında. */}
          <SectionHeader title={t("profile.stats.sectionTitle")} style={styles.sectionHeader} />

          <Card style={styles.rows} bordered>
            <ProfileAccountRow
              icon="stats-chart"
              iconColor={levelAccent.A2}
              label={t("profile.stats.screenTitle")}
              value={t("profile.stats.rowValue", {
                minutes: stats.totalMinutes,
                streak: stats.currentStreak,
              })}
              onPress={handleOpenStatistics}
            />
          </Card>

          <SectionHeader title={t("profile.account.sectionTitle")} style={styles.sectionHeader} />

          <Card style={styles.rows} bordered>
            <ProfileAccountRow
              icon="star"
              iconColor={levelAccent.B1}
              label={t("profile.account.subscription")}
              value={t(
                subscriptionTier === "free"
                  ? "profile.account.subscriptionFree"
                  : "profile.account.subscriptionPremium",
              )}
              onPress={subscriptionTier === "free" ? handleOpenPaywall : undefined}
            />
            <Hairline />
            <ReminderSettingsRow />
            <Hairline />
            {/*
              DENETİM BULGUSU (2026-09-19, kullanıcı bildirimi): bu iki
              satırın `onPress`i HİÇ YOKTU. Yani ayarlarda yazı boyutu ve
              tema yazıyordu, güncel değeri de gösteriyordu, ama dokunmak
              hiçbir şey yapmıyordu -- kullanıcı ikisini de buradan
              değiştiremiyordu. Değerler zaten global store'larda
              (`useReaderSettings`, `useTheme`), yani ayar VARDI; ona
              ulaşmanın tek yolu okuma ekranının içindeki sheet'ti.

              Yeni bir ayar ekranı YAZILMADI: aynı sheet açılıyor. İkinci
              bir kopya yazmak, iki kontrolün zamanla ayrışması demekti --
              bu projede bugün tam da o sınıftan birkaç hata düzeltildi.
            */}
            <ProfileAccountRow
              icon="text"
              iconColor={levelAccent.A1}
              label={t("profile.account.fontSize")}
              value={t("profile.account.fontSizeValue", {
                percent: Math.round(fontScalePercent * 100),
              })}
              onPress={() => settingsSheetRef.current?.present()}
            />
            <Hairline />
            <ProfileAccountRow
              icon="moon"
              iconColor={levelAccent.C2}
              label={t("profile.account.theme")}
              value={t(`reader.settings.themeOptions.${themeName}`)}
              onPress={() => settingsSheetRef.current?.present()}
            />
            <Hairline />
            <ProfileAccountRow
              icon="globe"
              iconColor={levelAccent.A1}
              label={t("profile.account.language")}
              value={
                languagePairQuery.data
                  ? // Ok YÖNÜ de çeviriden geliyor: Arapça'da "←" olmalı.
                    // Koda gömülü "→" Arapça arayüzde yanlış yönü gösteriyordu.
                    t("languagePair.pairArrow", {
                      from:
                        getLanguage(languagePairQuery.data.nativeLanguage)?.nativeName ??
                        languagePairQuery.data.nativeLanguage,
                      to:
                        getLanguage(languagePairQuery.data.targetLanguage)?.nativeName ??
                        languagePairQuery.data.targetLanguage,
                    })
                  : t(`profile.account.language${languageCode === "tr" ? "Tr" : "En"}`)
              }
              onPress={() => router.push("/language-settings")}
            />
            <Hairline />
            <ProfileAccountRow
              icon="star-outline"
              iconColor={levelAccent.B2}
              label={t("profile.account.rateUs")}
              onPress={handleRateUs}
            />
            <Hairline />

            <ProfileAccountRow
              label={t("profile.account.deleteAccount")}
              onPress={handleDeleteAccount}
              destructive
            />
          </Card>

          {/* GELİŞTİRİCİ ARACI -- yalnızca geliştirme derlemesinde.
              `__DEV__` üretim paketinde `false` olduğu için bu blok
              Metro tarafından tamamen elenir; App Store'a giden ikilide
              ne düğme ne de çağırdığı kod bulunur. */}
          {__DEV__ ? (
            <Card style={styles.rows} bordered>
              <ProfileAccountRow
                label={t("profile.account.devReplayOnboarding")}
                onPress={handleReplayOnboarding}
              />
            </Card>
          ) : null}

          <ProfileFooter />
        </ScrollView>
      )}

      <ReaderSettingsSheet ref={settingsSheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.screenBottom,
  },
  // Kimlik bloğunun altındaki iki kart aynı ritimde dursun.
  stack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sectionGap,
    paddingBottom: spacing.sm,
  },
  rows: {
    // Card kendi iç boşluğunu veriyor; ekran kenarından uzaklık burada.
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
