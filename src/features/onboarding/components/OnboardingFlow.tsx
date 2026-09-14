import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";

import i18n from "@/i18n";
import { LANGUAGES } from "@/lib/languages";
import { trackEvent } from "@/lib/analytics";

import { useSetLanguagePairMutation } from "@/features/languagePair";
import { useCompleteOnboardingMutation } from "@/features/onboarding/api/useCompleteOnboardingMutation";
import { LevelTestScreen } from "@/features/onboarding/components/LevelTestScreen";
import { OnboardingLanguageStep } from "@/features/onboarding/components/OnboardingLanguageStep";
import { OnboardingLevelStep } from "@/features/onboarding/components/OnboardingLevelStep";
import { OnboardingSplashScreen } from "@/features/onboarding/components/OnboardingSplashScreen";
import { OnboardingWelcomeScreen } from "@/features/onboarding/components/OnboardingWelcomeScreen";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";

/**
 * Onboarding akışının adım makinesi.
 *
 * SIRALAMA referans uygulamadan (Bookvo) alındı; splash, karşılama ve iki
 * dil adımı bizim eklediğimiz (referans tek dilli ve doğrudan seviye
 * sorusuyla açılıyor). Tam gerekçe ve ölçüm tablosu:
 * docs/plans/2026-09-14-onboarding-tasarim.md.
 *
 * NEDEN TEK BİR STATE MAKİNESİ, AYRI ROUTE'LAR DEĞİL: adımlar arasında
 * taşınan durum (seçilen diller, seviye) yalnızca akış bitene kadar
 * yaşıyor ve hiçbiri derin bağlantıyla açılmamalı -- yarıda kalmış bir
 * onboarding'e dışarıdan girilebilmesi anlamsız. `LevelTestScreen` de
 * aynı desende zaten bir `Phase` makinesi kullanıyor.
 */
type Step = "splash" | "welcome" | "native" | "target" | "level" | "levelTest";

/** Alt çubuktaki ilerleme -- splash ve karşılamada çubuk gösterilmiyor. */
const PROGRESS: Record<string, number> = {
  native: 1 / 3,
  target: 2 / 3,
  level: 1,
};

interface OnboardingFlowProps {
  /** Akış tamamlandığında çağrılır (profil güncellendikten sonra). */
  onDone: () => void;
}

export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const { t } = useTranslation();
  const setPair = useSetLanguagePairMutation();
  const completeOnboarding = useCompleteOnboardingMutation();

  const deviceLanguage = getLocales()[0]?.languageCode ?? "tr";
  const defaultNative = LANGUAGES.some((l) => l.code === deviceLanguage) ? deviceLanguage : "tr";

  const [step, setStep] = useState<Step>("splash");
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(defaultNative);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);

  const goTarget = useCallback(() => {
    if (!nativeLanguage) return;
    // Arayüz dili HEMEN değişiyor: sonraki adımlar kullanıcının kendi
    // dilinde açılsın diye sunucu yanıtı beklenmiyor.
    void i18n.changeLanguage(nativeLanguage);
    trackEvent("onboarding_native_selected", { language: nativeLanguage });
    setStep("target");
  }, [nativeLanguage]);

  /**
   * Hedef dil seçildiğinde dil çifti HEMEN kaydediliyor, akışın sonunda
   * değil.
   *
   * NEDEN BURADA: seviye adımından sonra iki çıkış var -- hızlı seçim ve
   * seviye TESTİ. Test kendi içinde onboarding'i tamamlıyor; çifti sona
   * bırakmış olsaydık test yolundan giden kullanıcının dil çifti HİÇ
   * yazılmaz ve boş bir kütüphaneye düşerdi.
   *
   * Kullanıcı seviye adımında vazgeçerse çift yazılmış ama onboarding
   * tamamlanmamış olur; bu zararsız -- akışa döndüğünde aynı çifti tekrar
   * seçmek ücretsiz (zaten sahip olunan çift, bkz. `set_language_pair`).
   */
  const goLevel = useCallback(() => {
    if (!nativeLanguage || !targetLanguage) return;
    trackEvent("onboarding_target_selected", { language: targetLanguage });

    setPair.mutate(
      { nativeLanguage, targetLanguage },
      {
        onSuccess: (result) => {
          if (result === "premium_required") {
            // İlk çift için sunucu bunu döndürmez; savunma amaçlı.
            Alert.alert(t("common.errorTitle"), t("languagePair.unexpectedPremiumRequired"));
            return;
          }
          setStep("level");
        },
        onError: () => Alert.alert(t("common.errorTitle"), t("languagePair.saveError")),
      },
    );
  }, [nativeLanguage, targetLanguage, setPair, t]);

  /** Son adım: seviyeyi profile yazıp onboarding'i tamamlar. */
  const finish = useCallback(
    (chosenLevel: CefrLevel) => {
      completeOnboarding.mutate(
        { targetLevel: chosenLevel, estimate: null, adjusted: false },
        {
          onSuccess: onDone,
          onError: () => Alert.alert(t("common.errorTitle"), t("onboarding.saveError")),
        },
      );
    },
    [completeOnboarding, onDone, t],
  );

  const submitting = setPair.isPending || completeOnboarding.isPending;

  if (step === "splash") {
    return <OnboardingSplashScreen onDone={() => setStep("welcome")} />;
  }

  if (step === "welcome") {
    return <OnboardingWelcomeScreen onStart={() => setStep("native")} />;
  }

  if (step === "native") {
    return (
      <OnboardingLanguageStep
        mode="native"
        progress={PROGRESS.native ?? 0}
        selected={nativeLanguage}
        excludeCode={null}
        onSelect={setNativeLanguage}
        onContinue={goTarget}
      />
    );
  }

  if (step === "target") {
    return (
      <OnboardingLanguageStep
        mode="target"
        progress={PROGRESS.target ?? 0}
        selected={targetLanguage}
        excludeCode={nativeLanguage}
        onSelect={setTargetLanguage}
        onContinue={goLevel}
      />
    );
  }

  if (step === "levelTest") {
    // Dil çifti bu noktada ZATEN kaydedildi (bkz. `goLevel`), bu yüzden
    // testin kendi tamamlama akışı yeterli.
    return <LevelTestScreen onDone={onDone} />;
  }

  return (
    <OnboardingLevelStep
      progress={PROGRESS.level ?? 1}
      selected={level}
      onSelect={setLevel}
      onContinue={() => {
        if (level) finish(level);
      }}
      onTakeTest={() => setStep("levelTest")}
      submitting={submitting}
    />
  );
}
