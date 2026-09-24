import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";

import i18n from "@/i18n";
import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button, LanguageFlag, LoadingState } from "@/components/ui";
import { UpperText } from "@/components/ui/UpperText";
import { CONTENT_TARGET_LANGUAGES, LANGUAGES, type LanguageInfo } from "@/lib/languages";
import { applyLayoutDirection, reloadApp } from "@/lib/rtl";

import { useSetLanguagePairMutation } from "@/features/languagePair/api/useSetLanguagePairMutation";

type Phase = "native" | "target";

interface LanguagePairScreenProps {
  /** Çift başarıyla seçildiğinde çağrılır. */
  onDone: () => void;
}

/**
 * Onboarding'in İLK adımı: "hangi dili konuşuyorsun" -> "hangi dili
 * okumak istiyorsun". Seviye testinden ÖNCE gösteriliyor çünkü test
 * içeriği (İngilizce kelimeler) hedef dile bağlı.
 *
 * NEDEN TEK EKRANDA İKİ AŞAMA: LevelTestScreen'deki `Phase` state
 * makinesiyle aynı desen -- her aşama kendi geri/ileri geçişini yönetiyor,
 * ayrı bir route/navigator gerekmiyor.
 *
 * İLK ÇİFT HER ZAMAN ÜCRETSİZ (migration 033, `set_language_pair`): bu
 * ekranda hiçbir premium işareti YOK çünkü kullanıcının burada seçtiği
 * ilk çift asla premium gerektirmiyor -- fonksiyon bunu sunucuda garanti
 * ediyor. Paywall'a yönlendirme yalnızca PROFİLDEN ikinci bir çift
 * eklenmeye çalışıldığında devreye giriyor (bkz. profile ekranındaki dil
 * ayarları).
 */
