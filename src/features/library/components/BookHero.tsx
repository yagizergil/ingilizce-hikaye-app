import { StyleSheet, Text, View } from "react-native";

import { coverColumnHeight, coverColumnWidth, monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { BookCover, LevelBadge } from "@/components/ui";

import type { Book } from "@/features/library/types";

interface BookHeroProps {
  book: Book;
}

/**
 * Kitap detayının üst bloğu.
 *
 * ÖLÇÜLDÜ (docs/reference/referance3.jpeg, 1pt = 2.4046px):
 *   kapak 277x426 px -> 115 x 177 pt
 *   başlık gövde yüksekliği 35 px -> ~21 pt kalın
 *   başlığın altında seviye rozeti + biçim etiketi AYNI satırda
 *
 * Eskiden kapak 104x156 idi ve sağ sütun rozet/başlık/yazarı dikeyde
 * yayıyordu (`space-between`). Referansta blok YUKARI hizalı ve yazar
 * satırı yok -- yazar zaten kapağın üstünde yazıyor; iki kez yazmak
 * sütunu gereksiz uzatıyordu.
 */
export function BookHero({ book }: BookHeroProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <BookCover
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        width={coverColumnWidth.detail}
        height={coverColumnHeight.detail}
      />
      <View style={styles.info}>
        <Text style={[type.bookTitleLg, { color: theme.text.primary }]} numberOfLines={3}>
          {book.title}
        </Text>
        <View style={styles.metaRow}>
          <LevelBadge level={book.level} />
          <Text style={[monoType.rowText, { color: theme.text.secondary }]} numberOfLines={1}>
            {book.author}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.ml,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.ml,
    alignItems: "flex-start",
  },
  info: {
    flex: 1,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
