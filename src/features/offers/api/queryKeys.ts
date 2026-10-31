export const offersQueryKeys = {
  all: ["offers"] as const,
  rules: () => [...offersQueryKeys.all, "rules"] as const,
  context: () => [...offersQueryKeys.all, "context"] as const,
};
