import Constants from "expo-constants";

interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  revenueCatApiKeyIos: string;
  googleIosClientId: string;
  /** Kullanım Koşulları (EULA) — paywall'da zorunlu, Guideline 3.1.2(a). */
  termsUrl: string;
  /** Gizlilik politikası — paywall'da zorunlu. Boşsa paywall uyarı gösterir. */
  privacyUrl: string;
}

function readEnv(): AppEnv {
  const extra = Constants.expoConfig?.extra ?? {};

  const supabaseUrl = extra.supabaseUrl as string | undefined;
  const supabaseAnonKey = extra.supabaseAnonKey as string | undefined;
  const revenueCatApiKeyIos = extra.revenueCatApiKeyIos as string | undefined;
  const googleIosClientId = extra.googleIosClientId as string | undefined;
  const termsUrl = extra.termsUrl as string | undefined;
  const privacyUrl = extra.privacyUrl as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    revenueCatApiKeyIos: revenueCatApiKeyIos ?? "",
    googleIosClientId: googleIosClientId ?? "",
    termsUrl: termsUrl ?? "",
    privacyUrl: privacyUrl ?? "",
  };
}

export const env = readEnv();
