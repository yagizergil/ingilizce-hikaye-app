import { router, useLocalSearchParams } from "expo-router";

import { PaywallScreen } from "@/features/paywall";
import { ErrorBoundary } from "@/components/ui";

export default function PaywallRoute() {
  const { source } = useLocalSearchParams<{ source?: string }>();

  return (
    <ErrorBoundary source="paywall">
      <PaywallScreen onClose={() => router.back()} source={source ?? "unknown"} />
    </ErrorBoundary>
  );
}
