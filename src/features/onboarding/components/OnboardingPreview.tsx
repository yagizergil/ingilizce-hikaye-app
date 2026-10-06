import { useState } from "react";

import { OnboardingIntroCarousel } from "@/features/onboarding/components/OnboardingIntroCarousel";
import { OnboardingLanguageStep } from "@/features/onboarding/components/OnboardingLanguageStep";
import { OnboardingMeetMascot } from "@/features/onboarding/components/OnboardingMeetMascot";
import { OnboardingSplashScreen } from "@/features/onboarding/components/OnboardingSplashScreen";

type PreviewStep = "splash" | "intro" | "mascot" | "native" | "target";

interface OnboardingPreviewProps {
  onClose: () => void;
}

/**
 * Geliştirici önizlemesi (Profil > gizli geliştirici satırı): gerçek
 * onboarding'in giriş ekranlarını HESABI SIFIRLAMADAN gezer. Hiçbir şey
 * kaydedilmez -- dil seçimleri yalnızca bu ekranın yerel durumu.
 */
export function OnboardingPreview({ onClose }: OnboardingPreviewProps) {
  const [step, setStep] = useState<PreviewStep>("splash");
  const [native, setNative] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  if (step === "splash") return <OnboardingSplashScreen onDone={() => setStep("intro")} />;
  if (step === "intro") return <OnboardingIntroCarousel onDone={() => setStep("mascot")} />;
  if (step === "mascot") return <OnboardingMeetMascot onContinue={() => setStep("native")} />;
  if (step === "native") {
    return (
      <OnboardingLanguageStep
        mode="native"
        progress={0.1}
        selected={native}
        excludeCode={null}
        onSelect={setNative}
        onContinue={() => setStep("target")}
      />
    );
  }
  return (
    <OnboardingLanguageStep
      mode="target"
      progress={0.2}
      selected={target}
      excludeCode={native}
      onSelect={setTarget}
      onContinue={onClose}
    />
  );
}
