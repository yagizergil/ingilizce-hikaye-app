export const vocabularyQueryKeys = {
  all: ["vocabulary"] as const,
  words: () => [...vocabularyQueryKeys.all, "words"] as const,
  decks: () => [...vocabularyQueryKeys.all, "decks"] as const,
  deckCards: (deckId: string) => [...vocabularyQueryKeys.all, "deck-cards", deckId] as const,
  deckDueCards: (deckId: string) => [...vocabularyQueryKeys.all, "deck-due", deckId] as const,
};
