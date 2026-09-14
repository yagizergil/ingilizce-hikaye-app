import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { ErrorState, LoadingState, SectionHeader } from "@/components/ui";
import { useVocabularyQuery } from "@/features/vocabulary";

import { formatReadingTime } from "@/features/profile/api/formatReadingTime";
import { useProfileStatsQuery } from "@/features/profile/api/useProfileStatsQuery";
import { ProfileStatsGrid } from "@/features/profile/components/ProfileStatsGrid";
import { StreakCard } from "@/features/profile/components/StreakCard";
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

  const stats = statsQuery.data;
  const savedWordCount = vocabularyQuery.data?.summary.totalCount ?? 0;

  const handleRetry = useCallback(() => {
    void statsQuery.refetch();
    void vocabularyQuery.refetch();
  }, [statsQuery, vocabularyQuery]);

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>
          {t("profile.stats.screenTitle")}
        </Text>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  stack: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
