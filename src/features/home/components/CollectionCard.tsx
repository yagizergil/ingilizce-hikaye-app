import { Pressable, StyleSheet, Text } from "react-native";

import { onLevelAccent, radius, spacing, type } from "@/theme";

const CARD_WIDTH = 168;
const CARD_HEIGHT = 108;

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
      <Text style={[type.bookTitleLg, styles.label]}>{collection.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
