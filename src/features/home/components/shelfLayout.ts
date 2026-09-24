import { StyleSheet } from "react-native";

import { spacing } from "@/theme";

/**
 * Ana sayfadaki bütün yatay rafların ORTAK geometrisi.
 *
 * Dört raf bu değerleri ayrı ayrı kopyalıyordu; yükleme iskeleti ise
 * bambaşka ölçüler kullanıyordu ve veri gelince her şey yer değiştiriyordu
 * (kullanıcı bulgusu, 2026-09-24). Raflar da iskelet de artık buradan okuyor.
 *
 * FlashList v2 öğeleri mutlak konumlandırıyor: `contentContainerStyle`
 * içindeki `gap` YOK SAYILIYOR. Kartlar arası boşluk kartın `marginRight`i.
 */
export const SHELF_ITEM_GAP = spacing.md;

export const shelfStyles = StyleSheet.create({
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
