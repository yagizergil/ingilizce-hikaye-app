import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { getLocales } from "expo-localization";
import { useTranslation } from "react-i18next";

import { spacing } from "@/theme";
import { LANGUAGES } from "@/lib/languages";
import { LanguageFlag } from "@/components/ui";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingOptionCard } from "@/features/onboarding/components/OnboardingOptionCard";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

/**
 * Dil seçimi adımı -- hem "ana dilin" hem "okumak istediğin dil" için.
 *
 * NEDEN TEK BİLEŞEN: iki adım da aynı listeyi, aynı kart ölçülerini ve
 * aynı alt düğmeyi kullanıyor; tek fark başlık, hangi dillerin seçilebilir
 * olduğu ve seçilemez olanın nasıl işaretlendiği. İki ayrı dosya tutmak bu
 * ölçülerin zamanla ayrışmasına davetiye olurdu.
 *
 * ÖLÇÜLER: `OnboardingOptionCard` ve `OnboardingScaffold` içinde, hepsi
 * referanstan piksel olarak çıkarıldı (bkz.
 * docs/plans/2026-09-14-onboarding-tasarim.md).
 */
interface OnboardingLanguageStepProps {
  mode: "native" | "target";
  progress: number;
  selected: string | null;
  /**
   * Diğer adımda seçilen dil -- burada listelenmez. Ana dil ile hedef dil
   * aynı olamaz (`set_language_pair` bunu sunucuda da reddediyor).
   */
  excludeCode?: string | null;
  onSelect: (code: string) => void;
  onContinue: () => void;
  submitting?: boolean;
}

export function OnboardingLanguageStep({
  mode,
  progress,
  selected,
  excludeCode,
  onSelect,
  onContinue,
  submitting = false,
}: OnboardingLanguageStepProps) {
  const { t } = useTranslation();

  /**
   * Sıralama: (1) ana dil adımında CİHAZIN dili en üstte, (2) sonra
   * popülerlik.
   *
   * NEDEN: liste on satır ve alfabetik/dosya sırası kullanıcının aradığı
   * dili rastgele bir yere koyuyordu. Cihazın dili ana dil sorusunun çoğu
   * kullanıcı için zaten doğru cevabı; onu ilk satıra almak bu adımı tek
   * dokunuşa indiriyor. Hedef dil adımında böyle bir tahmin YOK -- orada
   * cihazın dili büyük ihtimalle kullanıcının ana dili, yani okumak
   * istediği dil değil; o yüzden yalnızca popülerlik sırası uygulanıyor.
   */
  const deviceLanguage = getLocales()[0]?.languageCode ?? null;

  const options = useMemo(() => {
    const visible = LANGUAGES.filter((language) => language.code !== excludeCode);
    const preferred = mode === "native" ? deviceLanguage : null;

    return [...visible].sort((a, b) => {
      if (a.code === preferred) return -1;
      if (b.code === preferred) return 1;
      return a.popularity - b.popularity;
    });
  }, [excludeCode, mode, deviceLanguage]);

  return (
    <OnboardingScaffold
      progress={progress}
      title={t(`onboarding.${mode}.title`)}
      subtitle={t(`onboarding.${mode}.subtitle`)}
      footer={
        <OnboardingFooterButton
          label={t("common.continue")}
          onPress={onContinue}
          disabled={selected === null}
          loading={submitting}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {options.map((language) => {
          // Hedef dil adımında yalnızca İÇERİĞİ OLAN diller seçilebilir.
          // Kullanıcının kitabı olmayan bir dili seçip boş bir kütüphaneye
          // düşmesi, "yakında" demekten çok daha kötü bir ilk deneyim.
          const unavailable = mode === "target" && !language.isContentTarget;

          return (
            <OnboardingOptionCard
              key={language.code}
              badge={<LanguageFlag code={language.code} size={36} />}
              title={language.nativeName}
              subtitle={language.nameEn}
              selected={selected === language.code}
              disabled={unavailable}
              trailingLabel={unavailable ? t("languagePair.comingSoonBadge") : undefined}
              onPress={() => onSelect(language.code)}
            />
          );
        })}
      </ScrollView>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    // Ölçüm: kartlar arası 25-28 px -> 12 pt.
    gap: spacing.sm,
  },
});
