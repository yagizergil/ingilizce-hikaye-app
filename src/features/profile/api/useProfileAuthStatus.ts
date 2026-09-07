import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import type { User } from "@supabase/supabase-js";

interface ProfileAuthStatus {
  isAnonymous: boolean;
  email: string | null;
  /**
   * Görünen ad. Apple/Google girişinde sağlayıcı `full_name` veya `name`
   * alanını doldurur; e-posta ile girişte ikisi de yoktur ve null döner
   * (ekran o durumda e-postanın kullanıcı adı kısmını gösteriyor).
   */
  displayName: string | null;
  /** Hesabın açılış tarihi (ISO) — profil başlığındaki "üye" satırı. */
  memberSince: string | null;
}

const ANONYMOUS: ProfileAuthStatus = {
  isAnonymous: true,
  email: null,
  displayName: null,
  memberSince: null,
};

function toStatus(user: User | null | undefined): ProfileAuthStatus {
  if (!user) return ANONYMOUS;

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const rawName = metadata?.["full_name"] ?? metadata?.["name"];
  const displayName = typeof rawName === "string" && rawName.trim().length > 0 ? rawName.trim() : null;

  return {
    isAnonymous: user.is_anonymous ?? true,
    email: user.email ?? null,
    displayName,
    memberSince: user.created_at ?? null,
  };
}

export function useProfileAuthStatus(): ProfileAuthStatus {
  const [status, setStatus] = useState<ProfileAuthStatus>(ANONYMOUS);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setStatus(toStatus(data.user));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setStatus(toStatus(session?.user));
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return status;
}
