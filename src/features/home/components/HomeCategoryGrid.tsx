import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";

import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { PressableScale } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import { CATEGORY_ICONS } from "@/features/home/categoryIcons";

import type { CategoryTag } from "@/features/home/types";

interface HomeCategoryGridProps {
  title: string;
  tags: CategoryTag[];
  onPressTag: (tag: CategoryTag) => void;
  /** Verilirse başlığın sağında "Tümünü gör" bağlantısı çıkar. */
  seeAllLabel?: string;
  onPressSeeAll?: () => void;
}

/** Ana sayfadaki "Kitap kategorileri" ızgarası: 4 sütun, yuvarlak görsel + etiket. */
export function HomeCategoryGrid({
  title,
  tags,
  onPressTag,
  seeAllLabel,
  onPressSeeAll,
}: HomeCategoryGridProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  if (tags.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
      <View style={styles.head}>
        <Text
          style={[homeType.sectionTitle, styles.title, { color: palette.ink }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {seeAllLabel && onPressSeeAll ? (
          <Pressable onPress={onPressSeeAll} hitSlop={homeSpace.md} accessibilityRole="link">
            <Text style={[homeType.seeAll, styles.seeAll]}>{seeAllLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.grid}>
        {tags.map((tag) => {
          const label = tag.labelKey ? t(tag.labelKey) : tag.label;
          return (
            <PressableScale
              key={tag.key}
              style={styles.cell}
              onPress={() => onPressTag(tag)}
              accessibilityRole="button"
              accessibilityLabel={t("home.categoryTag.accessibilityLabel", {
                label,
                count: tag.count,
              })}
            >
              <View style={styles.circle}>
                {CATEGORY_ICONS[tag.key] || tag.coverUrl ? (
                  <Image
                    source={CATEGORY_ICONS[tag.key] ?? { uri: tag.coverUrl ?? "" }}
                    style={styles.circleImage}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : null}
              </View>
              <Text
                style={[homeType.categoryLabel, styles.label, { color: palette.categoryLabel }]}
                numberOfLines={2}
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

const CELL_WIDTH = `${100 / homeMetrics.categoryColumns}%` as const;

const styles = StyleSheet.create({
  container: {
    marginTop: homeMetrics.sectionTop,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: homeMetrics.gutter + 1,
    marginBottom: homeMetrics.sectionHeadBottom,
  },
  title: {
    color: homeColors.ink,
  },
  seeAll: {
    color: homeColors.orange,
    textDecorationLine: "underline",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: homeMetrics.categoryRowGap,
  },
  cell: {
    width: CELL_WIDTH,
    alignItems: "center",
    gap: homeSpace.sm,
  },
  circle: {
    width: homeMetrics.categoryCircle,
    height: homeMetrics.categoryCircle,
    borderRadius: homeMetrics.categoryCircle / 2,
    backgroundColor: homeColors.peach,
    overflow: "hidden",
  },
  circleImage: {
    width: "100%",
    height: "100%",
  },
  label: {
    color: homeColors.mutedStrong,
    textAlign: "center",
  },
});
