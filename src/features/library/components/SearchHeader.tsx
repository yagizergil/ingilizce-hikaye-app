import { StyleSheet, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotAnim } from "@/components/ui";
import { homeMetrics, searchColors, searchMetrics, searchType } from "@/theme";

import type { ReactNode } from "react";

const GRADIENT_ID = "discoverSky";

interface SearchHeaderProps {
  /** Üstteki seviye/seri/dil hapları. */
  pills: ReactNode;
  query: string;
  onChangeQuery: (query: string) => void;
}

/**
 * "Discover" (Ara sekmesi) üst bölümü, kullanıcının verdiği referans
 * ekrana göre: açık bulutlu gökyüzü, hapların altında kalın başlık,
 * gri alt başlık, sağda dala konmuş büyüteçli papağan ve yuvarlak arama
 * alanı. Konumlar güvenli alanın üstünden ölçülmüş pt değerleri.
 */
export function SearchHeader({ pills, query, onChangeQuery }: SearchHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const top = insets.top;
  const height = top + searchMetrics.fieldTop + searchMetrics.fieldHeight;

  return (
    <View style={{ height }}>
      <Svg style={styles.sky} width="100%" height={height}>
        <Defs>
          <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={searchColors.skyTop} />
            <Stop offset="1" stopColor={searchColors.skyBottom} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${GRADIENT_ID})`} />
      </Svg>

      <View style={[styles.pills, { top: top + homeMetrics.pillTop }]}>{pills}</View>

      <MascotAnim
        name="search"
        width={searchMetrics.treeWidth}
        style={[styles.branch, { top: top + searchMetrics.treeTop }]}
      />

      <Text
        style={[searchType.title, styles.title, { top: top + searchMetrics.titleTop }]}
        accessibilityRole="header"
      >
        {t("library.search.title")}
      </Text>
      <Text
        style={[searchType.subtitle, styles.subtitle, { top: top + searchMetrics.subtitleTop }]}
      >
        {t("library.search.subtitle")}
      </Text>

      <View style={[styles.field, { top: top + searchMetrics.fieldTop }]}>
        <Ionicons
          name="search-outline"
          size={searchMetrics.fieldIcon}
          color={searchColors.fieldIcon}
        />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder={t("library.search.placeholder")}
          placeholderTextColor={searchColors.placeholder}
          style={[searchType.placeholder, styles.input]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t("library.search.placeholder")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  pills: {
    position: "absolute",
    left: homeMetrics.gutter,
    right: homeMetrics.gutter,
  },
  branch: {
    position: "absolute",
    right: searchMetrics.treeRight,
  },
  title: {
    position: "absolute",
    left: searchMetrics.textLeft,
    color: searchColors.title,
  },
  subtitle: {
    position: "absolute",
    left: searchMetrics.textLeft,
    color: searchColors.subtitle,
  },
  field: {
    position: "absolute",
    left: searchMetrics.gutter,
    right: searchMetrics.gutter,
    height: searchMetrics.fieldHeight,
    borderRadius: searchMetrics.fieldRadius,
    backgroundColor: searchColors.field,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: searchColors.fieldBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: searchMetrics.gutter,
    gap: searchMetrics.fieldGap,
  },
  input: {
    flex: 1,
    color: searchColors.rowText,
    paddingVertical: searchMetrics.inputPadding,
  },
});
