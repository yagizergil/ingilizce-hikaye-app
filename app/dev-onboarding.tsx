import { router } from "expo-router";

import { OnboardingPreview } from "@/features/onboarding";

/** Geliştirici önizlemesi: yeni onboarding giriş akışı (Profil > geliştirici satırı). */
export default function DevOnboardingRoute() {
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return <OnboardingPreview onClose={close} />;
}