export function LanguagePairScreen({ onDone }: LanguagePairScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const setPair = useSetLanguagePairMutation();

  // Cihazın dili listemizde yoksa İngilizce (bkz. src/i18n/index.ts):
  // Türkçe varsayılanı, uygulamanın tek dil çiftiyle başladığı dönemden
  // kalmıştı ve on arayüz dilinde artık yanlış.
  const deviceLanguageCode = getLocales()[0]?.languageCode ?? "en";
  const defaultNative = LANGUAGES.some((l) => l.code === deviceLanguageCode)
    ? deviceLanguageCode
    : "en";

  const [phase, setPhase] = useState<Phase>("native");
  const [nativeLanguage, setNativeLanguage] = useState<string>(defaultNative);

  const targetOptions = useMemo(
    () => CONTENT_TARGET_LANGUAGES.filter((language) => language.code !== nativeLanguage),
    [nativeLanguage],
  );
  const comingSoonOptions = useMemo(
    () =>
      LANGUAGES.filter((language) => !language.isContentTarget && language.code !== nativeLanguage),
    [nativeLanguage],
  );

  const handleConfirmNative = () => setPhase("target");

  const handleSelectTarget = (targetLanguage: string) => {
    // i18n'i HEMEN değiştiriyoruz: sonraki ekranlar (seviye testi, ana
    // sayfa) doğru arayüz dilinde açılsın diye sunucu yanıtını beklemiyor.
    // Sunucu isteği başarısız olsa bile arayüz dili değişikliği geri
    // alınmıyor -- kullanıcı zaten kendi dilini seçti, bunu geri almak
    // kafa karıştırıcı olurdu.
    void i18n.changeLanguage(nativeLanguage);

    // RTL (Arapça) DEĞİŞİKLİĞİ ANINDA UYGULANAMAZ -- bkz. src/i18n/index.ts
    // yorumu: `I18nManager.forceRTL()` yalnızca bir SONRAKİ native render
    // ağacı kurulumunda etkili oluyor. Bayrağı burada set ediyoruz (bir
    // sonraki açılış onu okuyacak) ve kullanıcıdan uygulamayı yeniden
    // başlatmasını GERÇEKTEN istiyoruz -- yarım bir RTL (bazı ekranlar
    // sağdan sola, bazıları soldan sağa) sessizce bırakmaktan çok daha
    // kötü bir deneyim olurdu.
    // Yön kuralı ve geçmişteki üç hatası: `src/lib/rtl.ts`.
    const needsRtlRestart = applyLayoutDirection(nativeLanguage);

    setPair.mutate(
      { nativeLanguage, targetLanguage },
      {
        onSuccess: (result) => {
          if (result === "premium_required") {
            // İlk çift için TEORİK OLARAK imkansız (bkz. yukarıdaki
            // yorum) ama sunucu tarafı tek doğruluk kaynağı -- savunma
            // amaçlı ele alınıyor.
            Alert.alert(t("common.errorTitle"), t("languagePair.unexpectedPremiumRequired"));
            return;
          }

          if (needsRtlRestart) {
            Alert.alert(t("languagePair.restartTitle"), t("languagePair.restartBody"), [
              {
                text: t("languagePair.restartCta"),
                onPress: () => {
                  // `reloadApp` desteklenmeyen ortamda (Expo Go, güncelleme
                  // kanalı yok) fırlatmak yerine `false` dönüyor -- o zaman
                  // geriye akışa devam etmek kalıyor, kullanıcı elle kapatıp
                  // açınca doğru yön uygulanıyor.
                  void reloadApp().then((reloaded) => {
                    if (!reloaded) onDone();
                  });
                },
              },
            ]);
            return;
          }

          onDone();
        },
        onError: () => {
          Alert.alert(t("common.errorTitle"), t("languagePair.saveError"));
        },
      },
    );
  };

  if (phase === "native") {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.copy}>
            <Text style={[type.display, { color: theme.text.primary }]}>
              {t("languagePair.nativeTitle")}
            </Text>
            <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
              {t("languagePair.nativeBody")}
            </Text>
          </View>
          <View style={styles.list}>
            {LANGUAGES.map((language) => (
              <LanguageRow
                key={language.code}
                language={language}
                selected={language.code === nativeLanguage}
                onPress={() => setNativeLanguage(language.code)}
              />
            ))}
          </View>
        </ScrollView>
        <View style={styles.actions}>
          <Button label={t("common.continue")} onPress={handleConfirmNative} fullWidth />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.copy}>
          <Text style={[type.display, { color: theme.text.primary }]}>
            {t("languagePair.targetTitle")}
          </Text>
          <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
            {t("languagePair.targetBody")}
          </Text>
        </View>

        {setPair.isPending ? (
          <LoadingState />
        ) : (
          <>
            <View style={styles.list}>
              {targetOptions.map((language) => (
                <LanguageRow
                  key={language.code}
                  language={language}
                  selected={false}
                  onPress={() => handleSelectTarget(language.code)}
                />
              ))}
            </View>

            {comingSoonOptions.length > 0 ? (
              <View style={styles.comingSoonBlock}>
                <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
                  {t("languagePair.comingSoonLabel")}
                </UpperText>
                <View style={styles.list}>
                  {comingSoonOptions.map((language) => (
                    <View
                      key={language.code}
                      style={[
                        styles.row,
                        styles.rowDisabled,
                        { borderColor: theme.border.hairline },
                      ]}
                    >
                      <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
                        {language.nativeName}
                      </Text>
                      <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
                        {t("languagePair.comingSoonBadge")}
                      </UpperText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Pressable onPress={() => setPhase("native")} accessibilityRole="button" style={styles.back}>
        <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
          {t("common.back")}
        </UpperText>
      </Pressable>
    </View>
  );
}

function LanguageRow({
  language,
  selected,
  onPress,
}: {
  language: LanguageInfo;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? theme.bg.surface : "transparent",
          borderColor: selected ? theme.text.primary : theme.border.hairline,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={language.nativeName}
    >
      <View style={styles.rowLabel}>
        <LanguageFlag code={language.code} size={32} />
        <View>
          <Text style={[monoType.rowText, { color: theme.text.primary }]}>
            {language.nativeName}
          </Text>
          <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
            {language.nameEn}
          </UpperText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  copy: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flag: {
    fontSize: type.wordmark.fontSize,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  comingSoonBlock: {
    gap: spacing.xs,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  back: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
  },
});
