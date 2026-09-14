import { ActivityIndicator, StyleSheet, Text, View, Pressable } from "react-native";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { collectionColors, monoType, onLevelAccent, radius, spacing } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

interface ReaderHeaderProps {
  onOpenChapterList: () => void;
  onOpenSettings: () => void;
  onOpenBookWords: () => void;
  /** Sesli okumayı başlatır/duraklatır. */
  onToggleSpeech: () => void;
  /** Şu an konuşuluyor mu — düğmenin ikonu buna göre. */
  isSpeaking: boolean;
  /**
   * Seslendirme bu bölümde ve bu kullanıcı için çalışabilir mi.
   *
   * NEDEN GİZLİYOR, KİLİTLEMİYOR: basıldığında hiçbir şey yapmayan bir
   * düğme arıza gibi görünür, kilit ikonlu bir düğme ise okuma ekranına
   * premium promosyonu sokar (Ürün İlkesi #1). İkisi de istenmiyor —
   * düğme sadece yok.
   */
  canPlaySpeech: boolean;
  /** "Dinle" ile gelindi, ses hazırlanıyor — düğme yerine göstergeç. */
  isPreparingSpeech: boolean;
  /** Bugün kalan AI cümle çevirisi hakkı -- `null` iken (henüz
   * yüklenmedi/hata) rozet hiç gösterilmiyor, "0" ile karıştırılmasın. */
  aiQuotaRemaining: number | null;
  /** Reader'ı kapatıp geri döner. */
  onClose: () => void;
}

/**
 * FAZ 6 (2026-09-14, referans uygulama eşleştirmesi): üst çubuk baştan
 * yazıldı. Eskiden geri oku + ortalanmış bölüm başlığı + 2 ikondu (sesli
 * okuma, "Aa" ayarlar). Referansta başlık YOK -- yalnızca 6 eşit aralıklı
 * ikon: içerikler (bölüm listesi), ayarlar, kitap (kitap detayına git),
 * kulaklık (sesli okuma), mavi "kalan çeviri hakkı" rozeti, kapat (X).
 *
 * Başlığın kaldırılması bilinçli bir kayıp DEĞİL -- kullanıcı bölüm adını
 * artık "İçerikler" sheet'inde (mevcut bölüm vurgulanmış olarak) görüyor;
 * referans da bunu aynı şekilde çözüyor.
 */
export function ReaderHeader({
  onOpenChapterList,
  onOpenSettings,
  onOpenBookWords,
  onToggleSpeech,
  isSpeaking,
  canPlaySpeech,
  isPreparingSpeech,
  aiQuotaRemaining,
  onClose,
}: ReaderHeaderProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: readerColors.background },
      ]}
    >
      <View style={styles.row}>
        {/*
          FAZ 7 DÜZELTMESİ (2026-09-14): ikonlar `space-between` ile TÜM
          genişliğe yayılıyordu -- referansta ilk 4 ikon (içerikler, ayarlar,
          kitap, kulaklık) sıkı bir küme, yalnızca kota rozeti + kapat sağa
          yaslı. İki grup + aradaki esnek boşluk bunu üretiyor.
        */}
        <View style={styles.leftGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reader.header.chapterList")}
            onPress={onOpenChapterList}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="list-outline" size={22} color={readerColors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reader.header.settings")}
            onPress={onOpenSettings}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={readerColors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reader.header.bookWords")}
            onPress={onOpenBookWords}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="book-outline" size={22} color={readerColors.text} />
          </Pressable>

          {/*
            Sesli okuma düğmesi. Okuma yüzeyinin bir KONTROLÜ — ürün ilkesi #1
            reader içinde promosyonu yasaklıyor, okuma araçlarını değil.
          */}
          {canPlaySpeech ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSpeaking }}
              accessibilityLabel={t(
                isSpeaking ? "reader.header.pauseSpeech" : "reader.header.playSpeech",
              )}
              onPress={onToggleSpeech}
              style={styles.iconButton}
              hitSlop={8}
            >
              {isPreparingSpeech ? (
                <ActivityIndicator size="small" color={readerColors.text} />
              ) : (
                <Ionicons
                  name={isSpeaking ? "pause" : "headset-outline"}
                  size={22}
                  color={readerColors.text}
                />
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={styles.rightGroup}>
          {aiQuotaRemaining !== null ? (
            <View
              style={[styles.quotaBadge, { backgroundColor: collectionColors.audiobooks }]}
              accessibilityRole="text"
              accessibilityLabel={t("reader.header.quotaRemaining", { count: aiQuotaRemaining })}
            >
              <Text style={[monoType.badge, styles.quotaText, { color: onLevelAccent }]}>
                {aiQuotaRemaining}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            style={[
              styles.iconButton,
              styles.closeButton,
              { backgroundColor: readerColors.highlight },
            ]}
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={readerColors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    borderRadius: radius.full,
  },
  quotaBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxs,
  },
  quotaText: {
    fontWeight: "700",
  },
});
