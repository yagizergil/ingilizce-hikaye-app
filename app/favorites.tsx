import { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { EmptyState, ErrorState, LoadingState, SectionHeader } from "@/components/ui";
import { useFavoritesReadListsQuery } from "@/features/home";
import { BookListRow } from "@/features/library";

import type { Book } from "@/features/library";

/**
 * Tek `FlashList`'te iki bölüm ("Favoriler" + "Okunanlar") -- her satır
 * kendi TİPİYLE etiketli, `getItemType` recycling havuzunu doğru tutuyor
 * (bir başlık hücresi bir kitap hücresiyle karıştırılmıyor).
 *
 * ÇÖZÜLEN PERFORMANS SORUNU (denetim, 2026-09-16): önceden `ScrollView` +
 * `.map()` kullanılıyordu -- bugün için küçük bir liste olsa da, kullanıcı
 * favorilediği/bitirdiği kitap sayısı arttıkça (uygulama 500+ kitaplık bir
 * katalog hedefliyor) ekrandaki TÜM satırlar aynı anda mount ediliyordu.
 * `FlashList` diğer tüm liste ekranlarıyla (library, browse, vocabulary,
 * book detail) zaten tutarlı bir desen.
 */
type FavoritesRow =
  | { type: "header"; key: string; title: string }
  | { type: "empty"; key: string; title: string; description: string }
  | { type: "book"; key: string; book: Book };

/** Stack-pushed screen (not a tab), same pattern as app/book/[id].tsx —
 * reached from home's `FavoritesReadCard`. */
export default function FavoritesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useFavoritesReadListsQuery();

  useEffect(() => {
    trackEvent("favorites_screen_viewed");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("favorites_screen_book_opened", { bookId: book.id });
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const rows = useMemo<FavoritesRow[]>(() => {
    if (!data) return [];

    const favoritesRows: FavoritesRow[] =
      data.favorites.length > 0
        ? data.favorites.map((book) => ({ type: "book" as const, key: `fav-${book.id}`, book }))
        : [
            {
              type: "empty" as const,
              key: "fav-empty",
              title: t("favorites.screen.emptyFavorites.title"),
              description: t("favorites.screen.emptyFavorites.description"),
            },
          ];

    const readRows: FavoritesRow[] =
      data.read.length > 0
        ? data.read.map((book) => ({ type: "book" as const, key: `read-${book.id}`, book }))
        : [
            {
              type: "empty" as const,
              key: "read-empty",
              title: t("favorites.screen.emptyRead.title"),
              description: t("favorites.screen.emptyRead.description"),
            },
          ];

    return [
      { type: "header", key: "fav-header", title: t("favorites.screen.favoritesSection") },
      ...favoritesRows,
      { type: "header", key: "read-header", title: t("favorites.screen.readSection") },
      ...readRows,
    ];
  }, [data, t]);

  const renderRow = useCallback<ListRenderItem<FavoritesRow>>(
    ({ item }) => {
      if (item.type === "header") {
        return <SectionHeader title={item.title} style={styles.sectionHead} />;
      }
      if (item.type === "empty") {
        return (
          <View style={styles.emptySection}>
            <EmptyState title={item.title} description={item.description} />
          </View>
        );
      }
      return <BookListRow book={item.book} onPress={handleOpenBook} />;
    },
    [handleOpenBook],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        {/* GERİ DÜĞMESİ (2026-09-19 denetimi): bu ekran `router.push` ile
            açılıyor ve `app/_layout.tsx` yığının başlığını kapatıyor
            (`headerShown: false`), yani sekme çubuğu da görünmüyordu.
            Geriye tek yol iOS'un kenar kaydırma hareketiydi -- onu
            bilmeyen kullanıcı ekranda kilitli kalıyordu. */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text.primary} />
        </Pressable>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>
          {t("favorites.screen.title")}
        </Text>
      </View>

      {isLoading ? (
        <LoadingState message={t("favorites.screen.loading")} />
      ) : isError || !data ? (
        <ErrorState message={t("favorites.screen.error")} onRetry={() => void refetch()} />
      ) : data.favorites.length === 0 && data.read.length === 0 ? (
        <EmptyState
          title={t("favorites.screen.emptyBoth.title")}
          description={t("favorites.screen.emptyBoth.description")}
        />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    paddingBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.section,
  },
  sectionHead: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  emptySection: {
    paddingBottom: spacing.sm,
  },
});
