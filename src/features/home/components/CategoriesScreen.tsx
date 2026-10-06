import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  categoryTints,
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  searchColors,
  searchType,
  mascotSize,
} from "@/theme";
import { ErrorState, MascotAnim, MascotLoading } from "@/components/ui";
import { useHomeExtrasQuery } from "@/features/home/api/useHomeExtrasQuery";
import { CATEGORY_ICONS } from "@/features/home/categoryIcons";

import type { CategoryTag } from "@/features/home/types";

const GRADIENT_ID = "categoriesSky";

/**
 * "Tümünü gör" ekranı: bütün kitap kategorileri. İlk kart tam genişlikte
 * (öne çıkan), kalanlar iki sütun; her kart yumuşak bir tonda, solda yuvarlak
 * çizim ikon, altında ad ve kitap sayısı. Karta basınca kategori filtresiyle
 * `/browse` açılır (ana sayfadaki ızgarayla aynı hedef).
 */
export function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useHomeExtrasQuery();
  const tags = data?.categoryTags ?? [];

  const open = (tag: CategoryTag) => {
    const label = tag.labelKey ? t(tag.labelKey) : tag.label;
    const target = tag.navTarget;
    if (target.kind !== "library") return;
    const params = new URLSearchParams();
    params.set("title", label);
    if (target.genre) params.set("genre", target.genre);
    router.push(`/browse?${params.toString()}`);
  };

  const renderCard = (tag: CategoryTag, index: number) => {
    const label = tag.labelKey ? t(tag.labelKey) : tag.label;
    const featured = index === 0;
    const tint = categoryTints[index % categoryTints.length];
    return (
      <Pressable
        key={tag.key}
        onPress={() => open(tag)}
        accessibilityRole="button"
        accessibilityLabel={t("home.categoryTag.accessibilityLabel", { label, count: tag.count })}
        style={({ pressed }) => [
          styles.card,
          featured ? styles.cardFeatured : styles.cardHalf,
          { backgroundColor: tint },
          pressed ? styles.pressed : null,
        ]}
      >
        <Image
          source={CATEGORY_ICONS[tag.key] ?? undefined}
          style={featured ? styles.iconLarge : styles.icon}
          contentFit="cover"
          transition={0}
        />
        <View style={featured ? styles.textsFeatured : styles.texts}>
          <Text style={[detailType.sheetLabel, styles.name]} numberOfLines={2}>
            {label}
          </Text>
          <Text style={[homeType.statLabel, styles.count]}>
            {t("categoriesScreen.count", { count: tag.count })}
          </Text>
        </View>
        <View style={styles.arrow}>
          <Ionicons
            name="arrow-forward"
            size={homeSpace.xl - homeSpace.xs}
            color={detailColors.amberInk}
          />
        </View>
      </Pressable>
    );
  };

  const headerHeight = insets.top + detailMetrics.categoriesHeader;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[]}
      >
        <View style={{ height: headerHeight }}>
          <Svg style={styles.sky} width="100%" height={headerHeight}>
            <Defs>
              <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={searchColors.skyTop} />
                <Stop offset="1" stopColor={searchColors.skyBottom} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${GRADIENT_ID})`} />
          </Svg>
          <View style={[styles.art, { top: insets.top + homeSpace.xl }]} pointerEvents="none">
            <MascotAnim name="home" width={mascotSize.header} />
          </View>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            style={[styles.back, { top: insets.top + homeMetrics.pillTop }]}
          >
            <Ionicons name="arrow-back-outline" size={22} color={detailColors.muted} />
          </Pressable>
          <Text style={[searchType.title, styles.title]} accessibilityRole="header">
            {t("home.categoryGrid.title")}
          </Text>
          <Text style={[searchType.subtitle, styles.subtitle]}>
            {t("categoriesScreen.subtitle", { count: tags.length })}
          </Text>
        </View>

        {isLoading ? (
          <MascotLoading compact title={t("home.loading")} />
        ) : isError ? (
          <ErrorState message={t("home.error")} onRetry={() => void refetch()} />
        ) : (
          <View style={styles.grid}>{tags.map(renderCard)}</View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: searchColors.skyBottom,
  },
  content: {
    paddingBottom: homeSpace.xl * 3,
  },
  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  art: {
    position: "absolute",
    right: homeSpace.lg,
  },
  back: {
    position: "absolute",
    left: detailMetrics.gutter,
    width: detailMetrics.menuButton,
    height: detailMetrics.menuButton,
    borderRadius: detailMetrics.menuButton / 2,
    backgroundColor: detailColors.circle,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    position: "absolute",
    bottom: detailMetrics.categoriesTitleBottom,
    left: detailMetrics.gutter,
    color: searchColors.title,
  },
  subtitle: {
    position: "absolute",
    bottom: homeSpace.xs,
    left: detailMetrics.gutter,
    color: searchColors.subtitle,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: detailMetrics.categoriesGap,
    paddingHorizontal: detailMetrics.gutter,
    marginTop: homeSpace.lg,
  },
  card: {
    borderRadius: homeMetrics.cardRadius,
    padding: homeSpace.lg,
  },
  cardFeatured: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.lg,
  },
  cardHalf: {
    flexBasis: "47.5%",
    flexGrow: 1,
    minHeight: detailMetrics.categoriesCardHeight,
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.9,
  },
  icon: {
    width: homeMetrics.categoryCircle,
    height: homeMetrics.categoryCircle,
    borderRadius: homeMetrics.categoryCircle / 2,
  },
  iconLarge: {
    width: homeMetrics.categoryCircle + homeSpace.xl,
    height: homeMetrics.categoryCircle + homeSpace.xl,
    borderRadius: (homeMetrics.categoryCircle + homeSpace.xl) / 2,
  },
  texts: {
    gap: homeSpace.xxs,
    marginTop: homeSpace.md,
    paddingRight: homeSpace.xl,
  },
  textsFeatured: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  name: {
    color: homeColors.ink,
  },
  count: {
    color: homeColors.mutedStrong,
  },
  arrow: {
    position: "absolute",
    right: homeSpace.md,
    bottom: homeSpace.md,
    width: detailMetrics.arrowButton,
    height: detailMetrics.arrowButton,
    borderRadius: detailMetrics.arrowButton / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
});
