import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import {
  Button,
  EmptyState,
  ErrorState,
  Hairline,
  LoadingState,
  SectionHeader,
  useToast,
} from "@/components/ui";
import { useFavoritedBookIdsQuery, useToggleFavoriteMutation } from "@/features/home";
import {
  BookAudioCard,
  BookHero,
  BookSeriesInfo,
  BookStatsRow,
  ChapterListItem,
  useBookAudioAccessQuery,
  useBookDetailQuery,
  useBookSeriesQuery,
} from "@/features/library";

import type { Chapter } from "@/features/library";

function ChapterSeparator() {
  return <Hairline style={styles.chapterSeparator} />;
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useBookDetailQuery(id);
  const { data: series } = useBookSeriesQuery(data?.book?.id);
  const {
    data: audioAccess,
    isSuccess: isAudioAccessKnown,
    refetch: refetchAudioAccess,
  } = useBookAudioAccessQuery(data?.book?.id, Boolean(data?.book?.hasAudio));
  const { data: favoritedBookIds } = useFavoritedBookIdsQuery();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const { show: showToast } = useToast();

  useEffect(() => {
    if (data?.book) {
      trackEvent("book_detail_viewed", { bookId: data.book.id });
    }
  }, [data?.book]);

  // Same fix already applied to Home/Library/Vocabulary tabs: this screen
  // can stay mounted in the nav stack while reading progress changes
  // underneath it (e.g. finishing a chapter and going back), so refetch on
  // every focus rather than relying on a mount-only fetch.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleOpenChapter = (chapter: Chapter) => {
    if (!data?.book) return;
    trackEvent("book_chapter_opened", { bookId: data.book.id, chapterId: chapter.id });
    // `bookId` query param'ı: reader bölüm sorgusunun dönmesini beklemeden
    // kitap sözlüğünü PARALEL çekebiliyor (bkz. app/reader/[chapterId].tsx
    // ve ReaderScreen'in `initialBookId` prop'u) -- burada zaten elimizde.
    router.push(`/reader/${chapter.id}?bookId=${data.book.id}`);
  };

  const handlePressCta = () => {
    if (!data?.book || !data.continueChapter) return;
    trackEvent(data.hasStarted ? "book_reading_continued" : "book_reading_started", {
      bookId: data.book.id,
      chapterId: data.continueChapter.id,
    });
    router.push(`/reader/${data.continueChapter.id}?bookId=${data.book.id}`);
  };

  /**
   * "Dinle": okumayla AYNI bölüme gidiyor, tek farkı seslendirmenin
   * kendiliğinden başlaması. Ayrı bir dinleme ekranı açmıyoruz — metin ve
   * ses aynı yüzeyde, çünkü ürünün amacı dinlemek değil OKURKEN takip
   * edebilmek (ADR-011/012).
   */
  const handlePressListen = () => {
    if (!data?.book || !data.continueChapter) return;

    // Kilitliyken reader'a göndermek işe yaramazdı: orada seslendirme
    // düğmesi zaten görünmüyor ve kullanıcı neden dinleyemediğini
    // anlamadan okuma ekranında kalırdı. Teklif okuma akışının dışında
    // yapılıyor (Ürün İlkesi #1) — yani tam burada.
    /**
     * ERİŞİM CEVABI GELMEDEN PAYWALL'A GÖNDERİLMİYOR.
     *
     * DENETİM BULGUSU (2026-09-19): koşul `!audioAccess?.canPlay` idi ve
     * `audioAccess`, `can_play_book_audio` RPC'si yoldayken `undefined`,
     * çağrı başarısız olursa (çevrimdışı, 5xx) KALICI OLARAK `undefined`.
     * Düğme ise `book.hasAudio` doğru olur olmaz etkinleşiyordu, yani
     * pencere tam bir sunucu gidiş-dönüşü kadardı: AKTİF PREMIUM bir abone
     * "Dinle"ye erkenden basınca, zaten satın aldığı ürün için paywall'a
     * gönderiliyordu.
     *
     * Erişim BİLİNMİYORSA artık sorgu yeniden deneniyor; paywall yalnızca
     * sunucu "hayır" dediğinde açılıyor. Düğme de zaten yalnızca cevap
     * geldiğinde etkin (aşağıya bak) -- bu, o kapıyı kaçıran bir dokunuş
     * için son savunma.
     */
    if (!isAudioAccessKnown) {
      void refetchAudioAccess();
      return;
    }

    if (!audioAccess?.canPlay) {
      trackEvent("book_listen_locked", { bookId: data.book.id });
      router.push("/paywall?source=audio");
      return;
    }

    trackEvent("book_listen_started", {
      bookId: data.book.id,
      chapterId: data.continueChapter.id,
    });
    router.push(`/reader/${data.continueChapter.id}?autoplay=1&bookId=${data.book.id}`);
  };

  const handleBack = () => {
    router.back();
  };

  const handlePressNextBookInSeries = (nextBookId: string) => {
    router.push(`/book/${nextBookId}`);
  };

  const isFavorited = data?.book ? (favoritedBookIds?.has(data.book.id) ?? false) : false;

  const handleToggleFavorite = () => {
    if (!data?.book) return;
    trackEvent("book_detail_favorite_toggled", { bookId: data.book.id, isFavorited: !isFavorited });
    toggleFavoriteMutation.mutate(
      { bookId: data.book.id, isFavorited },
      {
        onSuccess: () => {
          if (!isFavorited) showToast(t("favorites.toast.added"));
        },
        // DENETİM BULGUSU (2026-09-19): `onError` hiç yoktu. Sunucu
        // hatasında `onSettled` sorguları geçersiz kılıyor, kalp eski
        // hâline geri dönüyor ve kullanıcı dokunuşunun neden hiçbir şey
        // yapmadığını ÖĞRENEMİYOR -- arıza gibi görünüyor.
        onError: () => {
          showToast(t("favorites.toast.failed"));
        },
      },
    );
  };

  const renderChapter: ListRenderItem<Chapter> = ({ item }) => (
    <ChapterListItem chapter={item} onPress={handleOpenChapter} />
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <LoadingState message={t("bookDetail.loading")} />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <ErrorState message={t("bookDetail.error")} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  const { book, progressPercent, continueChapter, hasStarted } = data;
  const ctaLabel =
    hasStarted && continueChapter
      ? t("bookDetail.cta.continue", { index: continueChapter.index })
      : t("bookDetail.cta.start");

  const ListHeader = (
    <View>
      {/* Üst bar referanstaki gibi iki İKON: geri oku ve yer imi. Eskiden
          solda "GERİ" yazısı, sağda kalp karakteri (♥/♡) vardı -- kalp
          bir metin glifiydi, yani platforma göre farklı çiziliyordu ve
          uygulamanın ikon setiyle aynı görsel dile ait değildi. */}
      <View style={styles.topbar}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t("bookDetail.backAccessibilityLabel")}
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text.primary} />
        </Pressable>
        <Pressable
          onPress={handleToggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={t(isFavorited ? "favorites.action.remove" : "favorites.action.add")}
          hitSlop={{ top: spacing.ml, bottom: spacing.ml, left: spacing.ml, right: spacing.ml }}
          style={[
            styles.favoriteButton,
            { backgroundColor: isFavorited ? theme.accent : theme.bg.surface },
          ]}
        >
          <Ionicons
            name={isFavorited ? "bookmark" : "bookmark-outline"}
            size={18}
            color={isFavorited ? theme.text.onAccent : theme.text.secondary}
          />
        </Pressable>
      </View>

      <BookHero book={book} />
      <BookStatsRow book={book} progressPercent={progressPercent} />
      {series ? (
        <BookSeriesInfo series={series} onPressNextBook={handlePressNextBookInSeries} />
      ) : null}

      <BookAudioCard
        bookId={book.id}
        hasAudio={book.hasAudio}
        onPressUpgrade={() => router.push("/paywall?source=audio")}
      />

      <View style={styles.cta}>
        <Button label={ctaLabel} onPress={handlePressCta} disabled={!continueChapter} fullWidth />
        {/* Stüdyo kaydı olmayan kitapta (klasiklerin tamamı) düğme hiç
            görünmüyor: dinlenecek bir şey yok. Kilitliyken görünüyor ama
            paywall'a gidiyor -- teklif okuma akışının DIŞINDA (Ürün İlkesi
            #1), yani tam burada.

            `isAudioAccessKnown` (2026-09-19): erişim cevabı gelmeden düğme
            ETKİN DEĞİL. Öncesinde etkindi ve erken basan premium kullanıcı
            paywall'a düşüyordu (bkz. `handlePressListen`'deki not). */}
        {book.hasAudio ? (
          <Button
            label={t("bookDetail.cta.listen")}
            accessibilityLabel={t(
              isAudioAccessKnown && !audioAccess?.canPlay
                ? "bookDetail.cta.listenLockedAccessibilityLabel"
                : "bookDetail.cta.listenAccessibilityLabel",
            )}
            /*
              PREMIUM İŞARETİ (2026-09-19, kullanıcı önerisi): erişimi
              OLMAYAN kullanıcıda düğmenin yanında paywall'ın premium
              sembolü (taç) görünüyor; premium kullanıcıda hiç çizilmiyor.
              Öncesinde iki durum aynı görünüyordu ve kullanıcı basmadan
              önce bunun ücretli bir özellik olduğunu anlayamıyordu.

              ADR-012 ile çelişmiyor: "kilitli kontrolü gizle" kuralı OKUMA
              EKRANI için (Ürün İlkesi #1). Kitap detayı teklifin YAPILDIĞI
              yer -- `BookAudioCard` de tam üstünde "premium'a dahil" diyor.

              Erişim henüz BİLİNMİYORKEN de çizilmiyor: cevap gelmeden taç
              göstermek, premium kullanıcıya bir an için "bu sende yok"
              demek olurdu.
            */
            icon={
              isAudioAccessKnown && !audioAccess?.canPlay ? (
                <MaterialCommunityIcons name="crown" size={16} color={theme.accent} />
              ) : undefined
            }
            onPress={handlePressListen}
            disabled={!continueChapter || !isAudioAccessKnown}
            variant="secondary"
            fullWidth
          />
        ) : null}
      </View>

      {/* KİTAP HAKKINDA (referance3). Metin kitabın kendi dilinde
          (migration 039). Henüz yazılmamışsa bölüm HİÇ gösterilmiyor --
          boş bir başlık bırakmak, eksikliği daha görünür yapardı. */}
      {book.description ? (
        <View style={styles.about}>
          {/* BAŞLIK YOK -- referansta (referance3.jpeg) metnin üstünde
              "Kitap hakkında" gibi bir etiket bulunmuyor. Metin zaten ne
              olduğunu kendisi anlatıyor; başlık koymak ekranın en uzun
              bloğunun önüne gereksiz bir katman ekliyordu. Renk de ikincil
              değil BİRİNCİL: referansta bu paragraf ekranın okunacak asıl
              içeriği, soluk bir yardımcı metin değil. */}
          <Text style={[type.aboutBody, { color: theme.text.primary }]}>{book.description}</Text>
        </View>
      ) : null}

      <SectionHeader title={t("bookDetail.chapters")} style={styles.sectionHead} />

      {book.chapters.length === 0 ? (
        <EmptyState
          title={t("bookDetail.empty.title")}
          description={t("bookDetail.empty.description")}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <FlashList
        data={book.chapters}
        keyExtractor={(item) => item.id}
        renderItem={renderChapter}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ChapterSeparator}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  about: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.ml,
    gap: spacing.sm,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.ml,
    gap: spacing.sm,
  },
  sectionHead: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.section,
  },
  chapterSeparator: {
    marginHorizontal: spacing.lg,
  },
});
