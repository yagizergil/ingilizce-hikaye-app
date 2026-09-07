export const vocabularyQueryKeys = {
  all: ["vocabulary"] as const,
  words: () => [...vocabularyQueryKeys.all, "words"] as const,
};
