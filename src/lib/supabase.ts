import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@/lib/storage";
import { env } from "@/lib/env";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
