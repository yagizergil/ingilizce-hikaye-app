import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useTranslation } from "react-i18next";

import { spacing, mascotSize } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { ErrorState, LoadingState, MascotAnim, SectionHeader, SkyHeader } from "@/components/ui";
import { useVocabularyQuery } from "@/features/vocabulary";

import { formatReadingTime } from "@/features/profile/api/formatReadingTime";
import { useProfileStatsQuery } from "@/features/profile/api/useProfileStatsQuery";
import { ProfileStatsGrid } from "@/features/profile/components/ProfileStatsGrid";
import { StreakCard } from "@/features/profile/components/StreakCard";
import { LevelCard } from "@/features/profile/components/LevelCard";
import { useXpQuery } from "@/features/profile/api/useXpQuery";
import { useGoalProgressQuery } from "@/features/profile/api/useGoalProgressQuery";
import { DailyGoalCard } from "@/features/profile/components/DailyGoalCard";
import { WeeklyMinutesChart } from "@/features/profile/components/WeeklyMinutesChart";

interface StatisticsScreenProps {
  onClose: () => void;
}

/**
 * İstatistikler -- ayarlardan açılan AYRI bir ekran.
 *
 * NEDEN AYRILDI: seri kartı, haftalık grafik ve dört sayı ayarlar
 * ekranının en üstünde duruyordu; kullanıcı "dili değiştir" ya da
 * "aboneliğim" için gelen biri, aradığı satıra ulaşmadan önce üç blok
 * istatistik geçiyordu. Referans ayarlar ekranı (referance2.jpeg) düz bir
 * satır listesi; istatistikler bizim eklememiz, ama ayarların içinde değil
 * ARKASINDA duruyor: ayarlarda tek bir satır, içerik kendi sayfasında.
 *
 * Sorgular burada yeniden çağrılıyor ama yeni bir ağ isteği değil: aynı
 * sorgu anahtarları ayarlar ekranında da kullanılıyor, TanStack Query
 * önbellekten veriyor.
 */
export function StatisticsScreen({ onClose }: StatisticsScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const statsQuery = useProfileStatsQuery();
  const vocabularyQuery = useVocabularyQuery();
  const xpQuery = useXpQuery();
  const goalQuery = useGoalProgressQuery();

  const stats = statsQuery.data;
  const savedWordCount = vocabularyQuery.data?.summary.totalCount ?? 0;

  const handleRetry = useCallback(() => {
    void statsQuery.refetch();
    void vocabularyQuery.refetch();
    void xpQuery.refetch();
  }, [statsQuery, vocabularyQuery, xpQuery]);

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

  const isLoading = statsQuery.isLoading || vocabularyQuery.isLoading;
  const isError = statsQuery.isError || vocabularyQuery.isError;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.surface }]}>
      <SkyHeader
        title={t("profile.stats.screenTitle")}
        subtitle={t("profile.stats.subtitle")}
        onBack={onClose}
        art={<MascotAnim name="profile" width={mascotSize.header} />}
      />

      {isLoading ? (
        <LoadingState message={t("profile.loading")} />
      ) : isError || !stats ? (
        <ErrorState message={t("profile.error")} onRetry={handleRetry} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            {xpQuery.data ? <LevelCard xp={xpQuery.data} /> : null}
            {goalQuery.data ? <DailyGoalCard progress={goalQuery.data} /> : null}
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  // Kartların kendi `marginHorizontal: spacing.lg`i var. Burada ikinci bir
  // 20pt vermek kartları 40pt'ye itiyordu; aşağıdaki başlık ve ızgara 20pt'de
  // kalınca "günlük ilerleme" kartı metinle hizasız görünüyordu.
  stack: {
    gap: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sectionGap,
    paddingBottom: spacing.sm,
  },
});
