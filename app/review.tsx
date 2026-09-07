import { router } from "expo-router";

import { ReviewScreen } from "@/features/srs";
import { ErrorBoundary } from "@/components/ui";

export default function ReviewRoute() {
  return (
    <ErrorBoundary source="review">
      <ReviewScreen onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
