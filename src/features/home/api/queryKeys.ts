export const homeQueryKeys = {
  all: ["home"] as const,
  extras: () => [...homeQueryKeys.all, "extras"] as const,
  favoritedBookIds: () => [...homeQueryKeys.all, "favoritedBookIds"] as const,
  favoritesReadLists: () => [...homeQueryKeys.all, "favoritesReadLists"] as const,
  currentlyReading: () => [...homeQueryKeys.all, "currentlyReading"] as const,
};
