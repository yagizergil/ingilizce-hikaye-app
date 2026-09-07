export const profileQueryKeys = {
  all: ["profile"] as const,
  stats: () => [...profileQueryKeys.all, "stats"] as const,
  subscription: () => [...profileQueryKeys.all, "subscription"] as const,
};
