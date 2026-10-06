import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { paywallMetrics, paywallType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UiIcon } from "@/components/ui";

import type { UiIconName } from "@/components/ui";

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
const BENEFITS: { icon: UiIconName; key: string }[] = [
  { icon: "headphones", key: "studioAudio" },
  // Ücretsiz katmanda günlük kelime çevirisi sınırı var (migration 038);
  // bu madde o sınırın kalkmasını anlatıyor ve paywall'ın en sık
  // tetiklendiği yer de orası.
  { icon: "bolt", key: "unlimitedLookups" },
  { icon: "sparkle", key: "aiSentences" },
  { icon: "bookmark", key: "unlimitedWords" },
  // 1.0.6: kapısı consume_smart_practice() (migration 049).
  { icon: "bulb", key: "smartPractice" },
  // 2026-10-05: kitap quizlerinin 2. ve 3. basamağı; kapısı RLS
  // (migration 052, has_active_premium). 1. basamak ücretsiz.
  { icon: "trophy", key: "bookQuizzes" },
  // 1.0.6: kapısı level_word_pack() (migration 050) -- ücretsizde 5 kelime.
  { icon: "cards", key: "wordPacks" },
  { icon: "globe", key: "secondLanguagePair" },
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
            <UiIcon name={benefit.icon} size={paywallMetrics.benefitIcon} />

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
    borderRadius: paywallMetrics.cardRadius,
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
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
