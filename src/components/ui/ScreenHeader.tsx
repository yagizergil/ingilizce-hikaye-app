import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { directionalIcon } from "@/lib/rtl";

import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";

/** Sol/sağ yuva genişliği: iki yan eşit olmazsa başlık ortadan kayar. */
const SIDE_SLOT_WIDTH = 44;
/** Bütün ekran başlıkları aynı yükseklikte: içerik aynı çizgiden başlıyor. */
const HEADER_HEIGHT = 52;

interface ScreenHeaderProps {
  title: ReactNode;
  /** Verilirse solda geri düğmesi çıkar. */
  onBack?: () => void;
  /** Modal/akış ekranlarında geri oku yerine X. */
  backIcon?: "back" | "close";
  /** Sağ yuvaya konacak eylem (ör. düzenle düğmesi). */
  right?: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
}

/**
 * Uygulamadaki TEK ekran başlığı.
 *
 * Kullanıcı bulgusu (2026-09-24): başlıklar beş farklı düzendeydi -- kimi
 * ortalı, kimi sola yaslı, kimi geri okunun yanında, üst boşlukları da
 * 4 ile 48 pt arasında değişiyordu; sekmeler arasında geçerken başlık
 * zıplıyordu. Artık hepsi aynı yükseklikte, başlık her zaman ortada, iki
 * yandaki yuvalar eşit genişlikte (geri düğmesi olmayan ekranda da boş
 * yuva duruyor, yoksa başlık ortadan kayardı).
 */
export function ScreenHeader({
  title,
  onBack,
  backIcon = "back",
  right,
  titleStyle,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View style={[styles.slot, styles.slotLeft]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t(backIcon === "close" ? "common.close" : "common.back")}
            hitSlop={spacing.sm}
          >
            <Ionicons
              name={
                backIcon === "close" ? "close" : directionalIcon("chevron-back", "chevron-forward")
              }
              size={backIcon === "close" ? 24 : 26}
              color={theme.text.primary}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.titleWrap}>
        {typeof title === "string" ? (
          <Text
            // Geri düğmeli (itilmiş) ekranlarda başlık iki yan yuva arasında
            // ~260 pt'ye sığmak zorunda; 40 pt'lik ekran başlığı "Favoriler ve
            // Okunanlar"ı yarıda kesiyordu (kullanıcı bulgusu). Oralarda
            // gezinme çubuğu ölçeği kullanılıyor; her durumda kesmek yerine
            // küçülerek sığıyor.
            style={[
              onBack ? type.sectionHeading : type.screenTitle,
              styles.title,
              { color: theme.text.primary },
              titleStyle,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            accessibilityRole="header"
          >
            {title}
          </Text>
        ) : (
          title
        )}
      </View>

      <View style={[styles.slot, styles.slotRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    // Ekran içeriğiyle aynı 20pt kenar: geri oku alttaki metinle hizalı.
    paddingHorizontal: spacing.lg,
  },
  slot: {
    width: SIDE_SLOT_WIDTH,
    justifyContent: "center",
  },
  slotLeft: {
    alignItems: "flex-start",
  },
  slotRight: {
    alignItems: "flex-end",
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
});
