import { router, useLocalSearchParams } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { DeckReviewScreen } from "@/features/vocabulary";

export default function DeckReviewRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  if (!deckId) return null;

  return (
    <ErrorBoundary key={deckId} source="deckReview">
      <DeckReviewScreen deckId={deckId} onClose={() => router.back()} />
    </ErrorBoundary>
  );
}
