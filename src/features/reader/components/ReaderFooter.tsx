import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, motion, radius, spacing } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

interface ReaderFooterProps {
  progress: number;
  /**
   * Kullanıcı bölümün son sayfasında mı. Son sayfada footer, ilerleme
   * yüzdesi yerine bölümü bitiren görünür bir eylem gösteriyor.
   */
  onLastPage?: boolean;
  /** Sonraki bölüm var mı (yoksa "kitabı bitir" metni gösteriliyor). */
  hasNextChapter?: boolean;
  onFinishChapter?: () => void;
}

/**
 * Okuma ekranının alt şeridi.
 *
 * ÇÖZÜLEN SORUN (2026-09-07): bölüm bittiğinde "sonraki bölüme geç"
 * kartına ulaşmanın TEK yolu, son sayfadayken ekranın sağ çeyreğine bir kez
 * daha dokunmaktı — hiçbir yerde belirtilmeyen gizli bir hareket.
 * Kullanıcı son sayfayı görüp bölümün bittiğini sanıyor, geri çıkıyor ve
 * sonraki bölüme ulaşmak için ana sayfadan yeniden gidiyordu.
 *
 * Artık son sayfaya gelindiğinde footer kendiliğinden görünür bir eyleme
 * dönüşüyor. Gizli hareket de çalışmaya devam ediyor (alışmış kullanıcı
 * için), ama artık tek yol değil.
 *
 * Ürün ilkesi #1 korunuyor: bu bir okuma eylemi, promosyon değil.
 */
export function ReaderFooter({
  progress,
  onLastPage = false,
  hasNextChapter = false,
  onFinishChapter,
}: ReaderFooterProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const insets = useSafeAreaInsets();

  const showAction = onLastPage && onFinishChapter !== undefined;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, backgroundColor: readerColors.background },
      ]}
    >
      {showAction ? (
        <Pressable
          onPress={onFinishChapter}
          accessibilityRole="button"
          accessibilityLabel={
            hasNextChapter
              ? t("reader.footer.nextChapter")
              : t("reader.footer.finishBook")
          }
          style={({ pressed }) => [
            styles.action,
            { borderColor: readerColors.textMuted },
            pressed ? { opacity: motion.pressed.opacity } : null,
          ]}
        >
          <Text style={[monoType.label, { color: readerColors.text }]}>
            {hasNextChapter ? t("reader.footer.nextChapter") : t("reader.footer.finishBook")}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={readerColors.text} />
        </Pressable>
      ) : (
        <Text style={[monoType.metaTight, { color: readerColors.textMuted }]}>
          {`%${Math.round(progress * 100)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
  },
});
