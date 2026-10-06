import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";
import { BookCover, BookCover3D, PressableScale } from "@/components/ui";
import { CATEGORY_DEFINITIONS } from "@/features/home/categoryRegistry";

import type { Book } from "@/features/library/types";

interface HomeBookCardProps {
  book: Book;
  finished: boolean;
  onPress: (book: Book) => void;
  /** Uzun basma (ör. favoriye ekle/çıkar). */
  onLongPress?: (book: Book) => void;
  /** Izgarada: kart genişliği kabına uyar, sağ boşluk yok. */
  fluid?: boolean;
}

/** Kitabın ana türünün çevrilmiş adı; küratörlü listede yoksa seviye kodu. */
function useRibbonLabel(book: Book): string {
  const { t } = useTranslation();
  const category = CATEGORY_DEFINITIONS.find((definition) => definition.genre === book.genre);
  return category ? t(`home.categories.${category.key}`) : book.level;
}

export function HomeBookCard({
  book,
  finished,
  onPress,
  onLongPress,
  fluid = false,
}: HomeBookCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const ribbon = useRibbonLabel(book);
  const initial = book.author.trim().charAt(0).toUpperCase();
  // Izgarada kart genişliği kabından geliyor; kapağın sayfa bloğu için
  // genişliğin ~%2'si ayrılıyor (bkz. BookCover3D).
  const [slotWidth, setSlotWidth] = useState<number | null>(null);
  const available = fluid ? slotWidth : homeMetrics.shelfCardWidth;
  const coverWidth = available === null ? null : Math.floor(available / PAGE_ALLOWANCE);

  return (
    <PressableScale
      style={fluid ? styles.cardFluid : styles.card}
      onPress={() => onPress(book)}
      onLongPress={onLongPress ? () => onLongPress(book) : undefined}
      accessibilityRole="button"
      accessibilityLabel={t("library.book.accessibilityLabel", {
        title: book.title,
        author: book.author,
        level: book.level,
      })}
    >
      <View
        style={styles.coverSlot}
        onLayout={fluid ? (event) => setSlotWidth(event.nativeEvent.layout.width) : undefined}
      >
        {coverWidth !== null ? (
          <BookCover3D
            uri={book.coverUrl}
            width={coverWidth}
            height={Math.round(coverWidth * COVER_ASPECT)}
            ribbon={ribbon}
            fallback={
              <BookCover
                title={book.title}
                author={book.author}
                coverUrl={null}
                width="100%"
                height="100%"
              />
            }
          >
            {finished ? (
              <View style={styles.finished} accessibilityLabel={t("library.book.finishedTag")}>
                <Ionicons name="checkmark" size={homeSpace.md} color={homeColors.card} />
              </View>
            ) : null}
          </BookCover3D>
        ) : null}
      </View>
      <Text style={[homeType.bookTitle, styles.title, { color: palette.ink }]} numberOfLines={2}>
        {book.title}
      </Text>
      <View style={styles.author}>
        <View style={styles.avatar}>
          <Text style={[homeType.ribbon, styles.avatarText]}>{initial}</Text>
        </View>
        <Text
          style={[homeType.bookAuthor, styles.authorName, { color: palette.muted }]}
          numberOfLines={1}
        >
          {book.author}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * Kapak yükseklik/genişlik oranı: kapak görsellerinin KENDİ oranı (600x900,
 * 2:3). Eskiden 158x193'e kırpılıyordu ve kapağın altındaki başlık bandı
 * kesiliyordu -- kapak bir kitap değil, bir resim parçası gibi duruyordu.
 */
const COVER_ASPECT = 1.5;
/** Sayfa bloğu kapağın sağında genişliğin ~%2,2'si kadar yer tutuyor. */
const PAGE_ALLOWANCE = 1.025;

interface HomeBookShelfProps {
  title: string;
  moreLabel?: string;
  onPressMore?: () => void;
  books: Book[];
  onPressBook: (book: Book) => void;
  finishedBookIds?: Set<string>;
}

/**
 * Ana sayfa raf bölümü: kalın başlık + turuncu altı çizili "Hepsini gör"
 * bağlantısı, altında yatay kayan 173 pt'lik kapaklar. Kapağın sağ üstünde
 * türü söyleyen kurdele, solunda kitap sırtı gölgesi var.
 */
export function HomeBookShelf({
  title,
  moreLabel,
  onPressMore,
  books,
  onPressBook,
  finishedBookIds,
}: HomeBookShelfProps) {
  const palette = useHomePalette();
  const renderItem: ListRenderItem<Book> = ({ item }) => (
    <HomeBookCard
      book={item}
      finished={finishedBookIds?.has(item.id) ?? false}
      onPress={onPressBook}
    />
  );

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
      <View style={styles.head}>
        <Text
          style={[homeType.sectionTitle, styles.sectionTitle, { color: palette.ink }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {moreLabel && onPressMore ? (
          <Pressable onPress={onPressMore} hitSlop={homeSpace.md} accessibilityRole="link">
            <Text style={[homeType.seeAll, styles.seeAll]}>{moreLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <FlashList
        horizontal
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: homeMetrics.sectionTop,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: homeMetrics.gutter,
    marginBottom: homeMetrics.sectionHeadBottom,
  },
  sectionTitle: {
    color: homeColors.ink,
  },
  seeAll: {
    color: homeColors.orange,
    textDecorationLine: "underline",
  },
  listContent: {
    paddingHorizontal: homeMetrics.gutter,
  },
  // FlashList mutlak konumlandırıyor: kartlar arası boşluk `marginRight`.
  card: {
    width: homeMetrics.shelfCardWidth,
    marginRight: homeMetrics.shelfGap,
  },
  cardFluid: {
    flex: 1,
  },
  coverSlot: {
    width: "100%",
    minHeight: homeMetrics.shelfCardWidth * 1.5,
  },
  finished: {
    position: "absolute",
    right: homeSpace.sm,
    bottom: homeSpace.sm,
    width: homeMetrics.avatar,
    height: homeMetrics.avatar,
    borderRadius: homeMetrics.avatar / 2,
    backgroundColor: homeColors.finished,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: homeColors.ink,
    marginTop: homeSpace.sm + 2,
  },
  // Yazar başlığın HEMEN altında (yakınlık ilkesi: birbirine ait bilgiler
  // birlikte durur). Eskiden başlık iki satırlık sabit yükseklik ayırıyordu
  // ve tek satırlık başlıklarda yazarla arasında bir satırlık boşluk kalıyordu.
  author: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
    marginTop: homeSpace.xs,
  },
  avatar: {
    width: homeMetrics.avatar,
    height: homeMetrics.avatar,
    borderRadius: homeMetrics.avatar / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: homeColors.ribbonInk,
  },
  authorName: {
    flex: 1,
    color: homeColors.muted,
  },
});
