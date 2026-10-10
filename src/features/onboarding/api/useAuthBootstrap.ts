import { useEffect, useState } from "react";

import { hasPersistedSession, supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";
import {
  classifyLaunchError,
  LAUNCH_STEP_TIMEOUT_MS,
  withTimeout,
  type LaunchFailureKind,
} from "@/lib/launchFailure";

import type { AuthStatus } from "@/features/onboarding/types";

export interface AuthBootstrapResult {
  status: AuthStatus;
  /** `status === "failed"` iken hatanın türü. */
  failure: LaunchFailureKind | null;
}

/**
 * Oturum gerçekten yoksa ve kurulamadıysa açılış sürdürülemez; ama cihazda
 * saklı bir oturum varsa (dönen kullanıcı, çevrimdışı) uygulamayı açıyoruz:
 * indirilmiş bölümler çevrimdışı okunabiliyor (ADR-004) ve sorgular
 * bağlantı gelince kendiliğinden toparlanıyor.
 */
async function fallbackAfterError(error: unknown): Promise<AuthBootstrapResult> {
  const kind = classifyLaunchError(error);
  try {
    if (await withTimeout(hasPersistedSession(), LAUNCH_STEP_TIMEOUT_MS, "persisted")) {
      return { status: "anonymous", failure: null };
    }
  } catch (storageError) {
    trackError("auth.bootstrap.persistedCheck", storageError);
  }
  return { status: "failed", failure: kind };
}

/**
 * Misafir mod: uygulama açılışında oturum yoksa anonim oturum açar.
 * Kayıt duvarı yok — kullanıcı hiçbir zaman "giriş yapmadan" ekranda
 * kalmaz, ilk açılıştan itibaren gerçek bir auth.uid()'e sahiptir.
 *
 * `attempt` değişince (splash'teki "Tekrar dene") kurulum baştan çalışır.
 *
 * ÇEVRİMDIŞI AÇILIŞ (2026-10-10, kullanıcı bulgusu): her ağ adımı artık
 * süre sınırlı. Öncesinde oturum yenileme ya da anonim giriş cevapsız
 * kalınca durum hiç "bootstrapping"ten çıkmıyor, splash sonsuza dek
 * kalıyordu.
 */
export function useAuthBootstrap(attempt = 0): AuthBootstrapResult {
  // Sonuç hangi denemeye ait olduğuyla birlikte tutuluyor: yeni bir deneme
  // başladığında eski sonuç efekt içinde sıfırlanmadan "bootstrapping" sayılır.
  const [state, setState] = useState<AuthBootstrapResult & { attempt: number }>({
    status: "bootstrapping",
    failure: null,
    attempt,
  });

  useEffect(() => {
    let mounted = true;
    const setResult = (next: AuthBootstrapResult) => setState({ ...next, attempt });

    async function bootstrap(): Promise<AuthBootstrapResult> {
      const { data, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        LAUNCH_STEP_TIMEOUT_MS,
        "getSession",
      );
      let needsAnonymousSignIn = !data.session;

      if (data.session) {
        // getSession() yalnızca yerel jetonu çözer; kullanıcının sunucuda
        // hâlâ var olduğunu doğrulamaz. Sahipsiz bir oturum (kullanıcı satırı
        // silinmiş) her yetkili istekte 403 alır -- getUser() bunu yakalayıp
        // yeni bir anonim oturumla kendini onarmamızı sağlıyor.
        const { error: userCheckError } = await withTimeout(
          supabase.auth.getUser(),
          LAUNCH_STEP_TIMEOUT_MS,
          "getUser",
        ).catch((error: unknown) => ({ error: { status: 0, cause: error } }));

        // YALNIZCA sunucu oturumu REDDETTİYSE sıfırlanıyor (401/403). Ağ
        // hatasında oturuma DOKUNMUYORUZ: oturum Keychain'de kalıcı ve
        // uçak modunda açılan uygulama kullanıcının tek hesabını silmemeli.
        const rejectedByServer =
          userCheckError !== null &&
          (userCheckError.status === 401 || userCheckError.status === 403);

        if (!rejectedByServer) {
          // Oturum yerelde var; ağ yoksa bile kullanıcı içeri alınıyor.
          return {
            status: data.session.user.is_anonymous ? "anonymous" : "registered",
            failure: null,
          };
        }
        await supabase.auth.signOut();
        needsAnonymousSignIn = true;
      }

      if (needsAnonymousSignIn) {
        // Oturum okunamadıysa (yenileme ağ hatası) ve cihazda saklı bir
        // oturum varsa yeni hesap AÇMIYORUZ: aksi hâlde kullanıcının
        // kitapları ve kelimeleri eski hesapta kalırdı.
        if (sessionError) return fallbackAfterError(sessionError);

        const { error } = await withTimeout(
          supabase.auth.signInAnonymously(),
          LAUNCH_STEP_TIMEOUT_MS,
          "signInAnonymously",
        );
        if (error) return fallbackAfterError(error);
      }

      const { data: refreshed } = await supabase.auth.getSession();
      return {
        status: refreshed.session?.user.is_anonymous === false ? "registered" : "anonymous",
        failure: null,
      };
    }

    bootstrap()
      .then((next) => {
        if (mounted) setResult(next);
      })
      .catch(async (error: unknown) => {
        trackError("auth.bootstrap", error);
        const next = await fallbackAfterError(error);
        if (mounted) setResult(next);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // Oturumsuz olaylar (ör. kendini onarırken SIGNED_OUT) durumu
      // değiştirmiyor; kurulumun sonucu bootstrap'tan geliyor.
      if (!mounted || !session) return;
      setResult({
        status: session.user.is_anonymous ? "anonymous" : "registered",
        failure: null,
      });
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [attempt]);

  if (state.attempt !== attempt) return { status: "bootstrapping", failure: null };
  return { status: state.status, failure: state.failure };
}
