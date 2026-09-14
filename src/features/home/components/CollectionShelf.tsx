import { StyleSheet, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";

import { collectionColors, spacing } from "@/theme";
import { SectionHeader } from "@/components/ui";
import { CollectionCard, type CollectionCardData } from "@/features/home/components/CollectionCard";

interface CollectionShelfProps {
  onPressCollection: (collection: CollectionCardData) => void;
}

/**
 * FAZ 3 (2026-09-14, referans uygulama eşleştirmesi): "Koleksiyonlar"
 * rafı -- referansta gerçek bir kitap listesi değil, düz renkli iki sabit
 * hedef kartı ("Popüler", "Sesli kitaplar"), her biri `/browse`'a bir
 * filtre parametresiyle (bkz. `useLocalBookFilter`'ın `popular`/`hasAudio`
 * alanları) yönlendiriyor. Renkler sabit/tema-bağımsız (referansın kendi
 * mor/turuncu paleti) -- `levelAccent` gibi, tema değişse de aynı kalması
 * gereken bir kimlik rengi, `colors.ts`'in tema token'larından değil.
 */
const COLLECTIONS: CollectionCardData[] = [
  { key: "popular", label: "", color: collectionColors.popular },
  { key: "audiobooks", label: "", color: collectionColors.audiobooks },
];

export function CollectionShelf({ onPressCollection }: CollectionShelfProps) {
  const { t } = useTranslation();

  const collections = COLLECTIONS.map((collection) => ({
    ...collection,
    label:
      collection.key === "popular"
        ? t("home.collections.popular")
        : t("home.collections.audiobooks"),
  }));

  const renderItem: ListRenderItem<CollectionCardData> = ({ item }) => (
    <CollectionCard collection={item} onPress={onPressCollection} />
  );

  return (
    <View style={styles.container}>
      <SectionHeader title={t("home.collections.title")} style={styles.head} />
      <FlashList
        horizontal
        data={collections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxxxl,
  },
  head: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
});
