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
      <View style={styles.content}>
        {showAction ? (
          <Pressable
            onPress={onFinishChapter}
            accessibilityRole="button"
            accessibilityLabel={
              hasNextChapter ? t("reader.footer.nextChapter") : t("reader.footer.finishBook")
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
    </View>
  );
}

/**
 * Footer'ın İÇERİK yüksekliği -- SABİT, `minHeight` DEĞİL.
 *
 * DENETİM BULGUSU (2026-09-19, kullanıcı videosu, ikinci tur): bu değer
 * 2026-09-18'de `minHeight: 52` olarak "düzeltilmişti" ve o düzeltmenin
 * kendi testi de geçiyordu. Ama `minHeight` bir TABAN, sabit bir yükseklik
 * değil -- ve bu kabın alt dolgusu `insets.bottom`. Ana ekran çubuğu olan
 * her iPhone'da `insets.bottom` 34 civarı, yani:
 *
 *   yüzde dalı  : 8 (üst dolgu) + 13 (metin) + 34 = 55  -> taban (52) ETKİSİZ
 *   düğme dalı  : 8 (üst dolgu) + 36 (düğme) + 34 = 78  -> taban ETKİSİZ
 *
 * Aradaki 23 px hâlâ oradaydı. Testi yazan kurulum `insets.bottom: 0`
 * kullandığı için tam da farkın kaybolduğu tek koşulu ölçüyordu.
 *
 * Kullanıcının videosunda görülen döngü tam olarak buydu: son sayfaya
 * gelinince footer 23 px büyüyor -> okuma alanı 23 px küçülüyor ->
 * sayfalama yeniden çalışıyor -> son paragraf yeni bir sayfaya taşıyor ->
 * kullanıcı artık son sayfada değil -> footer küçülüyor -> okuma alanı
 * büyüyor -> paragraf geri geliyor -> kullanıcı yine son sayfada... Videoda
 * aynı cümle ("...The phone said six per cent.") kimi karede bir sayfanın
 * SONUNDA, kimi karede TEK BAŞINA son sayfada duruyor.
 *
 * Artık iki dal da bu sabit yüksekliğin içine render ediliyor; `insets`
 * ne olursa olsun dış kap her iki durumda AYNI yükseklikte.
 */
const FOOTER_CONTENT_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    height: FOOTER_CONTENT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
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
