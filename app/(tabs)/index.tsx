import { useCallback, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import { ErrorState, ScreenHeader } from "@/components/ui";
import {
  BookShelf,
  useFinishedBookIdsQuery,
  CategoryShelf,
  CollectionShelf,
  CurrentlyReadingShelf,
  EmptyHome,
  HomeSkeleton,
  LevelGroupCard,
  useCurrentlyReadingQuery,
  useHomeExtrasQuery,
  useRemoveFromCurrentlyReadingMutation,
} from "@/features/home";
import { LEVEL_GROUPS } from "@/features/library";
import { useOnboardingStatusQuery } from "@/features/onboarding";

import type { CategoryTag, CategoryTagNavTarget, CollectionCardData } from "@/features/home";
import type { Book, LevelGroup } from "@/features/library";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
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
  // Kapaklardaki "okundu" etiketi (referans: referance1.jpeg).
  const { data: finishedBookIds } = useFinishedBookIdsQuery();
  // "Seviyene göre" kısayolu kullanıcının beyan ettiği seviyeyi kullanıyor.
  const onboardingQuery = useOnboardingStatusQuery();
  const userLevel = onboardingQuery.data?.targetLevel ?? null;
  const removeFromCurrentlyReadingMutation = useRemoveFromCurrentlyReadingMutation();

  useEffect(() => {
    trackEvent("home_viewed");
  }, []);

  /*
    Expo Router bu ekranı sekme değişimlerinde mount hâlinde tutuyor, yani
    yeni yayınlanan bir kitap tazeleme olmadan hiç görünmezdi. Ama eski hâli
    KOŞULSUZ `refetch()` idi ve `refetch` tasarımı gereği `staleTime`'ı yok
    sayıyor: her sekme dokunuşu bütün katalogu yeniden indiriyordu (raflar
    katalogdan türetiliyor). Katalog dakikalar içinde değişen bir veri değil;
    tazeleme artık yalnızca veri bayatladıysa yapılıyor. Gerekçenin tamamı
    `useRefetchOnFocusIfStale` içinde.
  */
  useRefetchOnFocusIfStale([
    { dataUpdatedAt: extrasUpdatedAt, refetch: refetchExtras },
    { dataUpdatedAt: currentlyReadingUpdatedAt, refetch: refetchCurrentlyReading },
  ]);

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("home_book_opened", { bookId: book.id });
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

  const handlePressLevelGroup = useCallback(
    (levelGroup: LevelGroup) => {
      trackEvent("home_level_group_pressed", { levelGroup });
      router.push(`/browse?levelGroup=${levelGroup}`);
    },
    [router],
  );

  const handleRemoveCurrentlyReading = useCallback(
    (book: Book) => {
      // Kaldırmak `user_book_progress` satırını SİLİYOR; tek dokunuşla geri
      // dönüşü olmayan bir kayıp yaşatmamak için önce onay isteniyor.
      Alert.alert(
        t("home.currentlyReading.removeConfirmTitle"),
        t("home.currentlyReading.removeConfirmBody", { title: book.title }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("home.currentlyReading.removeConfirmCta"),
            style: "destructive",
            onPress: () => {
              trackEvent("home_currently_reading_removed", { bookId: book.id });
              removeFromCurrentlyReadingMutation.mutate(book.id);
            },
          },
        ],
      );
    },
    [removeFromCurrentlyReadingMutation, t],
  );

  const handlePressCollection = useCallback(
    (collection: CollectionCardData) => {
      trackEvent("home_collection_pressed", { key: collection.key });

      /**
       * Kısayolların ikisi uygulamanın KENDİ ekranlarına gidiyor, dördü
       * kataloğa bir filtreyle. Hepsinin bir hedefi var; "yakında" kartı
       * yok -- boş bir kart, rafı doldurmaktan başka bir işe yaramaz.
       */
      if (collection.key === "favorites") {
        router.push("/favorites");
        return;
      }
      if (collection.key === "review") {
        router.push("/review");
        return;
      }

      const searchParams = new URLSearchParams();
      searchParams.set("title", collection.label);
      if (collection.key === "popular") searchParams.set("popular", "true");
      if (collection.key === "audiobooks") searchParams.set("hasAudio", "true");
      if (collection.key === "quick") searchParams.set("maxMinutes", "10");
      // "Seviyene göre": kullanıcının onboarding'de beyan ettiği seviye.
      // Seviye yoksa kart zaten rafta gösterilmiyor (CollectionShelf).
      if (collection.key === "myLevel" && userLevel) {
        searchParams.set("level", userLevel);
      }
      router.push(`/browse?${searchParams.toString()}`);
    },
    [router, userLevel],
  );

  if (isExtrasLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <ScreenHeader title={t("app.name")} titleStyle={type.wordmark} />
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (isExtrasError || !extras) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ErrorState message={t("home.error")} onRetry={() => void refetchExtras()} />
      </SafeAreaView>
    );
  }

  const { newBooks, categoryTags, authorSeriesTags, levelGroupCounts } = extras;

  // See EmptyHome.tsx's doc comment: level-group cards always render, so
  // the only state that still warrants the full-screen empty view is an
  // empty catalog (no books published yet) — every other section derives
  // from the same book list, so `newBooks.length === 0` implies they're
  // all empty too.
  const hasAnyContent = newBooks.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      {/*
        FAZ 2 (2026-09-14, referans uygulama eşleştirmesi): üst barda
        tek kelimelik logotype dışında hiçbir şey yok -- ne "+" düğmesi
        (üstteki eski not hâlâ geçerli: eklenebilecek bir şey yok), ne de
        seri (streak) göstergesi. Seri zaten Profil ekranında görünüyor;
        ana sayfanın üst barına taşınması yalnızca eski bir tasarım
        denemesiydi, referansta karşılığı yok.
      */}
      <ScreenHeader title={t("app.name")} titleStyle={type.wordmark} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasAnyContent ? (
          <EmptyHome />
        ) : (
          <>
            {/*
              FAZ 4 (2026-09-14, referans uygulama eşleştirmesi): "Kaldığın
              yer" hero kartı kaldırıldı -- referansta logotype'tan hemen
              sonra doğrudan "Yeni kitaplar" rafı başlıyor, ayrı bir
              "devam et" bloğu yok. Kaldığın yere dönme eylemi zaten
              "Şu an okunuyor" rafında (aşağıda) karşılanıyor.
            */}
            {/* Sıra ürün sahibinin isteği (2026-09-24): kısayollar en üstte,
                altında yeni kitaplar, sonra okunmakta olanlar. */}
            <CollectionShelf onPressCollection={handlePressCollection} userLevel={userLevel} />

            <BookShelf
              title={t("home.newBooks.title")}
              books={newBooks}
              onPressBook={handleOpenBook}
              finishedBookIds={finishedBookIds}
            />

            <CurrentlyReadingShelf
              books={currentlyReading ?? []}
              onPressBook={handleOpenBook}
              onRemoveBook={handleRemoveCurrentlyReading}
            />

            <CategoryShelf
              title={t("home.categories.title")}
              tags={categoryTags}
              onPressTag={handlePressCategoryTag}
            />

            <CategoryShelf
              title={t("home.authorsAndSeries.title")}
              tags={authorSeriesTags}
              onPressTag={handlePressCategoryTag}
            />

            <View style={[styles.levelGroups, { backgroundColor: theme.bg.surface }]}>
              {LEVEL_GROUPS.map((group, index) => (
                <LevelGroupCard
                  key={group}
                  levelGroup={group}
                  count={levelGroupCounts[group]}
                  onPress={handlePressLevelGroup}
                  isLast={index === LEVEL_GROUPS.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
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
  levelGroups: {
    marginTop: spacing.sectionGap,
    marginHorizontal: spacing.lg,
    borderRadius: radius.cover,
    overflow: "hidden",
  },
});
