import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, paywallType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UpperText } from "@/components/ui/UpperText";

import type { PaywallActivityFacts } from "@/features/paywall/api/usePaywallFactsQuery";

interface PaywallActivityProps {
  activity: PaywallActivityFacts;
  /** Kota bittiği için gelindiyse kullanıcının takıldığı kelime. */
  blockedWord?: string | null;
}

/**
 * Paywall'ın en üstü: kullanıcının KENDİ son yedi günü.
 *
 * NEDEN ÖZELLİK LİSTESİNDEN ÖNCE: özellik listesi, ürünü zaten kullanan
 * birine "ne kaybettiğini" değil "neyin satıldığını" anlatıyor. Buradaki
 * üç sayı kullanıcının kendi davranışı -- itiraz edilemez, ve "ben okuyan
 * biriyim" kimliğini teklifin önüne koyuyor. Özellik listesi kaldırılmadı,
 * aşağıda duruyor.
 *
 * SIFIR GÖSTERİLMİYOR: geçmişi olmayan kullanıcıda (ilk oturum, onboarding
 * paywall'ı) bu bileşen HİÇ render edilmiyor -- karar `usePaywallFactsQuery`
 * içinde veriliyor (`activity: null`). Sıfır yazan bir "başarı" bloğu,
 * satmak istediğin şeyin değersiz olduğunu söylemek olurdu.
 *
 * KELİME SATIRI: kullanıcı günlük çeviri hakkı bittiği için geldiyse
 * takıldığı kelime adıyla görünüyor. Üründeki en yüksek niyetli an bu --
 * kullanıcı tam o saniyede belirli bir kelimeyi anlamak istiyor ve
 * anlayamıyor; soyut bir "sınırsız çeviri" vaadini onun gerçekten istediği
 * tek somut şeye bağlıyor.
 */
export function PaywallActivity({ activity, blockedWord }: PaywallActivityProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const stats: { key: string; value: number; label: string }[] = [];
  if (activity.daysRead > 0) {
    stats.push({
      key: "days",
      value: activity.daysRead,
      label: t("paywall.activity.daysRead", { count: activity.daysRead }),
    });
  }
  if (activity.wordsLookedUp > 0) {
    stats.push({
      key: "lookups",
      value: activity.wordsLookedUp,
      label: t("paywall.activity.wordsLookedUp", { count: activity.wordsLookedUp }),
    });
  }
  if (activity.wordsSaved > 0) {
    stats.push({
      key: "saved",
      value: activity.wordsSaved,
      label: t("paywall.activity.wordsSaved", { count: activity.wordsSaved }),
    });
  }

  if (stats.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.surface }]}>
      {blockedWord ? (
        <Text style={[paywallType.subtitle, styles.blocked, { color: theme.text.primary }]}>
          {t("paywall.activity.blockedWord", { word: blockedWord })}
        </Text>
      ) : null}

      <UpperText style={[monoType.eyebrow, { color: theme.text.secondary }]}>
        {t("paywall.activity.heading")}
      </UpperText>

      <View style={styles.row}>
        {stats.map((stat) => (
          <View key={stat.key} style={styles.stat}>
            <Text style={[paywallType.planTitle, { color: theme.accent }]}>{stat.value}</Text>
            <Text style={[monoType.metaTight, styles.statLabel, { color: theme.text.secondary }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  blocked: {
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xxs,
  },
  statLabel: {
    textAlign: "center",
  },
});
