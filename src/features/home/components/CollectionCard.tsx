import { Pressable, StyleSheet, Text } from "react-native";

import { onLevelAccent, radius, spacing, type } from "@/theme";

export const COLLECTION_CARD_WIDTH = 168;
export const COLLECTION_CARD_HEIGHT = 108;

export interface CollectionCardData {
  key: string;
  label: string;
  /** Solid fill color -- referans uygulamada gradyan değil DÜZ renk
   * kullanılıyor (bkz. `CollectionShelf`'in doc yorumu). */
  color: string;
}

interface CollectionCardProps {
  collection: CollectionCardData;
  onPress: (collection: CollectionCardData) => void;
}

/**
 * FAZ 3 (2026-09-14, referans uygulama eşleştirmesi): "Koleksiyonlar"
 * rafının kartı -- geniş, düz renkli, köşeleri belirgin yuvarlatılmış
 * dikdörtgen, ortasında kalın beyaz tek satır etiket. Referansta gerçek
 * kitap kapağı YOK, yalnızca renk + metin.
 */
export function CollectionCard({ collection, onPress }: CollectionCardProps) {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: collection.color }]}
      onPress={() => onPress(collection)}
      accessibilityRole="button"
      accessibilityLabel={collection.label}
    >
      {/* Almanca/Rusça etiketler 136pt'lik alanda üç satıra taşıyordu. */}
      <Text
        style={[type.bookTitleLg, styles.label]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {collection.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: COLLECTION_CARD_WIDTH,
    height: COLLECTION_CARD_HEIGHT,
    borderRadius: radius.cover,
    marginRight: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  label: {
    color: onLevelAccent,
    textAlign: "center",
  },
});
