import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";
import * as Updates from "expo-updates";
import { I18nManager } from "react-native";

import i18n from "@/i18n";
import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button, LoadingState } from "@/components/ui";
import {
  CONTENT_TARGET_LANGUAGES,
  isRtlLanguage,
  LANGUAGES,
  type LanguageInfo,
} from "@/lib/languages";

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

  const deviceLanguageCode = getLocales()[0]?.languageCode ?? "tr";
  const defaultNative = LANGUAGES.some((l) => l.code === deviceLanguageCode)
    ? deviceLanguageCode
    : "tr";

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
    const needsRtlRestart = isRtlLanguage(nativeLanguage) !== I18nManager.isRTL;
    if (needsRtlRestart) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRtlLanguage(nativeLanguage));
    }

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
                  void Updates.reloadAsync().catch(() => {
                    // Expo Go'da / güncelleme kanalı yoksa reloadAsync
                    // atabilir -- o zaman geriye yapılabilecek tek şey
                    // akışa devam etmek, kullanıcı elle kapatıp açar.
                    onDone();
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
                <Text style={[monoType.label, { color: theme.text.secondary }]}>
                  {t("languagePair.comingSoonLabel")}
                </Text>
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
                      <Text style={[monoType.label, { color: theme.text.secondary }]}>
                        {t("languagePair.comingSoonBadge")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Pressable onPress={() => setPhase("native")} accessibilityRole="button" style={styles.back}>
        <Text style={[monoType.label, { color: theme.text.secondary }]}>{t("common.back")}</Text>
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
      <Text style={[monoType.rowText, { color: theme.text.primary }]}>{language.nativeName}</Text>
      <Text style={[monoType.label, { color: theme.text.secondary }]}>{language.nameEn}</Text>
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
