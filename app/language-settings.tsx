import { router } from "expo-router";

import { ManageLanguagePairsScreen } from "@/features/languagePair";
import { ErrorBoundary } from "@/components/ui";

export default function LanguageSettingsRoute() {
  return (
    <ErrorBoundary source="language-settings">
      <ManageLanguagePairsScreen
        onClose={() => router.back()}
        onNeedsPremium={() => router.replace("/paywall?source=language_pair")}
      />
    </ErrorBoundary>
  );
}
