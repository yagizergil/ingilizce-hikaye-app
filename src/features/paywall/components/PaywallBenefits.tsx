import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { paywallMetrics, paywallType, radius, spacing } from "@/theme";
import { levelAccent, onLevelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Premium'un ne KATTIĞI — neyi kilitlediği değil.
 *
 * Ücretsiz katmanda okuma, tüm kitaplar, kelimeye dokunup karşılığı görme
 * ve offline önbellek sınırsız. Bu liste bilerek yalnızca eklenen değeri
 * anlatıyor (ürün ilkesi #2).
 *
 * HER MADDE BUGÜN ÜRÜNDE VAR OLMAK ZORUNDA (denetim bulgusu, 2026-09-07):
 * liste eskiden "AI destekli açıklamalar" ve "sesli okuma" vaat ediyordu;
 * o tarihte ikisi de yoktu. Referans paywall'da bizde OLMAYAN maddeler var
 * ("kendi EPUB'ını yükle", "her hafta yeni kitaplar", "internetsiz
 * öğrenme" premium olarak) -- düzen kopyalandı, o maddeler KOPYALANMADI.
 * Buraya bir madde eklemeden önce: o özellik üründe çalışıyor mu ve
 * ücretsiz katmandan gerçekten farklı mı? İkisi de evet değilse madde
 * yanıltıcı metadatadır (Guideline 2.3.1).
 *
 * ÇIKARILAN İKİ MADDE (denetim bulgusu, 2026-09-14): "aralıklı tekrar" ve
 * "istatistikler" listede duruyordu ama İKİSİ DE ÜCRETSİZ. `useDueCardsQuery`
 * kendi yorumunda "sınır ücretsiz/premium ayrımı DEĞİL" diyor ve SRS'te
 * hiçbir yetki kontrolü yok; `StatisticsScreen` de kontrolsüz açılıyor.
 * Yani paywall, ücretsiz iki özelliği premium diye satıyordu -- yukarıdaki
 * kuralın ("bir fayda önce üründe çalışır, sonra paywall'a yazılır")
 * tam ihlali ve Guideline 2.3.1 kapsamında yanıltıcı metadata.
 * İkisi de listeden ÇIKARILDI. Gerçekten premium yapılmaları ayrı bir ürün
 * kararı (ücretsiz katmandan değer almak demek); o karar verilene kadar
 * paywall bunları vaat etmiyor.
 *
 * BAŞLIK + AÇIKLAMA (referans düzeni): tek satırlık maddeler yerine her
 * fayda bir başlık ve onu açan bir cümle taşıyor. Renkli ikon kareleri de
 * referanstan; burada renk bir SINIFLAMA değil, satırları birbirinden
 * ayıran bir işaret -- o yüzden altı madde altı farklı renk.
 */
const BENEFITS: { icon: IoniconName; key: string; tint: string }[] = [
  { icon: "headset", key: "studioAudio", tint: levelAccent.C1 },
  // Ücretsiz katmanda günlük kelime çevirisi sınırı var (migration 038);
  // bu madde o sınırın kalkmasını anlatıyor ve paywall'ın en sık
  // tetiklendiği yer de orası.
  { icon: "flash", key: "unlimitedLookups", tint: levelAccent.B2 },
  { icon: "sparkles", key: "aiSentences", tint: levelAccent.B1 },
  { icon: "bookmarks", key: "unlimitedWords", tint: levelAccent.A1 },
  // 1.0.6: kapısı consume_smart_practice() (migration 049).
  { icon: "school", key: "smartPractice", tint: levelAccent.A2 },
  // 1.0.6: kapısı level_word_pack() (migration 050) -- ücretsizde 5 kelime.
  { icon: "albums", key: "wordPacks", tint: levelAccent.B1 },
  { icon: "language", key: "secondLanguagePair", tint: levelAccent.C2 },
];

interface PaywallBenefitsProps {
  /**
   * AI kotaları sunucudan gelir (migration 029). Sayılar okunamadıysa
   * madde rakamsız, genel hâliyle gösterilir — yanlış bir sayı göstermek
   * yerine hiç göstermemek.
   */
  aiFreeLimit: number;
  aiPremiumLimit: number;
  /** Ücretsiz katmanın günlük kelime çevirisi sınırı (migration 038). */
  freeWordLookups: number;
}

export function PaywallBenefits({
  aiFreeLimit,
  aiPremiumLimit,
  freeWordLookups,
}: PaywallBenefitsProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const hasQuotas = aiFreeLimit > 0 && aiPremiumLimit > 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.bg.surface }]}>
      {BENEFITS.map((benefit, index) => (
        <Fragment key={benefit.key}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: theme.border.hairline }]} />
          ) : null}

          <View style={styles.row}>
            <View style={[styles.iconTile, { backgroundColor: benefit.tint }]}>
              <Ionicons name={benefit.icon} size={17} color={onLevelAccent} />
            </View>

            <View style={styles.text}>
              <Text style={[paywallType.benefitTitle, { color: theme.text.primary }]}>
                {t(`paywall.benefits.${benefit.key}.title`)}
              </Text>
              <Text style={[paywallType.benefitBody, { color: theme.text.secondary }]}>
                {benefit.key === "unlimitedLookups"
                  ? t("paywall.benefits.unlimitedLookups.body", { count: freeWordLookups })
                  : benefit.key === "aiSentences"
                    ? hasQuotas
                      ? t("paywall.benefits.aiSentences.body", {
                          premium: aiPremiumLimit,
                          free: aiFreeLimit,
                        })
                      : /* Kotalar okunamadıysa rakamsız hâli -- yanlış bir
                         sayı göstermektense hiç göstermemek. */
                        t("paywall.benefits.aiSentences.bodyGeneric")
                    : t(`paywall.benefits.${benefit.key}.body`)}
              </Text>
            </View>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    // İkon başlığın ilk satırıyla hizalı; açıklama iki satıra taşarsa ikon
    // ortaya kaymıyor (referanstaki hizalama).
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconTile: {
    width: paywallMetrics.benefitIcon,
    height: paywallMetrics.benefitIcon,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
