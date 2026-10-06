import { StyleSheet } from "react-native";

import { Image } from "expo-image";

import type { StyleProp, ImageStyle } from "react-native";

/**
 * Arayüz ikonları: Higgsfield'da tek bir stilde (krem daire içinde düz
 * vektör) üretildi. Satır ve kart başlarında Ionicons yerine bunlar
 * kullanılıyor; böylece uygulamada tek bir ikon dili var.
 */
const ICONS = {
  crown: require("../../../assets/home/icon-ui-crown.png") as number,
  globe: require("../../../assets/home/icon-ui-globe.png") as number,
  bell: require("../../../assets/home/icon-ui-bell.png") as number,
  chart: require("../../../assets/home/icon-ui-chart.png") as number,
  cards: require("../../../assets/home/icon-ui-cards.png") as number,
  bulb: require("../../../assets/home/icon-ui-bulb.png") as number,
  textsize: require("../../../assets/home/icon-ui-textsize.png") as number,
  trophy: require("../../../assets/home/icon-ui-trophy.png") as number,
  flame: require("../../../assets/home/icon-ui-flame.png") as number,
  person: require("../../../assets/home/icon-ui-person.png") as number,
  headphones: require("../../../assets/home/icon-ui-headphones.png") as number,
  bolt: require("../../../assets/home/icon-ui-bolt.png") as number,
  sparkle: require("../../../assets/home/icon-ui-sparkle.png") as number,
  bookmark: require("../../../assets/home/icon-ui-bookmark.png") as number,
  book: require("../../../assets/home/icon-stat-book.png") as number,
  calendar: require("../../../assets/home/icon-stat-calendar.png") as number,
  clock: require("../../../assets/home/icon-stat-clock.png") as number,
  books: require("../../../assets/home/icon-detail-books.png") as number,
} as const;

export type UiIconName = keyof typeof ICONS;

interface UiIconProps {
  name: UiIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const DEFAULT_SIZE = 44;

export function UiIcon({ name, size = DEFAULT_SIZE, style }: UiIconProps) {
  return (
    <Image
      source={ICONS[name]}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, style]}
      contentFit="cover"
      transition={0}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "transparent",
  },
});
