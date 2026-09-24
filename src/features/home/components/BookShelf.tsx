import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  badgePadding,
  coverColumnHeight,
  coverColumnWidth,
  monoType,
  radius,
  spacing,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { BookCover, LevelBadge, SectionHeader } from "@/components/ui";
import { UpperText } from "@/components/ui/UpperText";

import type { Book } from "@/features/library/types";
import { shelfStyles } from "@/features/home/components/shelfLayout";

interface ShelfBookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  /** e.g. "2/5" — the "continuing series" shelf's series-position badge.
   * Undefined for every other shelf, which renders no badge at all. */
  progressLabel?: string;
  /** Kullanıcı bu kitabı bitirdiyse kapağa "okundu" etiketi konuyor. */
  finished?: boolean;
}

/**
 * FAZ 2 (2026-09-14, referans uygulama eşleştirmesi): kapak ARTIK kendi
 * başlığını/yazarını taşıyor (gerçek kapak resmiyse görselin üzerinde,
 * tipografik fallback'te `BookCover`'ın kendi metni) -- referansta
 * kapağın ALTINDA ayrı bir başlık/yazar satırı yok. Seviye rozeti kapağın
 * SOL-ÜST köşesine bindirilmiş (`BookCover`'ın `overlay` prop'u); kapağın
 * altında da "kitap | kulaklık" ikon şeridi var (referanstaki pill-şeklinde
 * aksiyon şeridi) -- kulaklık yalnızca `book.hasAudio` true ise gösteriliyor.
 */
function ShelfBookCard({ book, onPress, progressLabel, finished = false }: ShelfBookCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={t("library.book.accessibilityLabel", {
        title: book.title,
        author: book.author,
        level: book.level,
      })}
    >
      <BookCover
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        width={coverColumnWidth.shelf}
        height={coverColumnHeight.shelf}
        overlay={
          <>
            {/* "okundu" etiketi kapağın SAĞ ÜSTÜNDE, seviye rozetinin
                karşısında -- referanstaki (referance1.jpeg) yerleşim.
                Ölçüler: yükseklik 38 px -> 16 pt, yatay iç boşluk 32 px ->
                13 pt, kapak üstünden 20 px -> 8 pt. */}
            {finished ? (
              <View style={[styles.readTag, { backgroundColor: theme.text.primary }]}>
                <Text style={[monoType.coverTag, { color: theme.bg.primary }]}>
                  {t("library.book.finishedTag")}
                </Text>
              </View>
            ) : null}
            <View style={styles.badgeOverlay}>
              <LevelBadge level={book.level} />
              {progressLabel ? (
                <View
                  style={[styles.seriesBadge, { backgroundColor: theme.bg.primary }]}
                  accessibilityRole="text"
                  accessibilityLabel={t("home.seriesCard.progress", {
                    current: progressLabel.split("/")[0],
                    total: progressLabel.split("/")[1],
                  })}
                >
                  <UpperText style={[monoType.badge, { color: theme.text.primary }]}>
                    {progressLabel}
                  </UpperText>
                </View>
              ) : null}
            </View>
          </>
        }
      />
      <View style={[styles.actionPill, { backgroundColor: theme.bg.surface }]}>
        <Ionicons name="book-outline" size={16} color={theme.text.secondary} />
        {book.hasAudio ? (
          <>
            <View style={[styles.actionDivider, { backgroundColor: theme.border.hairline }]} />
            <Ionicons name="headset-outline" size={16} color={theme.text.secondary} />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

interface BookShelfProps {
  title: string;
  moreLabel?: string;
  onPressMore?: () => void;
  books: Book[];
  onPressBook: (book: Book) => void;
  /** e.g. "2/5" per book id — only the "continuing series" shelf passes
   * this today. */
  progressLabels?: Record<string, string>;
  /** Bitirilen kitapların kimlikleri -- kapağa "okundu" etiketi koyuyor. */
  finishedBookIds?: Set<string>;
}

/** Reusable horizontal shelf: `SectionHeader` (Fraunces title + mono
 * "Tümü" link) above a horizontal `FlashList` of book covers. Callers are
 * responsible for not rendering this at all when `books` is empty — see
 * `HomeScreen`, which filters shelves before mapping them to this
 * component (component-level hide, not an empty-array render). */
export function BookShelf({
  title,
  moreLabel,
  onPressMore,
  books,
  onPressBook,
  progressLabels,
  finishedBookIds,
}: BookShelfProps) {
  const renderItem: ListRenderItem<Book> = ({ item }) => (
    <ShelfBookCard
      book={item}
      onPress={onPressBook}
      progressLabel={progressLabels?.[item.id]}
      finished={finishedBookIds?.has(item.id) ?? false}
    />
  );

  return (
    <View style={shelfStyles.container}>
      <SectionHeader
        title={title}
        moreLabel={moreLabel}
        onPressMore={onPressMore}
        style={shelfStyles.head}
      />
      <FlashList
        horizontal
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={shelfStyles.listContent}
      />
    </View>
  );
}

// Matches coverColumnWidth.shelf exactly -- the cover fills the card's
// full width edge-to-edge, no dead space beside it (see that token's doc
// comment for why this changed from a fixed 132px).
const CARD_WIDTH = coverColumnWidth.shelf;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  badgeOverlay: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: "row",
    gap: spacing.xxs,
  },
  /**
   * "okundu" etiketi -- ölçüler referanstan (referance1.jpeg):
   * yükseklik 38 px -> 16 pt, yatay iç boşluk 32 px -> 13 pt,
   * kapağın üstünden 20 px -> 8 pt, sağ kenardan 8 pt.
   */
  readTag: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    // Ölçüm 38 px -> 15.8 pt; RN'de 13 pt kalın metnin satır kutusu bunu
    // birkaç ondalık aşıp metni kırpıyor, o yüzden 18 pt. Görünen fark yok,
    // kırpılma riski yok.
    height: 18,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  seriesBadge: {
    borderRadius: radius.sm,
    paddingVertical: badgePadding.vertical,
    paddingHorizontal: badgePadding.horizontal,
    alignSelf: "flex-start",
  },
  /**
   * ÖLÇÜLDÜ (referance1.jpeg): şerit 165 px geniş -> 69 pt, 58 px yüksek
   * -> 24 pt, kapağın altından 18 px -> 8 pt. İkonlar 16 pt.
   */
  actionPill: {
    marginTop: spacing.xs,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: 69,
    height: 24,
    borderRadius: radius.full,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
  },
});
