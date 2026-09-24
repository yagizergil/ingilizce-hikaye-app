import { router, useLocalSearchParams } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { WordPackScreen } from "@/features/vocabulary";

export default function WordPackRoute() {
  const { level } = useLocalSearchParams<{ level: string }>();
  return (
    <ErrorBoundary source="word-pack">
      <WordPackScreen level={level ?? "A1"} onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
