import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import {
  useBookAudioAccessQuery,
  useClaimAudioTasterMutation,
} from "@/features/library/api/useBookAudioAccess";

interface BookAudioCardProps {
  bookId: string;
  /** Stüdyo seslendirmesi bu kitap için üretilmiş mi (`books.has_audio`). */
  hasAudio: boolean;
  onPressUpgrade: () => void;
}

/**
 * Kitap detayında stüdyo seslendirmesi bloğu.
 *
 * NEDEN BURADA: bu, premium teklifinin okuma akışı DIŞINDAKİ yüzü (Ürün
 * İlkesi #1). Reader'da hiçbir kilit, rozet ya da "yükselt" düğmesi yok;
 * kullanıcı erişimi olmadan okumaya başlarsa sesli okuma yine çalışıyor,
 * sadece cihazın sesiyle (ADR-011).
 *
 * NEDEN BİR HİKÂYE ÜCRETSİZ: farkı anlatmak mümkün değil, duyurmak
 * gerekiyor. "Doğal ses" ifadesi bir paywall maddesinde hiçbir şey ifade
 * etmiyor; bir bölüm dinlemek her şeyi ifade ediyor. Hak kitaba bağlanıyor
 * ve şema gereği bir daha verilmiyor (migration 031).
 */
export function BookAudioCard({ bookId, hasAudio, onPressUpgrade }: BookAudioCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const accessQuery = useBookAudioAccessQuery(bookId, hasAudio);
  const claim = useClaimAudioTasterMutation();

  // Sesi olmayan kitapta (klasiklerin tamamı) blok hiç görünmüyor: orada
  // seçilecek bir şey yok, cihaz sesi zaten tek ve ücretsiz seçenek.
  if (!hasAudio) return null;

  const access = accessQuery.data;
  // Durum bilinmeden bir şey iddia etmiyoruz; blok sessizce boş kalıyor.
  if (!access) return null;

  const tasterUsedElsewhere = access.tasterBookId !== null && access.tasterBookId !== bookId;

  return (
    <View style={[styles.container, { borderTopColor: theme.border.hairline }]}>
      <Text style={[monoType.label, { color: theme.text.secondary }]}>
        {t("bookDetail.audio.label")}
      </Text>
      <Text style={[monoType.meta, styles.body, { color: theme.text.primary }]}>
        {access.canPlay
          ? t("bookDetail.audio.unlocked")
          : tasterUsedElsewhere
            ? t("bookDetail.audio.tasterSpent")
            : t("bookDetail.audio.tasterOffer")}
      </Text>

      {access.canPlay ? null : (
        <Pressable
          onPress={() => {
            if (tasterUsedElsewhere) {
              onPressUpgrade();
              return;
            }
            claim.mutate(bookId);
          }}
          disabled={claim.isPending}
          accessibilityRole="button"
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Text style={[monoType.meta, styles.action, { color: theme.accent }]}>
            {tasterUsedElsewhere
              ? t("bookDetail.audio.upgradeCta")
              : t("bookDetail.audio.tasterCta")}
          </Text>
        </Pressable>
      )}
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
  action: {
    marginTop: spacing.sm,
  },
});
