import { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { homeColors, homeMetrics, homeSpace, homeType, searchColors, searchMetrics } from "@/theme";
import { trackEvent } from "@/lib/analytics";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import {
  CATEGORY_ICONS,
  HomeBookShelf,
  HomePills,
  useCurrentlyReadingQuery,
  useFinishedBookIdsQuery,
  useHomeExtrasQuery,
} from "@/features/home";
import { useActiveLanguagePairQuery } from "@/features/languagePair";
import {
  CategoryChips,
  LEVEL_GROUP_LEVELS,
  LevelChips,
  SearchBookRow,
  SearchHeader,
  useFilteredBooks,
  useLibraryBooksQuery,
  useLibraryFiltersStore,
  prefetchBookDetail,
} from "@/features/library";
import { useOnboardingStatusQuery } from "@/features/onboarding";
import { levelFromXp, totalXp, useProfileStatsQuery, useXpQuery } from "@/features/profile";

import type { CategoryChip } from "@/features/library";
import type { Book, LibraryFilters } from "@/features/library";

/**
 * Arama sonucunda ekrana basılan en fazla satır. Sonuçlar düz bir
 * ScrollView'da: kısa bir sorgu ("a") yüzlerce kapaklı satırı aynı anda
 * mount ediyordu ve her tuş vuruşunda klavye takılıyordu. Aranan kitap
 * zaten ilk sonuçlarda; daha fazlası için sorgu daraltılıyor.
 */
const MAX_SEARCH_RESULTS = 40;
/** "Kısa hikâyeler" rafının üst sınırı (dakika). */
const SHORT_READ_MINUTES = 15;
/** Bir raftaki en fazla kitap (yatay listede ilk öğeler en önemlisi). */
const SHELF_SIZE = 12;

/** Onboarding seviyesinden seviye grubuna. */
function levelGroupOf(level: string | null | undefined): LibraryFilters["levelGroup"] {
  if (level === "A1" || level === "A2") return "beginner";
  if (level === "B1" || level === "B2") return "intermediate";
  if (level === "C1" || level === "C2") return "advanced";
  return "all";
}

/**
 * "Ara" sekmesi -- referanstaki "Discover" ekranı: gökyüzü başlığı +
 * hapların altında arama alanı, tür çipleri ve "Popüler kitaplar" rafı.
 * Arama yazılınca raf yerine eşleşen kitaplar listelenir.
 */
export default function LibraryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useLibraryBooksQuery();
  const books = useFilteredBooks(data);
  const query = useLibraryFiltersStore((state) => state.query);
  const setQuery = useLibraryFiltersStore((state) => state.setQuery);
  const levelGroup = useLibraryFiltersStore((state) => state.levelGroup);
  const setLevelGroup = useLibraryFiltersStore((state) => state.setLevelGroup);
  const { data: extras } = useHomeExtrasQuery();
  const { data: finishedBookIds } = useFinishedBookIdsQuery();
  const { data: currentlyReading } = useCurrentlyReadingQuery();
  const { data: stats } = useProfileStatsQuery();
  const { data: activePair } = useActiveLanguagePairQuery();
  const onboardingQuery = useOnboardingStatusQuery();

  const xpQuery = useXpQuery();
  const levelProgress = levelFromXp(xpQuery.data ? totalXp(xpQuery.data) : 0);

  useEffect(() => {
    trackEvent("library_viewed");
  }, []);

  // Seviye seçici ilk açılışta kullanıcının onboarding seviyesiyle başlar
  // (bir kez; sonra kullanıcının seçimi korunur).
  const levelDefaulted = useRef(false);
  const targetLevel = onboardingQuery.data?.targetLevel ?? null;
  useEffect(() => {
    if (levelDefaulted.current || !targetLevel) return;
    levelDefaulted.current = true;
    setLevelGroup(levelGroupOf(targetLevel));
  }, [targetLevel, setLevelGroup]);

  useRefetchOnFocusIfStale([{ dataUpdatedAt, refetch }]);

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("library_book_opened", { bookId: book.id });
      prefetchBookDetail(book.id);
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const chips = useMemo<CategoryChip[]>(() => {
    const out: CategoryChip[] = [];
    for (const tag of extras?.categoryTags ?? []) {
      const icon = CATEGORY_ICONS[tag.key];
      if (icon === undefined) continue;
      out.push({ key: tag.key, label: tag.labelKey ? t(tag.labelKey) : tag.label, icon });
    }
    return out;
  }, [extras, t]);

  const handlePressChip = useCallback(
    (chip: CategoryChip) => {
      const tag = extras?.categoryTags.find((item) => item.key === chip.key);
      if (!tag || tag.navTarget.kind !== "library") return;
      const params = new URLSearchParams();
      params.set("title", chip.label);
      if (tag.navTarget.genre) params.set("genre", tag.navTarget.genre);
      router.push(`/browse?${params.toString()}`);
    },
    [extras, router],
  );

  const yourBooks = useMemo(
    () => (currentlyReading ?? []).map((item) => item.book),
    [currentlyReading],
  );
  /**
   * RAFLAR (2026-10-05, ilk-kullanıcı denetimi + NN/G carousel ilkeleri):
   * eskiden yalnızca "Kitapların" ve "Popüler" vardı. Şimdi seçili seviyeye
   * göre süzülmüş, en alakalısı önde birkaç raf: kısa okumalar ilk oturumun
   * eşiğini düşürür, yeni eklenenler geri dönüş sebebi, sesli kitaplar
   * premium vitrini (okuma ekranının DIŞINDA). Boş raf çizilmez.
   */
  const levelBooks = useMemo(() => {
    const all = data ?? [];
    if (levelGroup === "all") return all;
    const levels: string[] = LEVEL_GROUP_LEVELS[levelGroup];
    return all.filter((book) => levels.includes(book.level));
  }, [data, levelGroup]);
  const popularBooks = useMemo(
    () => levelBooks.filter((book) => book.isPopular).slice(0, SHELF_SIZE),
    [levelBooks],
  );
  const shortBooks = useMemo(
    () =>
      levelBooks
        .filter((book) => book.estimatedMinutes <= SHORT_READ_MINUTES)
        .sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)
        .slice(0, SHELF_SIZE),
    [levelBooks],
  );
  const newBooks = useMemo(
    // En yeni önce: süzgeç tek başına kataloğun kendi sırasını koruyordu,
    // raf "yeni eklenenler" dediği hâlde tarihe göre sıralı değildi.
    () =>
      levelBooks
        .filter((book) => book.isNew)
        .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
        .slice(0, SHELF_SIZE),
    [levelBooks],
  );
  const audioBooks = useMemo(
    () => levelBooks.filter((book) => book.hasAudio).slice(0, SHELF_SIZE),
    [levelBooks],
  );
  // Hiç popüler işaretli kitap yoksa (yeni dil) öne çıkan raf yine dolu kalsın.
  const featuredBooks = popularBooks.length > 0 ? popularBooks : levelBooks.slice(0, SHELF_SIZE);
  const searching = query.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SearchHeader
        query={query}
        onChangeQuery={setQuery}
        pills={
          <HomePills
            levelNumber={levelProgress.level}
            levelFraction={levelProgress.fraction}
            streak={stats?.currentStreak ?? 0}
            targetLanguage={activePair?.targetLanguage ?? "en"}
            onPressLevel={() => router.push("/statistics")}
            onPressStreak={() => router.push("/statistics")}
            onPressLanguage={() => router.push("/language-settings")}
          />
        }
      />

      {isLoading ? (
        <LoadingState message={t("library.loading")} />
      ) : isError ? (
        <ErrorState message={t("library.error")} onRetry={() => void refetch()} />
      ) : searching ? (
        books.length === 0 ? (
          // Sonuçsuz arama çıkmaz sokak olmasın: temizle düğmesi + öneri rafı.
          <>
            <EmptyState
              title={t("library.empty.title")}
              description={t("library.empty.description")}
            />
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
              style={styles.clearButton}
            >
              <Text style={[homeType.seeAll, styles.clearText]}>{t("library.clearSearch")}</Text>
            </Pressable>
            {featuredBooks.length > 0 ? (
              <HomeBookShelf
                title={t("library.shelves.suggested")}
                books={featuredBooks}
                onPressBook={handleOpenBook}
                finishedBookIds={finishedBookIds}
              />
            ) : null}
          </>
        ) : (
          <View style={styles.results}>
            {books.slice(0, MAX_SEARCH_RESULTS).map((book) => (
              <SearchBookRow key={book.id} book={book} onPress={handleOpenBook} />
            ))}
            {books.length > MAX_SEARCH_RESULTS ? (
              <Text style={[homeType.cardSub, styles.limitNote]}>
                {t("library.resultsLimited", { count: MAX_SEARCH_RESULTS })}
              </Text>
            ) : null}
          </View>
        )
      ) : (
        <>
          <View style={styles.chips}>
            <CategoryChips chips={chips} onPressChip={handlePressChip} />
          </View>
          {yourBooks.length > 0 ? (
            <HomeBookShelf
              title={t("home.yourBooks")}
              books={yourBooks}
              onPressBook={handleOpenBook}
              finishedBookIds={finishedBookIds}
            />
          ) : null}
          <View style={styles.levels}>
            <LevelChips value={levelGroup} onChange={setLevelGroup} />
          </View>
          {featuredBooks.length > 0 ? (
            <HomeBookShelf
              title={t(levelGroup === "all" ? "home.popularBooks" : "library.shelves.forLevel")}
              moreLabel={t("home.seeAll")}
              onPressMore={() =>
                router.push(
                  levelGroup === "all"
                    ? `/browse?title=${encodeURIComponent(t("home.popularBooks"))}&popular=true`
                    : `/browse?levelGroup=${levelGroup}`,
                )
              }
              books={featuredBooks}
              onPressBook={handleOpenBook}
              finishedBookIds={finishedBookIds}
            />
          ) : null}
          {shortBooks.length > 0 ? (
            <HomeBookShelf
              title={t("library.shelves.short")}
              books={shortBooks}
              onPressBook={handleOpenBook}
              finishedBookIds={finishedBookIds}
            />
          ) : null}
          {newBooks.length > 0 ? (
            <HomeBookShelf
              title={t("library.shelves.new")}
              books={newBooks}
              onPressBook={handleOpenBook}
              finishedBookIds={finishedBookIds}
            />
          ) : null}
          {audioBooks.length > 0 ? (
            <HomeBookShelf
              title={t("library.shelves.audio")}
              books={audioBooks}
              onPressBook={handleOpenBook}
              finishedBookIds={finishedBookIds}
            />
          ) : null}
          {levelBooks.length === 0 ? (
            <EmptyState
              title={t("library.empty.title")}
              description={t("library.empty.description")}
            />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: searchColors.skyBottom,
  },
  content: {
    paddingBottom: homeMetrics.tabBarHeight + homeMetrics.tabBarMargin * 2,
  },
  chips: {
    marginTop: searchMetrics.chipsTop - searchMetrics.fieldTop - searchMetrics.fieldHeight,
  },
  results: {
    marginTop: homeMetrics.sectionHeadBottom,
  },
  levels: {
    marginTop: homeSpace.lg,
  },
  clearButton: {
    alignSelf: "center",
    padding: homeSpace.md,
  },
  clearText: {
    color: homeColors.orange,
  },
  limitNote: {
    color: homeColors.muted,
    textAlign: "center",
    marginTop: homeSpace.md,
    paddingHorizontal: homeMetrics.gutter,
  },
});
