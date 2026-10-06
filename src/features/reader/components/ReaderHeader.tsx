import { Pressable, StyleSheet, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailColors, detailMetrics } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useReaderModeStore } from "@/features/reader/hooks/useReaderModeStore";

interface ReaderHeaderProps {
  /** Üç nokta menüsünü (içerikler, ayarlar, kitap kelimeleri) açar. */
  onOpenMenu: () => void;
  /** Okuyucuyu kapatıp geri döner. */
  onClose: () => void;
}

/**
 * Okuyucunun üst çubuğu (referans): solda geri oku, sağda üç nokta.
 * İkisi de 41 pt yuvarlak düğme; okuma modunda neredeyse görünmez (açık
 * gri çerçeve), dinleme modunda kahverengi zeminde beyaz dolgulu.
 * Eski ikon sırası (içerikler, ayarlar, kitap, kulaklık, kota, kapat)
 * üç nokta menüsüne taşındı -- bkz. `ReaderMenuSheet`.
 */
export function ReaderHeader({ onOpenMenu, onClose }: ReaderHeaderProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const insets = useSafeAreaInsets();
  const listening = useReaderModeStore((state) => state.mode === "listen");

  const circle = listening ? styles.circleOnDark : styles.circle;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + detailMetrics.headerTop,
          backgroundColor: readerColors.background,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        onPress={onClose}
        style={circle}
        hitSlop={8}
      >
        <Ionicons name="arrow-back-outline" size={22} color={detailColors.muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("reader.header.menu")}
        onPress={onOpenMenu}
        style={circle}
        hitSlop={8}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={detailColors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: detailMetrics.gutter,
    paddingBottom: detailMetrics.headerGap,
  },
  circle: {
    width: detailMetrics.menuButton,
    height: detailMetrics.menuButton,
    borderRadius: detailMetrics.menuButton / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: detailColors.circleBorder,
  },
  circleOnDark: {
    width: detailMetrics.menuButton,
    height: detailMetrics.menuButton,
    borderRadius: detailMetrics.menuButton / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: detailColors.circle,
  },
});
