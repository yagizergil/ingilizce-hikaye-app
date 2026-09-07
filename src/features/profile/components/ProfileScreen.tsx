import { useCallback, useEffect, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { Card, LoadingState, ErrorState, Hairline, SectionHeader } from "@/components/ui";
import { useVocabularyQuery } from "@/features/vocabulary";
import { useReaderSettings } from "@/features/reader";
import { useOnboardingStatusQuery } from "@/features/onboarding";
import { ReminderSettingsRow } from "@/features/reminders";

import { useProfileAuthStatus } from "@/features/profile/api/useProfileAuthStatus";
import { useProfileStatsQuery } from "@/features/profile/api/useProfileStatsQuery";
import { useSubscriptionStatusQuery } from "@/features/profile/api/useSubscriptionStatusQuery";
import { formatReadingTime } from "@/features/profile/api/formatReadingTime";
import { ProfileHero } from "@/features/profile/components/ProfileHero";
import { StreakCard } from "@/features/profile/components/StreakCard";
import { WeeklyMinutesChart } from "@/features/profile/components/WeeklyMinutesChart";
import { ProfileStatsGrid } from "@/features/profile/components/ProfileStatsGrid";
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
  const { isAnonymous, email, displayName, memberSince } = useProfileAuthStatus();
  const fontScalePercent = useReaderSettings((state) => state.fontScale);

  const statsQuery = useProfileStatsQuery();
  const vocabularyQuery = useVocabularyQuery();
  const subscriptionQuery = useSubscriptionStatusQuery();
  const onboardingQuery = useOnboardingStatusQuery();

  useEffect(() => {
    trackEvent("profile_viewed");
  }, []);

  const handleRetry = useCallback(() => {
    void statsQuery.refetch();
    void vocabularyQuery.refetch();
    void subscriptionQuery.refetch();
  }, [statsQuery, vocabularyQuery, subscriptionQuery]);

  const handleSignOut = useCallback(async () => {
    trackEvent("profile_sign_out");
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch {
      // No dedicated inline error-state slot for a fire-and-forget action
      // row (Toast is currently excluded from the ui barrel, see
      // components/ui/index.ts) -- an Alert is the visible error surface,
      // matching DeleteAccountScreen's own signOut failure handling.
      Alert.alert(t("common.errorTitle"), t("profile.account.signOutError"));
    }
  }, [t]);

  const handleDeleteAccount = useCallback(() => {
    trackEvent("profile_delete_account_opened");
    router.push("/delete-account");
  }, []);

  const handleSignUp = useCallback(() => {
    trackEvent("profile_sign_up_opened");
    router.push("/sign-in");
  }, []);

  // Paywall'un açıldığı üç yerden biri (diğerleri: Kelimelerim şeridi ve
  // kitap bitirme ekranı). Hepsi okuma akışının DIŞINDA -- ürün ilkesi #1.
  const handleOpenPaywall = useCallback(() => {
    trackEvent("paywall_opened", { source: "profile" });
    router.push("/paywall?source=profile");
  }, []);

  const stats = statsQuery.data;
  const savedWordCount = vocabularyQuery.data?.summary.totalCount ?? 0;

  const statItems = useMemo(
    () => [
      {
        key: "totalTime",
        label: t("profile.stats.totalTimeLabel"),
        value: formatReadingTime(t, stats?.totalMinutes ?? 0),
      },
      {
        key: "savedWords",
        label: t("profile.stats.savedWordsLabel"),
        value: String(savedWordCount),
      },
      {
        key: "completedBooks",
        label: t("profile.stats.completedBooksLabel"),
        value: String(stats?.completedBookCount ?? 0),
      },
      {
        key: "activeDays",
        label: t("profile.stats.totalActiveDaysLabel"),
        value: String(stats?.totalActiveDays ?? 0),
      },
    ],
    [t, stats, savedWordCount],
  );

  const isLoading = statsQuery.isLoading || vocabularyQuery.isLoading || subscriptionQuery.isLoading;
  const isError = statsQuery.isError || vocabularyQuery.isError || subscriptionQuery.isError;

  const languageCode = i18n.language.startsWith("tr") ? "tr" : "en";
  const subscriptionTier = subscriptionQuery.data ?? "free";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>{t("profile.title")}</Text>
      </View>

      {isLoading ? (
        <LoadingState message={t("profile.loading")} />
      ) : isError || !stats ? (
        <ErrorState message={t("profile.error")} onRetry={handleRetry} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ProfileHero
            displayName={displayName}
            email={email}
            isAnonymous={isAnonymous}
            targetLevel={onboardingQuery.data?.targetLevel ?? null}
            memberSince={memberSince}
          />

          <View style={styles.stack}>
            <StreakCard
              currentStreak={stats.currentStreak}
              longestStreak={stats.longestStreak}
              readToday={stats.readToday}
              weekDays={stats.weekDays}
            />

            <WeeklyMinutesChart
              weekDays={stats.weekDays}
              totalMinutesThisWeek={stats.readingMinutesThisWeek}
            />
          </View>

          <SectionHeader title={t("profile.stats.sectionTitle")} style={styles.sectionHeader} />
          <ProfileStatsGrid items={statItems} />

          <SectionHeader title={t("profile.account.sectionTitle")} style={styles.sectionHeader} />

          <Card style={styles.rows} bordered>
            <ProfileAccountRow
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
            <ProfileAccountRow
              label={t("profile.account.fontSize")}
              value={t("profile.account.fontSizeValue", { percent: Math.round(fontScalePercent * 100) })}
            />
            <Hairline />
            <ProfileAccountRow
              label={t("profile.account.theme")}
              value={t(`reader.settings.themeOptions.${themeName}`)}
            />
            <Hairline />
            <ProfileAccountRow
              label={t("profile.account.language")}
              value={t(`profile.account.language${languageCode === "tr" ? "Tr" : "En"}`)}
            />
            <Hairline />

            {isAnonymous ? (
              <ProfileAccountRow label={t("profile.account.signUp")} onPress={handleSignUp} />
            ) : (
              <ProfileAccountRow label={t("profile.account.signOut")} onPress={() => void handleSignOut()} />
            )}
            <Hairline />
            <ProfileAccountRow
              label={t("profile.account.deleteAccount")}
              onPress={handleDeleteAccount}
              destructive
            />
          </Card>

          <ProfileFooter />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
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
