import { router } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { CancelFlowScreen } from "@/features/subscription";

export default function CancelSubscriptionRoute() {
  return (
    <ErrorBoundary source="cancel_flow">
      <CancelFlowScreen onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
