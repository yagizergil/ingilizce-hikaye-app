import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  mascotSize,
} from "@/theme";
import { trackEvent } from "@/lib/analytics";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import { ErrorState, MascotAnim, SkyHeader } from "@/components/ui";
import { HomeBookCard, useFavoritesReadListsQuery } from "@/features/home";

import type { Book } from "@/features/library";
import { prefetchBookDetail } from "@/features/library";

type Segment = "favorites" | "read";

/** Stack-pushed screen (`/favorites`) -- aynı içerik "Kitabım" sekmesinde de kullanılıyor. */
export default function FavoritesScreen() {
  const router = useRouter();
  return <FavoritesContent onBack={() => router.back()} />;
}

interface FavoritesContentProps {
  /** Verilirse başlıkta geri düğmesi çıkar; sekme olarak açıldığında verilmez. */
  onBack?: () => void;
}

/**
 * "Kitabım": gökyüzü başlığı, iki hap sekme (Favoriler / Okunanlar) ve
 * altında iki sütunlu kitap ızgarası (ana sayfa raflarıyla aynı kart).
 * Her sekmenin boş hâli maskotlu bir açıklama gösteriyor.
 */
export function FavoritesContent({ onBack }: FavoritesContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useFavoritesReadListsQuery();
  const [segment, setSegment] = useState<Segment>("favorites");
  const { height } = useWindowDimensions();

  useEffect(() => {
    trackEvent("favorites_screen_viewed");
  }, []);

  // Favori değişiklikleri mutasyonda zaten geçersiz kılınıyor; odakta
  // yalnızca veri bayatsa tazelenir (her sekme dokunuşunda ağ turu ve
  // yeniden render sekme geçişini takıltıyordu).
  useRefetchOnFocusIfStale([{ dataUpdatedAt, refetch }], 30_000);

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("favorites_screen_book_opened", { bookId: book.id });
      prefetchBookDetail(book.id);
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const books = (segment === "favorites" ? data?.favorites : data?.read) ?? [];
  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += 2) rows.push(books.slice(i, i + 2));

  const segments: { key: Segment; label: string; count: number }[] = [
    {
      key: "favorites",
      label: t("favorites.screen.favoritesSection"),
      count: data?.favorites.length ?? 0,
    },
    { key: "read", label: t("favorites.screen.readSection"), count: data?.read.length ?? 0 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkyHeader
          title={t("tabs.myBooks")}
          subtitle={t("favorites.screen.subtitle")}
          onBack={onBack}
          art={<MascotAnim name="books" width={mascotSize.header} />}
        />

        <View style={styles.segments} accessibilityRole="tablist">
          {segments.map((item) => {
            const active = item.key === segment;
            return (
              <Pressable
                key={item.key}
                onPress={() => setSegment(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segment, active ? styles.segmentActive : null]}
              >
                <Text
                  style={[
                    detailType.statLabel,
                    { color: active ? detailColors.amberInk : homeColors.mutedStrong },
                  ]}
                >
                  {`${item.label} · ${item.count}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* "Yükleniyor" yazısı YOK (kullanıcı bulgusu, 2026-10-06): liste
            ana sayfa açılırken önceden çekiliyor; ilk açılışta gelene kadar
            alan sessizce boş kalıyor. */}
        {isLoading ? null : isError || !data ? (
          <ErrorState message={t("favorites.screen.error")} onRetry={() => void refetch()} />
        ) : books.length === 0 ? (
          <View style={[styles.empty, { minHeight: height * 0.5 }]}>
            <MascotAnim name="books" width={mascotSize.empty} />
            <Text style={[homeType.sectionTitle, styles.emptyTitle]}>
              {t(
                segment === "favorites"
                  ? "favorites.screen.emptyFavorites.title"
                  : "favorites.screen.emptyRead.title",
              )}
            </Text>
            <Text style={[homeType.cardSub, styles.emptyText]}>
              {t(
                segment === "favorites"
                  ? "favorites.screen.emptyFavorites.description"
                  : "favorites.screen.emptyRead.description",
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((row) => (
              <View key={row[0]?.id} style={styles.gridRow}>
                {row.map((book) => (
                  <HomeBookCard
                    key={book.id}
                    book={book}
                    finished={segment === "read"}
                    onPress={handleOpenBook}
                    fluid
                  />
                ))}
                {row.length === 1 ? <View style={styles.spacer} /> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: detailColors.circle,
  },
  content: {
    paddingBottom: homeMetrics.tabBarHeight + homeMetrics.tabBarMargin * 2,
  },
  segments: {
    flexDirection: "row",
    gap: homeSpace.sm,
    paddingHorizontal: homeMetrics.gutter,
    marginBottom: homeSpace.lg,
  },
  segment: {
    height: homeMetrics.continueButton + homeSpace.xs,
    paddingHorizontal: homeSpace.lg,
    borderRadius: (homeMetrics.continueButton + homeSpace.xs) / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: detailColors.amber,
  },
  grid: {
    gap: homeSpace.xl,
    paddingHorizontal: homeMetrics.gutter,
  },
  gridRow: {
    flexDirection: "row",
    gap: homeMetrics.shelfGap,
  },
  spacer: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: homeMetrics.gutter + homeSpace.xl,
    // Boş hâl ekranın ortasında (eskiden üstte, yarım boş görünüyordu).
    justifyContent: "center",
    gap: homeSpace.sm,
  },
  emptyTitle: {
    color: homeColors.ink,
    textAlign: "center",
  },
  emptyText: {
    color: homeColors.muted,
    textAlign: "center",
  },
});
