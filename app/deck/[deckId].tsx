import { router, useLocalSearchParams } from "expo-router";

import { ErrorBoundary } from "@/components/ui";
import { DeckDetailScreen } from "@/features/vocabulary";

export default function DeckDetailRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  if (!deckId) return null;

  return (
    <ErrorBoundary key={deckId} source="deckDetail">
      <DeckDetailScreen
        deckId={deckId}
        onBack={() => router.back()}
        onStartReview={(id) => router.push(`/deck-review/${id}`)}
      />
    </ErrorBoundary>
  );
}
