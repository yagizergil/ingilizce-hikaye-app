import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Premium'un ne KATTIĞI — neyi kilitlediği değil.
 *
 * Ücretsiz katmanda okuma, tüm kitaplar, kelimeye dokunup Türkçe karşılığı
 * görme ve offline önbellek sınırsız. Bu liste bilerek yalnızca eklenen
 * değeri anlatıyor (ürün ilkesi #2).
 *
 * HER MADDE BUGÜN ÜRÜNDE VAR OLMAK ZORUNDA (denetim bulgusu, 2026-09-07):
 * liste eskiden "AI destekli açıklamalar" ve "sesli okuma" vaat ediyordu.
 * O tarihte sesli okuma diye bir özellik YOKTU — `expo-speech` yalnızca tek
 * kelime telaffuzu için kullanılıyordu. AI çevirisi ise vardı ama kotası
 * herkes için aynıydı, yani premium faydası değildi. İkisi de listeden
 * çıkarıldı; AI maddesi kotanın katmana bağlanmasıyla (migration 029)
 * dürüst hâle gelip geri döndü.
 *
 * `studioAudio` 2026-09-08'de eklendi ve aynı kuraldan geçti: 63 hikâyenin
 * 207 bölümü gerçekten seslendirildi, erişim sunucuda kısıtlanıyor
 * (migration 032 + `chapter-audio`) ve ücretsiz katmanda karşılığı yok.
 * Yani bu sefer madde, çalışan bir özelliği anlatıyor.
 *
 * BURAYA BİR MADDE EKLEMEDEN ÖNCE: o özellik üründe çalışıyor mu ve
 * ücretsiz katmandan gerçekten farklı mı? İkisi de evet değilse madde
 * yanıltıcı metadatadır (Guideline 2.3.1).
 */
const BENEFITS: { icon: IoniconName; key: string }[] = [
  { icon: "headset-outline", key: "studioAudio" },
  { icon: "bookmarks-outline", key: "unlimitedWords" },
  { icon: "repeat-outline", key: "spacedRepetition" },
  { icon: "sparkles-outline", key: "aiSentences" },
  { icon: "stats-chart-outline", key: "stats" },
];

interface PaywallBenefitsProps {
  /**
   * AI kotaları sunucudan gelir (migration 029). Sayılar okunamadıysa
   * madde rakamsız, genel hâliyle gösterilir — yanlış bir sayı göstermek
   * yerine hiç göstermemek.
   */
  aiFreeLimit: number;
  aiPremiumLimit: number;
}

export function PaywallBenefits({ aiFreeLimit, aiPremiumLimit }: PaywallBenefitsProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const hasAiNumbers = aiFreeLimit > 0 && aiPremiumLimit > aiFreeLimit;

  return (
    <View style={styles.list}>
      {BENEFITS.map((benefit) => (
        <View key={benefit.key} style={styles.row}>
          <Ionicons name={benefit.icon} size={20} color={theme.accent} />
          <Text style={[monoType.rowText, styles.label, { color: theme.text.primary }]}>
            {benefit.key === "aiSentences"
              ? hasAiNumbers
                ? t("paywall.benefits.aiSentences", {
                    premium: aiPremiumLimit,
                    free: aiFreeLimit,
                  })
                : t("paywall.benefits.aiSentencesGeneric")
              : t(`paywall.benefits.${benefit.key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
});
