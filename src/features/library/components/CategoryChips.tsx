import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { Image } from "expo-image";

import { searchColors, searchMetrics, searchType } from "@/theme";

export interface CategoryChip {
  key: string;
  label: string;
  /** `require` sonucu ikon görseli. */
  icon: number;
}

interface CategoryChipsProps {
  chips: CategoryChip[];
  onPressChip: (chip: CategoryChip) => void;
}

/** Arama alanının altındaki yatay kayan tür çipleri: 22 pt yuvarlak ikon + 13 pt etiket. */
export function CategoryChips({ chips, onPressChip }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          style={styles.chip}
          onPress={() => onPressChip(chip)}
          accessibilityRole="button"
          accessibilityLabel={chip.label}
        >
          <Image source={chip.icon} style={styles.icon} contentFit="cover" transition={0} />
          <Text style={[searchType.chip, styles.label]} numberOfLines={1}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: searchMetrics.textLeft,
    gap: searchMetrics.chipGap,
    alignItems: "center",
  },
  chip: {
    height: searchMetrics.chipHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: searchMetrics.chipIconGap,
  },
  icon: {
    width: searchMetrics.chipIcon,
    height: searchMetrics.chipIcon,
    borderRadius: searchMetrics.chipIcon / 2,
  },
  label: {
    color: searchColors.chipText,
  },
});
