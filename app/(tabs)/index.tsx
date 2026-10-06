import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { homeMetrics, homeSpace } from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";
import { trackEvent } from "@/lib/analytics";
import { localDateKeyDaysAgo } from "@/lib/localDate";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import { ErrorState, MascotLoading } from "@/components/ui";
import { useVocabularyQuery } from "@/features/vocabulary";
import {
  ContinueReadingCard,
  HomeCategoryGrid,
  HomeHeader,
  HomeStatsCard,
  RecommendedBookCard,
  StartReadingCard,
  WeekStrip,
  useCurrentlyReadingQuery,
  useFavoritesReadListsQuery,
  useHomeExtrasQuery,
  useRecommendedBook,
} from "@/features/home";
import { useActiveLanguagePairQuery } from "@/features/languagePair";
import {
  challengeState,
  levelFromXp,
  MILESTONE_BONUS,
  totalXp,
  useGoalProgressQuery,
  useProfileAuthStatus,
  useProfileStatsQuery,
  useXpQuery,
} from "@/features/profile";

import type { CategoryTag, CategoryTagNavTarget } from "@/features/home";
import type { Book } from "@/features/library";
import { prefetchBookDetail } from "@/features/library";

/** Ana sayfada gösterilen kategori sayısı; tamamı /categories ekranında. */
const HOME_CATEGORY_COUNT = 8;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const palette = useHomePalette();
  const {
    data: extras,
    isLoading: isExtrasLoading,
    isError: isExtrasError,
    refetch: refetchExtras,
    dataUpdatedAt: extrasUpdatedAt,
  } = useHomeExtrasQuery();
  const {
    data: currentlyReading,
    refetch: refetchCurrentlyReading,
    dataUpdatedAt: currentlyReadingUpdatedAt,
  } = useCurrentlyReadingQuery();
  const { data: stats } = useProfileStatsQuery();
  const { data: activePair } = useActiveLanguagePairQuery();
  const { displayName } = useProfileAuthStatus();

  // Okur seviyesi (XP): herkes 1'den başlar, okudukça yükselir. Eskiden
  // burada onboarding'deki DİL seviyesi (A1=1...C2=6) "seviye" diye
  // gösteriliyordu ve hiç değişmiyordu.
  // Kitabım ve Kelimelerim listeleri burada önceden çekiliyor: sekmeye
  // geçildiğinde hazır olsun, "yükleniyor" görünmesin.
  useFavoritesReadListsQuery();
  useVocabularyQuery();
  const xpQuery = useXpQuery();
  const { data: goal } = useGoalProgressQuery();
  const challenge = challengeState(goal?.goalDays ?? 0);
  const levelProgress = levelFromXp(xpQuery.data ? totalXp(xpQuery.data) : 0);
  const firstName = displayName ? (displayName.split(" ")[0] ?? null) : null;
  const today = localDateKeyDaysAgo(0);
  const minutesToday = stats?.weekDays.find((day) => day.date === today)?.minutes ?? 0;

  useEffect(() => {
    trackEvent("home_viewed");
  }, []);

  useRefetchOnFocusIfStale([
    { dataUpdatedAt: extrasUpdatedAt, refetch: refetchExtras },
    { dataUpdatedAt: currentlyReadingUpdatedAt, refetch: refetchCurrentlyReading },
  ]);

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("home_book_opened", { bookId: book.id });
      prefetchBookDetail(book.id);
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const handlePressCategoryTag = useCallback(
    (tag: CategoryTag) => {
      trackEvent("home_category_tag_pressed", { key: tag.key });
      const target: CategoryTagNavTarget = tag.navTarget;
      if (target.kind === "book") {
        router.push(`/book/${target.bookId}`);
        return;
      }
      const searchParams = new URLSearchParams();
      searchParams.set("title", tag.label);
      if (target.genre) searchParams.set("genre", target.genre);
      if (target.q) searchParams.set("q", target.q);
      if (target.levelGroup) searchParams.set("levelGroup", target.levelGroup);
      router.push(`/browse?${searchParams.toString()}`);
    },
    [router],
  );

  /**
   * EKRAN VERİYİ BEKLEMİYOR (2026-10-05): eskiden kategori sorgusu bitene
   * kadar eski tasarımdan kalma bir iskelet ekran gösteriliyordu ve ilk
   * açılışta sekme "geç açılıyor" gibi görünüyordu. Başlık, istatistik ve
   * devam kartı o sorguya bağlı değil; yalnızca kategori ızgarası bekliyor.
   */
  const categoryTags = extras?.categoryTags ?? [];
  const continueItem = currentlyReading?.[0] ?? null;
  const recommended = useRecommendedBook();
  /** Hiç okumamış kullanıcıya sıfırlarla dolu bir istatistik kartı göstermek
   * "henüz hiçbir şey yapmadın" demek; ilk okumaya kadar gizli. */
  const hasHistory = (stats?.totalActiveDays ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.page }]} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HomeHeader
          levelNumber={levelProgress.level}
          levelFraction={levelProgress.fraction}
          streak={stats?.currentStreak ?? 0}
          targetLanguage={activePair?.targetLanguage ?? "en"}
          name={firstName}
          onPressLevel={() => router.push("/statistics")}
          onPressStreak={() => router.push("/statistics")}
          onPressLanguage={() => router.push("/language-settings")}
        />
        {/* BİRİNCİL EYLEM EN ÜSTTE (ilk-kullanıcı denetimi, 2026-10-05):
            devam eden kitap varsa o, yoksa seviyeye uygun "Senin için"
            önerisi -- tek dokunuşla kitaba. Eskiden istatistik kartı ve
            kategori ızgarasının altında, ekranın dışında kalıyordu. */}
        <Animated.View entering={FadeIn.duration(220)} style={styles.primary}>
          {continueItem ? (
            <ContinueReadingCard
              book={continueItem.book}
              progressPercent={continueItem.progressPercent}
              onPress={handleOpenBook}
            />
          ) : recommended ? (
            <RecommendedBookCard
              book={recommended}
              onPress={handleOpenBook}
              onBrowse={() => router.push("/library")}
            />
          ) : (
            <StartReadingCard onPress={() => router.push("/library")} />
          )}
        </Animated.View>
        {hasHistory ? (
          <HomeStatsCard
            goalMinutes={goal?.goal ?? 10}
            minutesToday={goal?.today ?? minutesToday}
            goalDays={goal?.goalDays ?? 0}
            streak={goal?.streak ?? 0}
            booksRead={stats?.completedBookCount ?? 0}
            milestone={challenge.milestone}
            milestoneFraction={challenge.fraction}
            milestoneBonus={MILESTONE_BONUS[challenge.milestone] ?? 0}
            completedAll={challenge.completedAll}
            dateKey={today}
            onPressMore={() => router.push("/statistics")}
          />
        ) : null}
        {isExtrasError ? (
          <ErrorState message={t("home.error")} onRetry={() => void refetchExtras()} />
        ) : isExtrasLoading ? (
          <MascotLoading compact title={t("home.loading")} />
        ) : (
          <HomeCategoryGrid
            title={t("home.categoryGrid.title")}
            tags={categoryTags.slice(0, HOME_CATEGORY_COUNT)}
            onPressTag={handlePressCategoryTag}
            seeAllLabel={t("home.seeAll")}
            onPressSeeAll={() => router.push("/categories")}
          />
        )}
        <WeekStrip days={stats?.weekDays ?? []} today={today} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  primary: {
    marginTop: -homeMetrics.cardOverlap,
    marginBottom: homeSpace.lg,
  },
  scrollContent: {
    paddingBottom: homeMetrics.tabBarHeight + homeMetrics.tabBarMargin * 2,
  },
});
