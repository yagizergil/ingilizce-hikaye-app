import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";

import { env } from "@/lib/env";
import { monoType, motion, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackError, trackEvent } from "@/lib/analytics";

interface PaywallLegalProps {
  /** Seçili planın biçimlenmiş fiyatı — "sonra ₺399,99/yıl" satırı için. */
  priceString: string | null;
  /** Seçili plandaki ücretsiz deneme süresi (gün), yoksa null. */
  trialDays: number | null;
  /** Seçili plan yıllık mı — yenileme dönemini doğru yazmak için. */
  periodLabel: string;
}

/**
 * Abonelik ekranının zorunlu yasal bloğu.
 *
 * BU BLOK İSTEĞE BAĞLI DEĞİL. App Store Review Guideline 3.1.2(a) bir
 * abonelik satın alma ekranında şunların GÖRÜNÜR olmasını şart koşuyor:
 * aboneliğin süresi, dönem başına fiyatı, otomatik yenilendiği bilgisi ve
 * Kullanım Koşulları (EULA) ile Gizlilik Politikası bağlantıları. Denetim
 * öncesinde bunların hiçbiri ekranda yoktu ve bu tek başına red sebebiydi.
 *
 * Bağlantılar `expo-web-browser` ile uygulama içi tarayıcıda açılıyor:
 * kullanıcı Safari'ye atılıp satın alma akışını kaybetmiyor.
 */
export function PaywallLegal({ priceString, trialDays, periodLabel }: PaywallLegalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const openUrl = useCallback(async (url: string, which: string) => {
    trackEvent("paywall_legal_opened", { which });
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      // Sessizce yutmuyoruz: yasal bağlantının açılmaması, gönderim
      // açısından ekranda hiç olmamasıyla aynı sonucu doğurur.
      trackError("paywall.legalLink", error, { which });
    }
  }, []);

  const renewalNote =
    trialDays != null && priceString
      ? t("paywall.legal.trialThenPrice", {
          count: trialDays,
          price: priceString,
          period: periodLabel,
        })
      : priceString
        ? t("paywall.legal.price", { price: priceString, period: periodLabel })
        : null;

  const hasPrivacyUrl = env.privacyUrl.length > 0;

  return (
    <View style={styles.wrap}>
      {renewalNote ? (
        <Text style={[monoType.footerNote, styles.center, { color: theme.text.secondary }]}>
          {renewalNote}
        </Text>
      ) : null}

      <Text style={[monoType.footerNote, styles.center, { color: theme.text.secondary }]}>
        {t("paywall.legal.autoRenew")}
      </Text>

      <View style={styles.links}>
        <LegalLink
          label={t("paywall.legal.terms")}
          onPress={() => void openUrl(env.termsUrl, "terms")}
        />
        <Text style={[monoType.footerNote, { color: theme.text.secondary }]}>·</Text>
        {hasPrivacyUrl ? (
          <LegalLink
            label={t("paywall.legal.privacy")}
            onPress={() => void openUrl(env.privacyUrl, "privacy")}
          />
        ) : (
          // Yapılandırma eksikse sessizce gizlemek yerine görünür bir
          // uyarı: bu ekran bu hâliyle App Store'a gönderilmemeli.
          <Text style={[monoType.footerNote, { color: theme.danger }]}>
            {t("paywall.legal.privacyMissing")}
          </Text>
        )}
      </View>
    </View>
  );
}

function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={spacing.xs}
      style={({ pressed }) => ({ opacity: pressed ? motion.pressed.opacity : 1 })}
    >
      <Text style={[monoType.footerNote, styles.link, { color: theme.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  center: {
    textAlign: "center",
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  link: {
    textDecorationLine: "underline",
  },
});
