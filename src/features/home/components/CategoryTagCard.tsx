import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { categoryTagColors, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { CategoryTag } from "@/features/home/types";

interface CategoryTagCardProps {
  tag: CategoryTag;
  onPress: (tag: CategoryTag) => void;
}

/** Deterministically assigns one of `categoryTagColors` per tag (by key,
 * not random) so the same tag always gets the same fallback color across
 * renders/sessions. See that token's doc comment in colors.ts. */
function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return categoryTagColors[hash % categoryTagColors.length]!;
}

const CARD_WIDTH = 148;

/**
 * "Türler ve Konular" / "Yazarlar ve Seriler" shelf card -- a square
 * "cover" (a real book cover when the tag has one, otherwise a flat
 * fallback color) with the label below it, NOT a book-cover shape (unlike
 * `BookShelf`'s `ShelfBookCard`).
 *
 * REVISED (post-launch, product-owner design pass): went through two
 * earlier revisions -- a bordered/filled text card (too small, no visual
 * weight), then a 2-stop gradient square (explicitly rejected as looking
 * arbitrary/unrelated to the tag). This version uses the tag's actual
 * `coverUrl` (an author's or series' real book cover, see
 * useHomeExtrasQuery.ts) when available, falling back to a flat single
 * color only when there's no real image to show (genre/theme tags).
 */
export function CategoryTagCard({ tag, onPress }: CategoryTagCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Tür/konu kartları çevrilebilir bir anahtar taşıyor (bkz.
  // categoryRegistry.ts); yazar ve seri kartlarının etiketi ise hazır
  // metin (kişi/seri adı) ve çevrilmiyor.
  const label = tag.labelKey ? t(tag.labelKey) : tag.label;

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(tag)}
      accessibilityRole="button"
      accessibilityLabel={t("home.categoryTag.accessibilityLabel", { label, count: tag.count })}
    >
      {tag.coverUrl ? (
        <Image source={{ uri: tag.coverUrl }} style={styles.cover} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.cover, { backgroundColor: colorForKey(tag.key) }]} />
      )}
      <Text style={[type.bookTitleMd, styles.label, { color: theme.text.primary }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: radius.md,
  },
  label: {
    marginTop: spacing.sm,
  },
});
