import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailMetrics, detailType, spacing } from "@/theme";
import { MascotAnim } from "@/components/ui/MascotAnim";

interface MascotLoadingProps {
  /** Verilmezse "Yükleniyor..." başlığı kullanılır. */
  title?: string;
  subtitle?: string;
  /** Ekranı kaplamak yerine içeriğe göre küçük (liste içi yükleme). */
  compact?: boolean;
}

/**
 * Yükleniyor ekranı: kitabın sayfalarını çeviren animasyonlu maskot (video
 * kaynaklı, şeffaf döngülü WebP), altında kalın başlık ve tek satır açıklama.
 */
export function MascotLoading({ title, subtitle, compact = false }: MascotLoadingProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[styles.container, compact ? styles.compact : styles.full]}
      accessibilityRole="progressbar"
      accessibilityLabel={title ?? t("reader.loading.title")}
    >
      <MascotAnim
        name="loading"
        width={compact ? detailMetrics.mascot : detailMetrics.mascot * 1.5}
      />
      <Text style={[detailType.loadingTitle, styles.title]}>
        {title ?? t("reader.loading.title")}
      </Text>
      <Text style={[detailType.loadingSub, styles.subtitle]}>
        {subtitle ?? t("reader.loading.subtitle")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: detailColors.circle,
    paddingHorizontal: detailMetrics.gutter,
    gap: spacing.sm,
  },
  full: {
    flex: 1,
  },
  compact: {
    paddingVertical: spacing.xxl,
  },
  title: {
    color: detailColors.title,
    textAlign: "center",
    marginTop: spacing.md,
  },
  subtitle: {
    color: detailColors.body,
    textAlign: "center",
  },
});
