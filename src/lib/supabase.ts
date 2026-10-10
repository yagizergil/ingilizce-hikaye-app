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

/**
 * supabase-js'in varsayılan depolama anahtarı (`sb-<proje>-auth-token`).
 * Çevrimdışı açılışta oturum yenilenemese bile cihazda kalıcı bir oturum
 * olup olmadığını bilmek için kullanılıyor (bkz. `useAuthBootstrap`).
 */
function authStorageKey(): string {
  const projectRef = new URL(env.supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
}

/** Cihazda (Keychain/AsyncStorage) saklı bir oturum var mı. Ağa çıkmaz. */
export async function hasPersistedSession(): Promise<boolean> {
  const raw = await authStorage.getItem(authStorageKey());
  return raw !== null && raw.length > 0;
}
