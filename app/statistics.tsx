import { router } from "expo-router";

import { StatisticsScreen } from "@/features/profile";
import { ErrorBoundary } from "@/components/ui";

export default function StatisticsRoute() {
  return (
    <ErrorBoundary source="statistics">
      <StatisticsScreen onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
