import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";
import type { AuthStatus } from "@/features/onboarding/types";

/**
 * Misafir mod: uygulama açılışında oturum yoksa anonim oturum açar.
 * Kayıt duvarı yok — kullanıcı hiçbir zaman "giriş yapmadan" ekranda
 * kalmaz, ilk açılıştan itibaren gerçek bir auth.uid()'e sahiptir.
 */
export function useAuthBootstrap(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>("bootstrapping");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      let needsAnonymousSignIn = !data.session;

      if (data.session) {
        // getSession() only decodes the locally-cached token; it never
        // confirms the user it points to still exists server-side. A
        // stale/orphaned session (e.g. that user row was deleted) decodes
        // fine locally but every authenticated request afterwards 403s
        // with "User from sub claim in JWT does not exist" -- getUser()
        // is the one call here that actually round-trips to the server,
        // so it's used to detect that case and self-heal by signing out
        // and creating a fresh anonymous session, instead of leaving the
        // app stuck on a session that looks valid but silently rejects
        // every authenticated query it makes (this exact symptom broke
        // chapter loading -- the reader's per-lemma queries need a real
        // session and have no other way to recover from this).
        const { error: userCheckError } = await supabase.auth.getUser();

        // YALNIZCA sunucu oturumu REDDETTİYSE sıfırlanıyor (401/403).
        //
        // NEDEN AYRIM ŞART: oturum artık Keychain'de yaşıyor ve uygulama
        // silinip yeniden kurulsa bile duruyor (bkz. src/lib/authStorage.ts).
        // Her hatada signOut etmek, AĞ hatasını da oturumun geçersizliği
        // saymak demekti: uçak modunda ya da zayıf bağlantıda açılan
        // uygulama kullanıcının tek ve kalıcı anonim hesabını siler,
        // yerine yenisini açardı -- kitapları, kelimeleri ve serisi
        // erişilemez hâle gelirdi. Ağ hatasında oturuma DOKUNMUYORUZ;
        // sonraki açılışta ya da bağlantı gelince kendi kendine düzeliyor.
        const rejectedByServer =
          userCheckError !== null &&
          (userCheckError.status === 401 || userCheckError.status === 403);

        if (rejectedByServer) {
          await supabase.auth.signOut();
          needsAnonymousSignIn = true;
        }
      }

      if (needsAnonymousSignIn) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          if (mounted) setStatus("anonymous");
          return;
        }
      }

      if (!mounted) return;
      const { data: userData } = await supabase.auth.getUser();
      setStatus(userData.user?.is_anonymous ? "anonymous" : "registered");
    }

    /**
     * DENETİM BULGUSU (2026-09-14): `bootstrap()` içinde hiç try/catch
     * yoktu. Beklenmedik bir throw (Keychain, ağ katmanı, JSON) `setStatus`
     * hiç çağrılmadan akışı kesiyor ve `AuthGate` kalıcı olarak dönen bir
     * spinner gösteriyordu -- kullanıcı için "uygulama açılmıyor", App
     * Store incelemesinde anında red. Hata yutulmuyor, kaydediliyor ve
     * kullanıcı en azından anonim akışa düşüyor.
     */
    void bootstrap().catch((error) => {
      trackError("auth.bootstrap", error);
      if (mounted) setStatus("anonymous");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setStatus(session?.user?.is_anonymous ? "anonymous" : "registered");
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return status;
}
