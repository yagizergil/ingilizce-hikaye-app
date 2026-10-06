import { router } from "expo-router";

import { OnboardingPreview } from "@/features/onboarding";

/**
 * Geliştirici önizlemesi: açılış ekranı (Profil > geliştirici satırı).
 * Gerçek onboarding açılışını gösterir -- animasyonlu logo + selam balonları.
 */
export default function DevSplashRoute() {
  return (
    <OnboardingPreview onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
  );
}
