import { StyleSheet, View } from "react-native";

import { coverColumnHeight, coverColumnWidth, radius, type } from "@/theme";
import { Skeleton } from "@/components/ui";
import {
  COLLECTION_CARD_HEIGHT,
  COLLECTION_CARD_WIDTH,
} from "@/features/home/components/CollectionCard";
import { SHELF_ITEM_GAP, shelfStyles } from "@/features/home/components/shelfLayout";

const PLACEHOLDER_CARDS = [0, 1, 2];
/** Başlık iskeletinin genişliği: tipik bir raf başlığı ("Yeni Kitaplar"). */
const TITLE_WIDTH = 140;

interface SkeletonShelfProps {
  cardWidth: number;
  cardHeight: number;
}

function SkeletonShelf({ cardWidth, cardHeight }: SkeletonShelfProps) {
  return (
    <View style={shelfStyles.container}>
      <View style={shelfStyles.head}>
        <Skeleton
          width={TITLE_WIDTH}
          height={type.sectionHeading.lineHeight}
          borderRadius={radius.sm}
        />
      </View>
      <View style={[shelfStyles.listContent, styles.row]}>
        {PLACEHOLDER_CARDS.map((card) => (
          <View key={card} style={styles.card}>
            <Skeleton width={cardWidth} height={cardHeight} borderRadius={radius.cover} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Ana sayfa yüklenirken gösterilen iskelet.
 *
 * Gerçek raflarla AYNI geometriyi (`shelfLayout`) ve aynı kart ölçülerini
 * kullanıyor, sıra da aynı: koleksiyonlar, ardından iki kitap rafı. Eskiden
 * 92x138'lik kapaklar ve farklı boşluklar çiziyordu; veri gelince bütün
 * sayfa yer değiştiriyordu.
 */
export function HomeSkeleton() {
  return (
    <View style={styles.wrap}>
      <SkeletonShelf cardWidth={COLLECTION_CARD_WIDTH} cardHeight={COLLECTION_CARD_HEIGHT} />
      <SkeletonShelf cardWidth={coverColumnWidth.shelf} cardHeight={coverColumnHeight.shelf} />
      <SkeletonShelf cardWidth={coverColumnWidth.shelf} cardHeight={coverColumnHeight.shelf} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  card: {
    marginRight: SHELF_ITEM_GAP,
  },
});
