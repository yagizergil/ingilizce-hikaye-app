import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { badgePadding, monoType, motion, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface StreakChipProps {
  /** Mevcut kesintisiz okuma günü sayısı. */
  streak: number;
  /** Bugün okundu mu — serinin bugün güvende olup olmadığını anlatıyor. */
  readToday: boolean;
  onPress: () => void;
}

/**
 * Ana ekranın üst çubuğundaki seri göstergesi.
 *
 * NEDEN VAR: seri zaten hesaplanıyordu (`useProfileStatsQuery`) ama yalnızca
 * Profil sekmesinin içinde duruyordu. Görünmeyen bir seri davranışı
 * etkilemez — kullanıcı onu korumak için bir şey yapamaz, çünkü var
 * olduğunu bilmiyor. Uygulamanın en çok açılan ekranında görünmesi, seriyi
 * bir sayaçtan bir sebebe çeviriyor.
 *
 * NEDEN SIFIRDA GÖRÜNMÜYOR: "0 günlük seri" bir başarı değil, bir
 * suçlamadır. Rozet ancak korunacak bir şey varken beliriyor.
 *
 * İKİ HÂLİ:
 *  - Bugün okundu: accent renkte, dolu ikon — seri güvende.
 *  - Bugün okunmadı: sessiz renkte, boş ikon — bugün hâlâ yapılacak bir
 *    şey var. Uyarı metni YOK; renk farkı yeterli, ana ekran bir
 *    hatırlatma panosu değil.
 */
export function StreakChip({ streak, readToday, onPress }: StreakChipProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (streak <= 0) return null;

  const color = readToday ? theme.accent : theme.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(
        readToday ? "home.streak.accessibilitySafe" : "home.streak.accessibilityAtRisk",
        { count: streak },
      )}
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: color, opacity: pressed ? motion.pressed.opacity : 1 },
      ]}
    >
      <Ionicons name={readToday ? "flame" : "flame-outline"} size={14} color={color} />
      <View>
        <Text style={[monoType.badge, styles.value, { color }]}>{streak}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: badgePadding.horizontal,
    paddingVertical: badgePadding.vertical,
    minHeight: 24,
  },
  value: {
    fontVariant: ["tabular-nums"],
  },
});
