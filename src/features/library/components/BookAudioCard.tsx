import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
} from "@/theme";
import { UiIcon } from "@/components/ui";
import { useBookAudioAccessQuery } from "@/features/library/api/useBookAudioAccess";

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

  const accessQuery = useBookAudioAccessQuery(bookId, hasAudio);

  // Sesi olmayan kitapta (klasiklerin tamamı) blok hiç görünmüyor: orada
  // teklif edilecek bir şey yok.
  if (!hasAudio) return null;

  const access = accessQuery.data;
  // Durum bilinmeden bir şey iddia etmiyoruz; blok sessizce boş kalıyor.
  if (!access) return null;

  return (
    <View style={styles.container}>
      <UiIcon name="headphones" size={homeMetrics.rowIcon} />
      <View style={styles.texts}>
        <Text style={[detailType.sectionTitle, { color: detailColors.title }]}>
          {t("bookDetail.audio.label")}
        </Text>
        <Text style={[homeType.cardSub, { color: detailColors.muted }]}>
          {access.canPlay ? t("bookDetail.audio.unlocked") : t("bookDetail.audio.locked")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    marginHorizontal: detailMetrics.gutter,
    marginTop: homeSpace.xl,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    // Beyaz kart: hemen altındaki "Dinle" düğmesi şeftali; ikisi aynı tonda
    // üst üste tek bir blok gibi görünüyordu.
    backgroundColor: homeColors.card,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  texts: {
    flex: 1,
    gap: homeSpace.xs,
  },
});
