export interface Result<T, E = string> {
  ok: boolean;
  data?: T;
  error?: E;
}

export type SubscriptionTier = "free" | "premium";
