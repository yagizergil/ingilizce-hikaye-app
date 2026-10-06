import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailColors, detailMetrics, searchColors, searchType } from "@/theme";

import type { ReactNode } from "react";

const GRADIENT_ID = "skyHeader";

interface SkyHeaderProps {
  title: string;
  subtitle?: string;
  /** Verilirse sol üstte yuvarlak geri düğmesi çıkar. */
  onBack?: () => void;
  /** Sağ tarafa konan çizim (maskot vb.); mutlak konumlu kutuya yerleşir. */
  art?: ReactNode;
  /** Başlık bloğunun altındaki ek boşluk (üstüne binen kart için). */
  extraBottom?: number;
}

/**
 * Sekmelerin ve iç ekranların ortak üst bölümü ("Ara" ekranındaki gökyüzü
 * başlığıyla aynı dil): açık mavi -> beyaz geçiş, kalın başlık, gri alt
 * başlık, isteğe bağlı geri düğmesi ve sağda çizim. Tek bileşen: her ekran
 * kendi gradyanını kopyalarsa tonlar zamanla ayrışıyordu.
 */
export function SkyHeader({ title, subtitle, onBack, art, extraBottom = 0 }: SkyHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const height = insets.top + detailMetrics.skyHeader + extraBottom;

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

      {art ? (
        <View
          style={[styles.art, { top: insets.top + detailMetrics.skyArtTop }]}
          pointerEvents="none"
        >
          {art}
        </View>
      ) : null}

      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={[styles.back, { top: insets.top + detailMetrics.skyBackTop }]}
        >
          <Ionicons name="arrow-back-outline" size={22} color={detailColors.muted} />
        </Pressable>
      ) : null}

      <View style={[styles.texts, { bottom: detailMetrics.skyTextBottom + extraBottom }]}>
        <Text style={[searchType.title, { color: searchColors.title }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              searchType.subtitle,
              // Çizim varsa alt başlık onun altına girmesin (uzun alt
              // başlıklar maskotun üstüne biniyordu).
              art ? styles.subtitleWithArt : null,
              { color: searchColors.subtitle },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
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
  art: {
    position: "absolute",
    right: 0,
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
  texts: {
    position: "absolute",
    left: detailMetrics.gutter,
    right: detailMetrics.gutter,
  },
  subtitleWithArt: {
    marginRight: detailMetrics.skyArtTextInset - detailMetrics.gutter,
  },
});
