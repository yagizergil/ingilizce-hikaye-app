import { router, useLocalSearchParams } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { WinbackScreen } from "@/features/subscription";

export default function WinbackRoute() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  return (
    <ErrorBoundary source="winback">
      <WinbackScreen source={source ?? "unknown"} onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
