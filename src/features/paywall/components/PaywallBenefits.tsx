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
 * Sesli okuma diye bir özellik yoktu — `expo-speech` yalnızca tek kelime
 * telaffuzu için kullanılıyor ve o ücretsiz. AI çevirisi ise vardı ama
 * kotası herkes için aynıydı, yani premium faydası değildi. Liste şimdi
 * gerçekten farklılaşan üç şeye dayanıyor; AI maddesi de kotanın katmana
 * bağlanmasıyla (migration 029) dürüst hâle geldi.
 *
 * BURAYA BİR MADDE EKLEMEDEN ÖNCE: o özellik üründe çalışıyor mu ve
 * ücretsiz katmandan gerçekten farklı mı? İkisi de evet değilse madde
 * yanıltıcı metadatadır (Guideline 2.3.1).
 */
const BENEFITS: { icon: IoniconName; key: string }[] = [
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
