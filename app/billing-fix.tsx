import { router, useLocalSearchParams } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { BillingFixScreen } from "@/features/subscription";

export default function BillingFixRoute() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  return (
    <ErrorBoundary source="billing_fix">
      <BillingFixScreen source={source ?? "unknown"} onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
