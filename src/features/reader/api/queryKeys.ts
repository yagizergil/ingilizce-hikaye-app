export const readerQueryKeys = {
  chapter: (chapterId: string) => ["reader", "chapter", chapterId] as const,
  bookLemmaDictionary: (bookId: string) => ["reader", "bookLemmaDictionary", bookId] as const,
  userLemmaStates: (lemmas: string[]) => ["reader", "userLemmaStates", lemmas] as const,
  globalLemmaLookup: (lemma: string) => ["reader", "lemma", "canonical", lemma] as const,
  liveWordTranslation: (lemma: string) => ["reader", "lemma", "live", lemma] as const,
};
