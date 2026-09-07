import { useCallback, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Google from "expo-auth-session/providers/google";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

async function mergeIfWasAnonymous(previousAnonymousUserId: string | null): Promise<void> {
  if (!previousAnonymousUserId) return;
  const { error } = await supabase.rpc("merge_anonymous_account", {
    p_anonymous_user_id: previousAnonymousUserId,
  });
  if (error) throw error;
}

async function getPreviousAnonymousUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.is_anonymous ? data.user.id : null;
}

export function useAppleSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const previousAnonymousUserId = await getPreviousAnonymousUserId();
      const nonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple identityToken missing");
      }

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce,
      });
      if (signInError) throw signInError;

      await mergeIfWasAnonymous(previousAnonymousUserId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { signIn, isLoading, error };
}

export function useGoogleSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: env.googleIosClientId,
  });

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const previousAnonymousUserId = await getPreviousAnonymousUserId();
      const result = await promptAsync();
      if (result.type !== "success") {
        throw new Error("Google sign-in cancelled or failed");
      }
      const idToken = result.authentication?.idToken ?? result.params?.id_token;
      if (!idToken) throw new Error("Google idToken missing");

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (signInError) throw signInError;

      await mergeIfWasAnonymous(previousAnonymousUserId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [promptAsync]);

  return { signIn, isLoading, error, isReady: !!request, response };
}

/**
 * E-posta ile giriş: kullanıcı anonimse supabase.auth.updateUser({ email })
 * kullanılır — bu, Supabase'in resmi "anonim -> kalıcı" akışıdır ve aynı
 * user_id'yi korur (veri taşımaya gerek yok). Kullanıcı zaten kayıtlıysa
 * (örn. çıkış yapıp farklı e-postayla girmek istiyorsa) düz OTP ile giriş
 * yapılır.
 */
export function useEmailSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sent, setSent] = useState(false);

  const sendLink = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.is_anonymous) {
        const { error: updateError } = await supabase.auth.updateUser({ email });
        if (updateError) throw updateError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: "ingilizcehikaye://" },
        });
        if (otpError) throw otpError;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendLink, isLoading, error, sent };
}
