import { StyleSheet, Text, View } from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { SvgXml } from "react-native-svg";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { welcomeIconXml } from "@/features/onboarding/welcomeIconXml";
import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";


/**
 * "Başla" ekranı: uygulamayı üç maddede anlatır.
 *
 * REFERANSTA YOK -- Bookvo doğrudan seviye sorusuyla açılıyor. Ürün
 * sahibinin isteğiyle eklendi ("ilk kullanıcı için Başla butonunun olduğu
 * ve uygulamayı kısa ve öz bir şekilde tanıtan sayfa"). Bu yüzden düzeni
 * referansın DİĞER ekranlarından türetildi: aynı kenar boşluğu (16 pt),
 * aynı kart yarıçapı (12 pt), aynı alt pill düğme (48 pt).
 *
 * ÜÇ MADDE DE BUGÜN ÜRÜNDE ÇALIŞAN ŞEYLER: kelimeye dokunup karşılık
 * görmek, seviyeye göre kitaplar, kelime defteri + aralıklı tekrar.
 * Paywall kuralının (CLAUDE.md: bir fayda önce üründe çalışır, sonra
 * yazılır) buraya da uygulanması gerekiyor -- burası da bir vaat ekranı.
 */
/**
 * İllüstrasyonlar `assets/*.svg` (bkz. `welcomeIconXml`): dokunma,
 * yükselen basamaklar, döngü -- sırasıyla kelimeye dokunma, seviyeye göre
 * hikâye ve aralıklı tekrar. Rozet zemini nötr: görseller kendi
 * renklerini taşıyor, renkli zemin ikisini de bulanıklaştırırdı
 * (onboarding'in diğer satırlarındaki kararın aynısı).
 */
const HIGHLIGHTS = ["tapWord", "leveled", "remember"] as const;

/** Ölçüm: rozet 44 pt; görsel onun içinde nefes alacak kadar küçük. */
const ICON_SIZE = 28;

interface OnboardingWelcomeScreenProps {
  onStart: () => void;
}

export function OnboardingWelcomeScreen({ onStart }: OnboardingWelcomeScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={[type.display, styles.title, { color: theme.text.primary }]}>
            {t("onboarding.welcome.title")}
          </Text>
          <Text style={[type.chapterRowTitle, styles.body, { color: theme.text.secondary }]}>
            {t("onboarding.welcome.body")}
          </Text>
        </View>

        <View style={styles.list}>
          {HIGHLIGHTS.map((item) => (
            <View
              key={item}
              style={[
                styles.row,
                { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
              ]}
            >
              <View style={[styles.iconBadge, { backgroundColor: theme.bg.primary }]}>
                <SvgXml xml={welcomeIconXml[item] as string} width={ICON_SIZE} height={ICON_SIZE} />
              </View>
              <View style={styles.rowText}>
                <Text style={[type.chapterRowTitle, { color: theme.text.primary }]}>
                  {t(`onboarding.welcome.highlights.${item}.title`)}
                </Text>
                <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
                  {t(`onboarding.welcome.highlights.${item}.body`)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <OnboardingFooterButton label={t("onboarding.welcome.cta")} onPress={onStart} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.section,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    textAlign: "center",
  },
  body: {
    textAlign: "center",
  },
  list: {
    // Ölçüm: referansta kartlar arası 12 pt.
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Ölçüm: rozet 44x44 pt, yarıçap 12 pt.
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
