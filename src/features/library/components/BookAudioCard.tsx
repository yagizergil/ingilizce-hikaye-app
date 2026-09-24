import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useBookAudioAccessQuery } from "@/features/library/api/useBookAudioAccess";
import { UpperText } from "@/components/ui/UpperText";

interface BookAudioCardProps {
  bookId: string;
  /** Stüdyo seslendirmesi bu kitap için üretilmiş mi (`books.has_audio`). */
  hasAudio: boolean;
}

/**
 * Kitap detayında stüdyo seslendirmesi bloğu.
 *
 * NEDEN BURADA: bu, premium teklifinin okuma akışı DIŞINDAKİ yüzü (Ürün
 * İlkesi #1). Reader'da hiçbir kilit ya da "yükselt" düğmesi yok; erişimi
 * olmayan kullanıcıda seslendirme düğmesi hiç görünmüyor.
 *
 * 2026-09-08: ücretsiz "bir hikâye dinle" hakkı kaldırıldı (migration 032).
 * Blok artık iki durum gösteriyor — açık ya da premium gerekli.
 *
 * Burada ayrı bir "Premium ile dinle" bağlantısı YOK (kullanıcı bulgusu,
 * 2026-09-24): aynı ekrandaki "Dinle" düğmesi kilitliyken zaten paywall'a
 * gidiyor; ikinci bir yükseltme bağlantısı aynı şeyi iki kez söylüyordu.
 */
export function BookAudioCard({ bookId, hasAudio }: BookAudioCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const accessQuery = useBookAudioAccessQuery(bookId, hasAudio);

  // Sesi olmayan kitapta (klasiklerin tamamı) blok hiç görünmüyor: orada
  // teklif edilecek bir şey yok.
  if (!hasAudio) return null;

  const access = accessQuery.data;
  // Durum bilinmeden bir şey iddia etmiyoruz; blok sessizce boş kalıyor.
  if (!access) return null;

  return (
    <View style={[styles.container, { borderTopColor: theme.border.hairline }]}>
      <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
        {t("bookDetail.audio.label")}
      </UpperText>
      <Text style={[monoType.meta, styles.body, { color: theme.text.primary }]}>
        {access.canPlay ? t("bookDetail.audio.unlocked") : t("bookDetail.audio.locked")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Kutu YOK. Tasarım dili boyunca tek ayırıcı hairline; buraya kart
  // koymak bu ekranda başka hiçbir yerde olmayan bir yüzey yaratırdı.
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.ml,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xxs,
  },
  body: {
    marginTop: spacing.xxs,
  },
});
