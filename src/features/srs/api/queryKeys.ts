export const srsQueryKeys = {
  all: ["srs"] as const,
  dueCards: () => [...srsQueryKeys.all, "dueCards"] as const,
};
