import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";

import i18n from "@/i18n";
import { LANGUAGES } from "@/lib/languages";
import { trackEvent } from "@/lib/analytics";

import { useSetLanguagePairMutation } from "@/features/languagePair";
import { PaywallScreen, useSubscriptionQuery, useTrialDays } from "@/features/paywall";
import { useCompleteOnboardingMutation } from "@/features/onboarding/api/useCompleteOnboardingMutation";
import { useOnboardingContentQuery } from "@/features/onboarding/api/useOnboardingContentQuery";
import { useOnboardingGlossesQuery } from "@/features/onboarding/api/useOnboardingGlossesQuery";
import { useSaveOnboardingFavoritesMutation } from "@/features/onboarding/api/useSaveOnboardingFavoritesMutation";
import { LevelTestScreen } from "@/features/onboarding/components/LevelTestScreen";
import { OnboardingBookTasteStep } from "@/features/onboarding/components/OnboardingBookTasteStep";
import { OnboardingDailyGoalStep } from "@/features/onboarding/components/OnboardingDailyGoalStep";
import { OnboardingFirstReadStep } from "@/features/onboarding/components/OnboardingFirstReadStep";
import { OnboardingLanguageStep } from "@/features/onboarding/components/OnboardingLanguageStep";
import { OnboardingLevelStep } from "@/features/onboarding/components/OnboardingLevelStep";
import { OnboardingPlanStep } from "@/features/onboarding/components/OnboardingPlanStep";
import { OnboardingProjectionStep } from "@/features/onboarding/components/OnboardingProjectionStep";
import { OnboardingQuizStep } from "@/features/onboarding/components/OnboardingQuizStep";
import { OnboardingSplashScreen } from "@/features/onboarding/components/OnboardingSplashScreen";
import { OnboardingSuccessStep } from "@/features/onboarding/components/OnboardingSuccessStep";
import { OnboardingTrialTimeline } from "@/features/onboarding/components/OnboardingTrialTimeline";
import { OnboardingWelcomeScreen } from "@/features/onboarding/components/OnboardingWelcomeScreen";
import { OnboardingWordsCelebrationStep } from "@/features/onboarding/components/OnboardingWordsCelebrationStep";

import type { OnboardingWord } from "@/features/onboarding/components/OnboardingFirstReadStep";
import type { CefrLevel } from "@/features/onboarding/levelEstimate";

/**
 * Onboarding akışının adım makinesi.
 *
 * SIRALAMA referans uygulamadan (Bookvo) alındı; splash, karşılama ve iki
 * dil adımı bizim eklediğimiz (referans tek dilli ve doğrudan seviye
 * sorusuyla açılıyor). Ölçüm tablosu ve ekran ekran gerekçeler:
 * docs/plans/2026-09-14-onboarding-tasarim.md.
 *
 * NEDEN TEK BİR STATE MAKİNESİ, AYRI ROUTE'LAR DEĞİL: adımlar arasında
 * taşınan durum (diller, seviye, seçilen kelimeler, beğenilen kitaplar)
 * yalnızca akış bitene kadar yaşıyor ve hiçbiri derin bağlantıyla
 * açılmamalı -- yarıda kalmış bir onboarding'e dışarıdan girilebilmesi
 * anlamsız.
 */
type Step =
  | "splash"
  | "welcome"
  | "native"
  | "target"
  | "level"
  | "levelTest"
  | "taste"
  | "firstRead"
  | "quiz"
  | "celebrate"
  | "goal"
  | "path"
  | "plan"
  | "paywall"
  | "success";

/** İlerleme çubuğu gösteren adımlar, sırayla. */
const PROGRESS_STEPS: Step[] = [
  "native",
  "target",
  "level",
  "taste",
  "firstRead",
  "quiz",
  "celebrate",
  "goal",
  "path",
  "plan",
];

function progressOf(step: Step): number {
  const index = PROGRESS_STEPS.indexOf(step);
  return index < 0 ? 0 : (index + 1) / PROGRESS_STEPS.length;
}

interface OnboardingFlowProps {
  /** Akış tamamlandığında çağrılır (profil güncellendikten sonra). */
  onDone: () => void;
}

