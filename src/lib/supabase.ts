import { createClient } from "@supabase/supabase-js";
import { authStorage } from "@/lib/authStorage";
import { env } from "@/lib/env";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    // Oturum Keychain/Keystore'da: uygulama silinip yeniden kurulsa bile
    // kullanıcı aynı anonim hesabına dönüyor (bkz. src/lib/authStorage.ts).
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
