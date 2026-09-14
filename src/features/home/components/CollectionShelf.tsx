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
 * "Koleksiyonlar" rafı -- uygulamanın KISAYOL şeridi.
 *
 * Referansta iki sabit kart var ("Popüler", "Sesli kitaplar") ve biz de
 * ikisiyle başlamıştık; ama iki kart bir rafı doldurmuyor ve uygulamanın
 * kendi ekranlarının (favoriler, kelime tekrarı, seviyene göre kitaplar)
 * ana ekrandan hiçbir kısayolu yoktu -- kullanıcı onlara ancak sekme
 * gezinerek ulaşıyordu.
 *
 * Kartların HEPSİ var olan bir hedefe gidiyor; "yakında" kartı yok:
 *   popüler / sesli kitaplar / kısa okumalar / seviyene göre -> /browse
 *   favoriler -> /favorites        kelime tekrarı -> /review
 *
 * Renkler tema-bağımsız kimlik renkleri (bkz. `collectionColors`).
 */
const COLLECTIONS: CollectionCardData[] = [
  { key: "popular", label: "", color: collectionColors.popular },
  { key: "audiobooks", label: "", color: collectionColors.audiobooks },
  { key: "quick", label: "", color: collectionColors.quick },
  { key: "myLevel", label: "", color: collectionColors.myLevel },
  { key: "favorites", label: "", color: collectionColors.favorites },
  { key: "review", label: "", color: collectionColors.review },
];

export function CollectionShelf({ onPressCollection }: CollectionShelfProps) {
  const { t } = useTranslation();

  const collections = COLLECTIONS.map((collection) => ({
    ...collection,
    label: t(`home.collections.${collection.key}`),
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
