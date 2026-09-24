import { router } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { SmartPracticeScreen } from "@/features/vocabulary";

export default function PracticeRoute() {
  return (
    <ErrorBoundary source="practice">
      <SmartPracticeScreen onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
