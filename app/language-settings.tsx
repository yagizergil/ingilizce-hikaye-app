import { router } from "expo-router";

import { ManageLanguagePairsScreen } from "@/features/languagePair";
import { ErrorBoundary } from "@/components/ui";
import { openPaywall } from "@/features/paywall";

export default function LanguageSettingsRoute() {
  return (
    <ErrorBoundary source="language-settings">
      <ManageLanguagePairsScreen
        onClose={() => router.back()}
        // `replace` değil `push`: paywall'ı kapatan kullanıcı dil ayarlarına
        // geri dönebilmeli. `replace` bu ekranı yığından düşürüyordu.
        onNeedsPremium={() => openPaywall("language_pair")}
      />
    </ErrorBoundary>
  );
}
