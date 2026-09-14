import { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { LANGUAGES } from "@/lib/languages";

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

  const options = useMemo(
    () => LANGUAGES.filter((language) => language.code !== excludeCode),
    [excludeCode],
  );

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
              badge={<Text style={type.display}>{language.flag}</Text>}
              badgeColor="transparent"
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
