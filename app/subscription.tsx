import { router, useLocalSearchParams } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { ManageSubscriptionScreen } from "@/features/subscription";

export default function SubscriptionRoute() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  return (
    <ErrorBoundary source="subscription">
      <ManageSubscriptionScreen source={source ?? "unknown"} onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
