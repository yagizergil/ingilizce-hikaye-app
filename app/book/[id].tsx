import { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeType,
  spacing,
  synopsisType,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import {
  BookCover3D,
  EmptyState,
  ErrorState,
  Hairline,
  MascotLoading,
  SectionHeader,
  useToast,
} from "@/components/ui";
import {
  CATEGORY_DEFINITIONS,
  useFavoritedBookIdsQuery,
  useToggleFavoriteMutation,
} from "@/features/home";
import {
  BookAudioCard,
  BookSeriesInfo,
  BookWordOverlap,
  ChapterListItem,
  LEVEL_GROUPS,
  LEVEL_GROUP_LEVELS,
  useBookAudioAccessQuery,
  useBookDetailQuery,
  useBookSeriesQuery,
} from "@/features/library";

import { BookQuizEntry } from "@/features/quiz";

import type { Chapter } from "@/features/library";

const SCENE = require("../../assets/home/home-scene.jpg") as number;
const ICON_LEVEL = require("../../assets/home/icon-detail-gauge.png") as number;
const ICON_CHAPTERS = require("../../assets/home/icon-detail-books.png") as number;
const ICON_MINUTES = require("../../assets/home/icon-detail-hourglass.png") as number;

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
  const bookId = data?.book.id;
  const focusedOnceRef = useRef(false);

  useEffect(() => {
    // Bağımlılık kimlik: her yeniden çekimde nesne değiştiği için eskiden
    // aynı görüntüleme birden çok kez sayılıyordu.
    if (bookId) trackEvent("book_detail_viewed", { bookId });
  }, [bookId]);

  // Bu ekran, okuma ilerlemesi altında değişirken yığında bağlı kalabiliyor
  // (bölüm bitirip geri dönmek gibi): her odaklanmada yeniden çek.
  useFocusEffect(
    useCallback(() => {
      // İlk odak = ilk açılış; sorgu zaten çekiyor. Eskiden açılışta iki
      // istek gidiyordu. Yalnızca geri dönüşlerde yenile.
      if (!focusedOnceRef.current) {
        focusedOnceRef.current = true;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const handleOpenChapter = (chapter: Chapter) => {
    if (!data?.book) return;
    trackEvent("book_chapter_opened", { bookId: data.book.id, chapterId: chapter.id });
    // `bookId` query param'ı: reader kitap sözlüğünü bölüm sorgusunu
    // beklemeden PARALEL çekebiliyor (bkz. app/reader/[chapterId].tsx).
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
   * kendiliğinden başlaması (okuyucu dinleme modunda açılıyor, ADR-011/012).
   * Erişim cevabı gelmeden paywall'a gönderilmiyor: premium kullanıcı
   * erken basınca kendi aldığı ürün için paywall görmesin (denetim
   * bulgusu, 2026-09-19).
   */
  const handlePressListen = () => {
    if (!data?.book || !data.continueChapter) return;

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
        // Sunucu hatasında kalp eski hâline dönüyor; kullanıcı nedenini
        // öğrensin diye bildirim gösteriliyor (denetim bulgusu, 2026-09-19).
        onError: () => {
          showToast(t("favorites.toast.failed"));
        },
      },
    );
  };

  const handleShare = () => {
    if (!data?.book) return;
    trackEvent("book_detail_shared", { bookId: data.book.id });
    void Share.share({ message: `${data.book.title} — ${data.book.author}` });
  };

  if (isLoading) {
    return <MascotLoading />;
  }

  if (isError || !data) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.bg.primary, paddingTop: insets.top }]}
      >
        <ErrorState message={t("bookDetail.error")} onRetry={() => void refetch()} />
      </View>
    );
  }

  const { book, continueChapter, hasStarted, isFinished } = data;
  const listenLocked = isAudioAccessKnown && !audioAccess?.canPlay;

  const ctaLabel = isFinished
    ? t("bookDetail.cta.reread")
    : hasStarted && continueChapter
      ? t("bookDetail.cta.continue", { index: continueChapter.index })
      : t("bookDetail.cta.start");

  const levelGroup = LEVEL_GROUPS.find((group) => LEVEL_GROUP_LEVELS[group].includes(book.level));
  const levelLabel = levelGroup ? t(`home.shelves.level.${levelGroup}`) : book.level;
  const category = CATEGORY_DEFINITIONS.find((definition) => definition.genre === book.genre);
  const ribbon = category ? t(`home.categories.${category.key}`) : book.level;
  const initial = book.author.trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: detailColors.circle }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // İki düğme (Dinle + Oku) sabit alanda üst üste: liste altta
          // onların arkasında kalmasın.
          paddingBottom:
            (book.hasAudio ? detailMetrics.ctaHeight * 2 + spacing.sm : detailMetrics.ctaHeight) +
            detailMetrics.ctaBottom * 3 +
            insets.bottom,
        }}
      >
        <View style={styles.hero}>
          <Image source={SCENE} style={styles.scene} contentFit="cover" contentPosition="bottom" />

          <View style={[styles.topButtons, { top: insets.top + homeMetrics.pillTop }]}>
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              style={styles.roundButton}
            >
              <Ionicons name="arrow-back-outline" size={22} color={detailColors.muted} />
            </Pressable>
            <View style={styles.rightButtons}>
              <Pressable
                onPress={handleToggleFavorite}
                accessibilityRole="button"
                accessibilityLabel={t(
                  isFavorited ? "favorites.action.remove" : "favorites.action.add",
                )}
                style={styles.roundButton}
              >
                <Ionicons
                  name={isFavorited ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorited ? homeColors.orange : detailColors.muted}
                />
              </Pressable>
              <Pressable
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel={t("bookDetail.share")}
                style={styles.roundButton}
              >
                <Ionicons name="arrow-redo-outline" size={22} color={detailColors.muted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.cover}>
            <BookCover3D
              uri={book.coverUrl}
              // Kapağın kendi 2:3 oranı: yükseklik aynı, genişlik ondan türüyor
              // (başlık bandı kırpılmasın).
              width={Math.round((detailMetrics.coverHeight * 2) / 3)}
              height={detailMetrics.coverHeight}
              ribbon={ribbon}
            />
          </View>
        </View>

        <Text style={[detailType.heroTitle, styles.title]}>{book.title}</Text>

        {/* Ok bir eylem vaat ediyor: yazarın diğer kitaplarını açar
            (eskiden dokunulamıyordu -- kullanıcı bulgusu, 2026-10-05). */}
        <Pressable
          onPress={() =>
            router.push({ pathname: "/browse", params: { title: book.author, q: book.author } })
          }
          accessibilityRole="link"
          accessibilityLabel={t("bookDetail.byAuthor", { author: book.author })}
          hitSlop={spacing.sm}
          style={({ pressed }) => [styles.authorRow, pressed ? styles.authorPressed : null]}
        >
          <View style={styles.avatar}>
            <Text style={[homeType.ribbon, styles.avatarText]}>{initial}</Text>
          </View>
          <Text style={[detailType.author, styles.authorText]}>
            {t("bookDetail.byAuthor", { author: book.author })}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={detailColors.muted} />
        </Pressable>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Image source={ICON_LEVEL} style={styles.statIcon} contentFit="cover" />
            <Text style={[detailType.statLabel, styles.statLabel]}>{levelLabel}</Text>
          </View>
          <View style={styles.stat}>
            <Image source={ICON_CHAPTERS} style={styles.statIcon} contentFit="cover" />
            <Text style={[detailType.statLabel, styles.statLabel]}>
              {t("bookDetail.statChapters", { count: book.chapters.length })}
            </Text>
          </View>
          <View style={styles.stat}>
            <Image source={ICON_MINUTES} style={styles.statIcon} contentFit="cover" />
            <Text style={[detailType.statLabel, styles.statLabel]}>
              {t("bookDetail.statMinutes", { count: book.estimatedMinutes })}
            </Text>
          </View>
        </View>

        {book.description ? (
          <View style={styles.synopsis}>
            <Text style={[detailType.sectionTitle, { color: detailColors.title }]}>
              {t("bookDetail.synopsis")}
            </Text>
            <Text style={[synopsisType, styles.synopsisBody]}>{book.description}</Text>
          </View>
        ) : null}

        <BookWordOverlap bookId={book.id} />
        <BookQuizEntry bookId={book.id} />
        {series ? (
          <BookSeriesInfo series={series} onPressNextBook={handlePressNextBookInSeries} />
        ) : null}
        <BookAudioCard bookId={book.id} hasAudio={book.hasAudio} />

        <SectionHeader title={t("bookDetail.chapters")} style={styles.sectionHead} />

        {book.chapters.length === 0 ? (
          <EmptyState
            title={t("bookDetail.empty.title")}
            description={t("bookDetail.empty.description")}
          />
        ) : (
          book.chapters.map((chapter, index) => (
            <View key={chapter.id}>
              {index > 0 ? <Hairline style={styles.chapterSeparator} /> : null}
              <ChapterListItem chapter={chapter} onPress={handleOpenChapter} />
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.ctaWrap, { bottom: detailMetrics.ctaBottom + insets.bottom }]}>
        <Pressable
          onPress={handlePressCta}
          disabled={!continueChapter}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={({ pressed }) => [
            styles.cta,
            !continueChapter ? styles.ctaDisabled : null,
            pressed ? styles.ctaPressed : null,
          ]}
        >
          <Text style={[detailType.cta, { color: detailColors.amberInk }]}>{ctaLabel}</Text>
        </Pressable>
        {/* "Dinle" okuma düğmesinin hemen altında (2026-10-06): eskiden
            sayfanın ortasında, kaydırınca kayboluyordu. Stüdyo kaydı olmayan
            kitapta hiç görünmüyor. Premium değilse taç + "Premium" ile
            görünür ve paywall'a gider -- okuma akışının DIŞINDA (İlke #1). */}
        {book.hasAudio ? (
          <Pressable
            onPress={handlePressListen}
            disabled={!continueChapter}
            accessibilityRole="button"
            accessibilityLabel={t(
              listenLocked
                ? "bookDetail.cta.listenLockedAccessibilityLabel"
                : "bookDetail.cta.listenAccessibilityLabel",
            )}
            style={({ pressed }) => [
              styles.cta,
              styles.listenCta,
              !continueChapter ? styles.ctaDisabled : null,
              pressed ? styles.ctaPressed : null,
            ]}
          >
            <Ionicons name="headset" size={20} color={detailColors.amberInk} />
            <Text style={[detailType.cta, { color: detailColors.amberInk }]}>
              {t("bookDetail.cta.listen")}
            </Text>
            {listenLocked ? (
              <View style={styles.premiumTag}>
                <MaterialCommunityIcons name="crown" size={13} color={detailColors.amberInk} />
                <Text style={[homeType.ribbon, { color: detailColors.amberInk }]}>
                  {t("bookDetail.cta.premiumTag")}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    height: detailMetrics.titleTop,
  },
  scene: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: detailMetrics.heroHeight,
  },
  topButtons: {
    position: "absolute",
    left: detailMetrics.gutter,
    right: detailMetrics.gutter,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rightButtons: {
    flexDirection: "row",
    gap: detailMetrics.buttonGap,
  },
  roundButton: {
    width: detailMetrics.roundButton,
    height: detailMetrics.roundButton,
    borderRadius: detailMetrics.roundButton / 2,
    backgroundColor: detailColors.circle,
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    position: "absolute",
    top: detailMetrics.coverTop,
    alignSelf: "center",
  },
  title: {
    color: detailColors.title,
    textAlign: "center",
    paddingHorizontal: detailMetrics.gutter,
  },
  authorPressed: {
    opacity: 0.6,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  avatar: {
    width: detailMetrics.authorAvatar,
    height: detailMetrics.authorAvatar,
    borderRadius: detailMetrics.authorAvatar / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: homeColors.ribbonInk,
  },
  authorText: {
    color: detailColors.muted,
  },
  // Referansta üç istatistik beyaz, gölgeli bir kartın içinde.
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.xl,
    marginHorizontal: detailMetrics.gutter,
    paddingVertical: spacing.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.card,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  stat: {
    alignItems: "center",
    gap: spacing.sm,
    width: detailMetrics.statColumn,
  },
  statIcon: {
    width: detailMetrics.statIcon,
    height: detailMetrics.statIcon,
    borderRadius: detailMetrics.statIcon / 2,
  },
  statLabel: {
    color: detailColors.title,
    textAlign: "center",
  },
  synopsis: {
    marginTop: spacing.xl,
    paddingHorizontal: detailMetrics.gutter,
    gap: spacing.sm,
  },
  synopsisBody: {
    color: detailColors.body,
  },
  sectionHead: {
    paddingHorizontal: detailMetrics.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  chapterSeparator: {
    marginHorizontal: detailMetrics.gutter,
  },
  ctaWrap: {
    position: "absolute",
    left: detailMetrics.gutter,
    right: detailMetrics.gutter,
    gap: spacing.sm,
  },
  listenCta: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: detailColors.circle,
    borderWidth: 2,
    borderColor: detailColors.amber,
  },
  premiumTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: detailMetrics.ctaHeight / 2,
    backgroundColor: detailColors.amber,
  },
  cta: {
    height: detailMetrics.ctaHeight,
    borderRadius: detailMetrics.ctaHeight / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPressed: {
    opacity: 0.85,
  },
});
