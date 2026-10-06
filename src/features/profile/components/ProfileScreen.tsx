import { useCallback, useEffect, useRef } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { detailType, homeColors, homeMetrics, homeSpace, homeType, mascotSize } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import { ErrorState, Hairline, MascotAnim, SkyHeader } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";
import { useVocabularyQuery } from "@/features/vocabulary";
import { ReaderSettingsSheet, useReaderSettings } from "@/features/reader";
import { useOnboardingStatusQuery } from "@/features/onboarding";
import { ReminderSettingsRow } from "@/features/reminders";
import { SoundEffectsRow } from "@/features/profile/components/SoundEffectsRow";
import { useActiveLanguagePairQuery } from "@/features/languagePair";
import { getLanguage } from "@/lib/languages";
import { openWriteReviewPage } from "@/lib/storeReview";
import { reloadApp } from "@/lib/rtl";

import { useProfileAuthStatus } from "@/features/profile/api/useProfileAuthStatus";
import { useProfileStatsQuery } from "@/features/profile/api/useProfileStatsQuery";
import { useSubscriptionStatusQuery } from "@/features/profile/api/useSubscriptionStatusQuery";
import { ProfileHero } from "@/features/profile/components/ProfileHero";
import { ProfilePremiumCard } from "@/features/profile/components/ProfilePremiumCard";
import { ProfileStatTiles } from "@/features/profile/components/ProfileStatTiles";
import { ProfileAccountRow } from "@/features/profile/components/ProfileAccountRow";
import { ProfileFooter } from "@/features/profile/components/ProfileFooter";
import { useDevToolsUnlock } from "@/features/profile/hooks/useDevToolsUnlock";

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
  const { theme } = useTheme();
  const palette = useHomePalette();
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

  // Geliştirici araçları üretimde gizli; sürüm yazısına 7 kez dokununca açılıyor.
  const { unlocked: devToolsUnlocked, registerTap: registerVersionTap } = useDevToolsUnlock();
  const handleVersionPress = useCallback(() => {
    if (registerVersionTap()) Alert.alert(t("profile.account.devUnlocked"));
  }, [registerVersionTap, t]);

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

  /**
   * EKRAN YÜKLEME BEKLEMİYOR (2026-10-05, kullanıcı bulgusu: "profile
   * tıklayınca 'profil yükleniyor' diyor"). Eskiden üç sorgu bitene kadar
   * bütün ekran bir yükleniyor durumuydu; oysa kimlik ve ayar satırlarının
   * hiçbiri o sorgulara bağlı değil. Şimdi ekran anında çiziliyor, yalnızca
   * sayılar gelene kadar "–" gösteriyor; sayılar alınamazsa karoların
   * yerinde küçük bir yeniden dene kartı çıkıyor.
   */
  const statsError = statsQuery.isError;

  const languageCode = i18n.language.startsWith("tr") ? "tr" : "en";
  const subscriptionTier = subscriptionQuery.data ?? "free";

  return (
    <View style={[styles.container, { backgroundColor: palette.page }]}>
      {
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SkyHeader
            title={t("tabs.profile")}
            subtitle={t("profile.subtitle")}
            extraBottom={homeMetrics.profileSkyExtra}
            art={<MascotAnim name="profile" width={mascotSize.header} />}
          />
          <ProfileHero
            displayName={displayName}
            email={email}
            isAnonymous={isAnonymous}
            targetLevel={onboardingQuery.data?.targetLevel ?? null}
            memberSince={memberSince}
          />

          {statsError ? (
            <ErrorState message={t("profile.error")} onRetry={handleRetry} />
          ) : (
            <ProfileStatTiles
              streak={stats?.currentStreak ?? null}
              totalMinutes={stats?.totalMinutes ?? null}
              completedBooks={stats?.completedBookCount ?? null}
            />
          )}

          {/* Abonelik durumu bilinmeden kart çizilmiyor: premium kullanıcıya
              bir an "Premium'a geç" göstermek yanlış olurdu. */}
          {subscriptionQuery.data ? (
            <ProfilePremiumCard
              isPremium={subscriptionTier !== "free"}
              onPress={handleOpenPaywall}
            />
          ) : null}

          <Text style={[homeType.sectionTitle, styles.sectionHeader, { color: palette.ink }]}>
            {t("profile.sections.learning")}
          </Text>
          <View style={[styles.rows, { backgroundColor: palette.card }]}>
            <ProfileAccountRow
              icon="chart"
              label={t("profile.stats.screenTitle")}
              value={
                stats
                  ? t("profile.stats.rowValue", {
                      minutes: stats.totalMinutes,
                      streak: stats.currentStreak,
                    })
                  : undefined
              }
              onPress={handleOpenStatistics}
            />
            <Hairline />
            <ReminderSettingsRow />
            <Hairline />
            <SoundEffectsRow />
          </View>

          <Text style={[homeType.sectionTitle, styles.sectionHeader, { color: palette.ink }]}>
            {t("profile.sections.reading")}
          </Text>
          <View style={[styles.rows, { backgroundColor: palette.card }]}>
            {/* Yazı boyutu ve tema okuma ekranındaki sheet'in AYNISINI açar;
                ikinci bir ayar kopyası ayrışırdı. */}
            <ProfileAccountRow
              icon="textsize"
              label={t("profile.account.fontSize")}
              value={t("profile.account.fontSizeValue", {
                percent: Math.round(fontScalePercent * 100),
              })}
              onPress={() => settingsSheetRef.current?.present()}
            />
            <Hairline />
            <ProfileAccountRow
              icon="globe"
              label={t("profile.account.language")}
              value={
                languagePairQuery.data
                  ? // Ok YÖNÜ de çeviriden geliyor: Arapça'da "←" olmalı.
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
          </View>

          <Text style={[homeType.sectionTitle, styles.sectionHeader, { color: palette.ink }]}>
            {t("profile.account.sectionTitle")}
          </Text>
          <View style={[styles.rows, { backgroundColor: palette.card }]}>
            <ProfileAccountRow
              icon="trophy"
              label={t("profile.account.rateUs")}
              onPress={handleRateUs}
            />
          </View>

          {/* İkonlu satırların arasında ikonsuz bir satır hizasız duruyordu;
              yıkıcı eylem kartın dışında, ortalı bir metin düğmesi. */}
          <Pressable
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            hitSlop={homeSpace.sm}
            style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}
          >
            <Text style={[detailType.statLabel, { color: theme.danger }]}>
              {t("profile.account.deleteAccount")}
            </Text>
          </Pressable>

          {/* GELİŞTİRİCİ ARAÇLARI. Önizleme satırı geliştirme derlemesinde HER
              ZAMAN, üretim/TestFlight'ta ise yalnızca sürüm yazısına 7 kez
              dokunulunca (kalıcı) görünür. Hesabı silen "onboarding'i
              baştan oynat" aracı yalnızca `__DEV__` altında: `__DEV__`
              üretim paketinde `false` olduğu için Metro o kodu tamamen
              eler; App Store'a giden ikilide o düğme ve çağırdığı kod yok. */}
          {__DEV__ || devToolsUnlocked ? (
            <View style={[styles.rows, { backgroundColor: palette.card }]}>
              <ProfileAccountRow
                label={t("profile.account.devSplashPreview")}
                onPress={() => router.push("/dev-splash")}
              />
              <Hairline />
              <ProfileAccountRow
                label={t("profile.account.devOnboardingPreview")}
                onPress={() => router.push("/dev-onboarding")}
              />
              {/* Hesabı SİLEN araç yalnızca geliştirme derlemesinde kalıyor:
                  gizli açılışla erişilen bir üretim ikilisinde olmamalı. */}
              {__DEV__ ? (
                <>
                  <Hairline />
                  <ProfileAccountRow
                    label={t("profile.account.devReplayOnboarding")}
                    onPress={handleReplayOnboarding}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          <ProfileFooter onPress={handleVersionPress} />
        </ScrollView>
      }

      <ReaderSettingsSheet ref={settingsSheetRef} showTheme={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: homeMetrics.tabBarHeight + homeMetrics.tabBarMargin * 2,
  },
  sectionHeader: {
    paddingHorizontal: homeMetrics.gutter + homeSpace.xs,
    paddingTop: homeMetrics.sectionTop,
    paddingBottom: homeSpace.md,
  },
  deleteButton: {
    alignSelf: "center",
    marginTop: homeSpace.lg,
    padding: homeSpace.md,
  },
  pressed: {
    opacity: 0.6,
  },
  rows: {
    marginHorizontal: homeMetrics.gutter,
    paddingVertical: homeSpace.xs,
    paddingHorizontal: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
});