export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const { t } = useTranslation();
  const setPair = useSetLanguagePairMutation();
  const trialDays = useTrialDays();
  const subscription = useSubscriptionQuery();
  const completeOnboarding = useCompleteOnboardingMutation();
  const saveFavorites = useSaveOnboardingFavoritesMutation();

  const deviceLanguage = getLocales()[0]?.languageCode ?? "tr";
  const defaultNative = LANGUAGES.some((l) => l.code === deviceLanguage) ? deviceLanguage : "tr";

  const [step, setStep] = useState<Step>("splash");
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(defaultNative);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [likedBookIds, setLikedBookIds] = useState<string[]>([]);
  const [pickedWords, setPickedWords] = useState<OnboardingWord[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);

  // İçerik, hedef dil ve seviye belli olur olmaz çekiliyor; kitap zevki
  // adımına gelindiğinde çoktan hazır oluyor.
  const contentQuery = useOnboardingContentQuery(targetLanguage, level);

  const pickedLemmas = useMemo(() => pickedWords.map((word) => word.lemma), [pickedWords]);
  const glossesQuery = useOnboardingGlossesQuery(pickedLemmas, targetLanguage, nativeLanguage);

  /** Karşılıkları gelen kelimeler -- alıştırma ve kutlama bunları kullanıyor. */
  const wordsWithGloss = useMemo(
    () =>
      pickedWords.map((word) => ({
        ...word,
        gloss: word.gloss ?? glossesQuery.data?.get(word.lemma) ?? null,
      })),
    [pickedWords, glossesQuery.data],
  );

  const goTarget = useCallback(() => {
    if (!nativeLanguage) return;
    // Arayüz dili HEMEN değişiyor: sonraki adımlar kullanıcının kendi
    // dilinde açılsın diye sunucu yanıtı beklenmiyor.
    void i18n.changeLanguage(nativeLanguage);
    trackEvent("onboarding_native_selected", { language: nativeLanguage });
    setStep("target");
  }, [nativeLanguage]);

  /**
   * Dil çifti HEDEF DİL ADIMINDA kaydediliyor, akışın sonunda değil.
   *
   * NEDEN BURADA: seviye adımından sonra iki çıkış var -- hızlı seçim ve
   * seviye TESTİ. Test kendi içinde onboarding'i tamamlıyor; çifti sona
   * bırakmış olsaydık test yolundan giden kullanıcının dil çifti HİÇ
   * yazılmaz ve boş bir kütüphaneye düşerdi.
   */
  const goLevel = useCallback(() => {
    if (!nativeLanguage || !targetLanguage) return;
    trackEvent("onboarding_target_selected", { language: targetLanguage });

    setPair.mutate(
      { nativeLanguage, targetLanguage },
      {
        onSuccess: (result) => {
          if (result === "premium_required") {
            Alert.alert(t("common.errorTitle"), t("languagePair.unexpectedPremiumRequired"));
            return;
          }
          setStep("level");
        },
        onError: () => Alert.alert(t("common.errorTitle"), t("languagePair.saveError")),
      },
    );
  }, [nativeLanguage, targetLanguage, setPair, t]);

  /**
   * "Planın hazırlanıyor" ekranının maddeleri GERÇEK işlere bağlı --
   * referanstaki gibi sahte bir bekleme değil. Bkz. `OnboardingPlanStep`.
   */
  const planTasks = useMemo(
    () => [
      { key: "library", done: !contentQuery.isLoading },
      { key: "words", done: !glossesQuery.isLoading },
      { key: "favorites", done: !saveFavorites.isPending },
      { key: "profile", done: !completeOnboarding.isPending && completeOnboarding.isSuccess },
    ],
    [
      contentQuery.isLoading,
      glossesQuery.isLoading,
      saveFavorites.isPending,
      completeOnboarding.isPending,
      completeOnboarding.isSuccess,
    ],
  );

  /** Son adım: hedef, seviye ve beğeniler kaydedilir. */
  const startFinishing = useCallback(() => {
    if (!level) return;
    setStep("plan");

    if (likedBookIds.length > 0) saveFavorites.mutate(likedBookIds);

    completeOnboarding.mutate(
      {
        targetLevel: level,
        estimate: null,
        adjusted: false,
        dailyGoalMinutes: dailyGoal ?? undefined,
      },
      {
        onError: () => {
          // Plan ekranı "profil kaydedildi" maddesini bekliyor; kayıt
          // başarısız olursa o madde asla işaretlenmez ve ekran sonsuza
          // kadar dönerdi. Kullanıcıyı bir önceki adıma geri alıp tekrar
          // denemesine izin veriyoruz.
          setStep("path");
          Alert.alert(t("common.errorTitle"), t("onboarding.saveError"));
        },
      },
    );
  }, [level, likedBookIds, dailyGoal, saveFavorites, completeOnboarding, t]);

  /**
   * Plan ekranı bitince paywall AKIŞIN İÇİNDE açılıyor (referansın son iki
   * ekranı: teklif, sonra "Harika!").
   *
   * NEDEN `router.push` DEĞİL -- VE BU BİR HATA DÜZELTMESİYDİ: onboarding
   * gösterilirken `OnboardingGate` `children` yerine bu akışı render
   * ediyor, yani ekranda mount edilmiş bir `Stack` YOK. `router.push`
   * hiçbir şeye gidemiyordu ve kullanıcı "yolun hazırlanıyor" ekranında
   * sonsuza kadar kalıyordu. Paywall'ı bir ADIM yapmak, akışın kendi
   * dışına çıkmadan bitmesini sağlıyor.
   *
   * Paywall'ın KENDİSİ yeniden yazılmadı: uygulamanın paywall'ı
   * kullanılıyor (fiyat, plan seçimi, geri yükleme ve Guideline 3.1.2
   * yasal bloğu tek yerde), üstüne yalnızca referansın deneme takvimi
   * kartı ekleniyor.
   */
  const handlePlanDone = useCallback(() => setStep("paywall"), []);

  /** Satın alsa da almasa da akış "Harika!" ekranıyla bitiyor. */
  const handlePaywallClosed = useCallback(() => setStep("success"), []);

  if (step === "splash") return <OnboardingSplashScreen onDone={() => setStep("welcome")} />;
  if (step === "welcome") return <OnboardingWelcomeScreen onStart={() => setStep("native")} />;

  if (step === "native") {
    return (
      <OnboardingLanguageStep
        mode="native"
        progress={progressOf("native")}
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
        progress={progressOf("target")}
        selected={targetLanguage}
        excludeCode={nativeLanguage}
        onSelect={setTargetLanguage}
        onContinue={goLevel}
        submitting={setPair.isPending}
      />
    );
  }

  if (step === "levelTest") {
    // Dil çifti bu noktada ZATEN kaydedildi (bkz. `goLevel`).
    return <LevelTestScreen onDone={onDone} />;
  }

  if (step === "level") {
    return (
      <OnboardingLevelStep
        progress={progressOf("level")}
        selected={level}
        onSelect={setLevel}
        onContinue={() => setStep("taste")}
        onTakeTest={() => setStep("levelTest")}
      />
    );
  }

  if (step === "taste") {
    return (
      <OnboardingBookTasteStep
        progress={progressOf("taste")}
        books={contentQuery.data?.books ?? []}
        loading={contentQuery.isLoading}
        likedIds={likedBookIds}
        onLike={(bookId) => setLikedBookIds((ids) => [...ids, bookId])}
        onSkipBook={() => undefined}
        onContinue={() => setStep("firstRead")}
      />
    );
  }

  if (step === "firstRead") {
    return (
      <OnboardingFirstReadStep
        progress={progressOf("firstRead")}
        passage={contentQuery.data?.passage ?? null}
        loading={contentQuery.isLoading}
        level={level}
        picked={pickedWords}
        onPick={(word) =>
          setPickedWords((words) =>
            words.some((existing) => existing.lemma === word.lemma) ? words : [...words, word],
          )
        }
        onUnpick={(lemma) =>
          setPickedWords((words) => words.filter((word) => word.lemma !== lemma))
        }
        onContinue={() => setStep("quiz")}
        onSkip={() => setStep("goal")}
      />
    );
  }

  if (step === "quiz") {
    return (
      <OnboardingQuizStep
        progress={progressOf("quiz")}
        words={wordsWithGloss}
        loading={glossesQuery.isLoading}
        onContinue={() => setStep("celebrate")}
      />
    );
  }

  if (step === "celebrate") {
    return (
      <OnboardingWordsCelebrationStep
        progress={progressOf("celebrate")}
        words={wordsWithGloss}
        onContinue={() => setStep("goal")}
      />
    );
  }

  if (step === "goal") {
    return (
      <OnboardingDailyGoalStep
        progress={progressOf("goal")}
        selected={dailyGoal}
        onSelect={setDailyGoal}
        onContinue={() => setStep("path")}
      />
    );
  }

  if (step === "path") {
    return (
      <OnboardingProjectionStep
        progress={progressOf("path")}
        level={level}
        dailyGoalMinutes={dailyGoal}
        onContinue={startFinishing}
      />
    );
  }

  if (step === "plan") {
    return (
      <OnboardingPlanStep progress={progressOf("plan")} tasks={planTasks} onDone={handlePlanDone} />
    );
  }

  if (step === "paywall") {
    return (
      <PaywallScreen
        source="onboarding"
        onClose={handlePaywallClosed}
        intro={<OnboardingTrialTimeline trialDays={trialDays} />}
      />
    );
  }

  return (
    <OnboardingSuccessStep
      premium={subscription.data?.isPremium ?? false}
      onContinue={onDone}
    />
  );
}
