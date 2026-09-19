import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";

export interface OnboardingStatus {
  /** Kullanıcı onboarding'i tamamladı mı. */
  completed: boolean;
  /** Seçtiği okuma seviyesi; henüz seçmediyse null. */
  targetLevel: CefrLevel | null;
}

interface ProfileRow {
  target_level: string | null;
  onboarding_completed_at: string | null;
}

/**
 * Onboarding'in gösterilip gösterilmeyeceğini belirler.
 *
 * Profil satırı hiç yoksa (yeni anonim kullanıcı) onboarding gösterilir.
 *
 * KULLANICI BULGUSU (2026-09-19): "hesabı sıfırla ve onboarding'i baştan
 * oynat" düğmesi çalışmıyor, ve yeni bir hesapta onboarding hiç açılmadan
 * uygulama geliyordu.
 *
 * SEBEP BURADAYDI. İki ayrı hata üst üste biniyordu:
 *
 *  1. `supabase.auth.getUser()` bir AĞ çağrısı yapıyor (`/auth/v1/user`).
 *     Başarısız olduğunda HATA FIRLATMIYOR, `user: null` dönüyor.
 *  2. `user` yokken burada `completed: true` dönülüyordu -- yani "bilmiyorum"
 *     cevabı, "onboarding bitti" diye BAŞARILI bir cevaba çevriliyordu.
 *
 * Sonuç: geçici bir ağ hatası ya da oturumun henüz kurulmadığı bir an,
 * `staleTime` (5 dakika) boyunca ÖNBELLEKLENEN bir "onboarding bitti"
 * cevabı üretiyordu. Hesap sıfırlama akışı tam olarak o ana denk geliyor:
 * hesap siliniyor, yeni anonim oturum açılıyor, önbellek temizleniyor ve
 * kök rotaya dönülüyor -- bu sırada sorgu oturumsuz bir anda çalışırsa
 * kullanıcı onboarding yerine ana ekranda, üstelik HİÇ DİL ÇİFTİ OLMAYAN
 * yepyeni bir hesapla kalıyordu. (Boş dil çifti ekranı da buradan
 * geliyordu; o ekranın kendi boş durumu ayrıca eklendi.)
 *
 * DÜZELTME: oturum artık YEREL olarak okunuyor (`getSession`, ağ turu yok)
 * ve oturum yoksa bu bir CEVAP değil, geçici bir durum sayılıp fırlatılıyor
 * -- `OnboardingGate` hata hâlinde uygulamayı göstermeye devam ediyor
 * (mevcut kullanıcıyı ağ hatası yüzünden akışa sokmamak hâlâ doğru), ama
 * yanlış cevap artık BAŞARILI diye önbelleğe YAZILMIYOR ve sorgu yeniden
 * deniyor.
 */
export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  // `getUser()` DEĞİL: o her çağrıda sunucuya gidiyor ve ağ hatasında
  // sessizce `user: null` dönüyor. `getSession()` depodan okuyor.
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    // Bu fonksiyon `AuthGate`in İÇİNDE çalışıyor, yani oturum olmaması
    // beklenen bir durum değil -- kurulumun ortasına denk gelinmiş demek.
    throw new Error("onboardingStatus.noSession");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("target_level, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;

  return {
    completed: data?.onboarding_completed_at != null,
    targetLevel: (data?.target_level as CefrLevel | null) ?? null,
  };
}

export function useOnboardingStatusQuery() {
  return useQuery({
    queryKey: ["onboarding", "status"],
    queryFn: fetchOnboardingStatus,
    staleTime: 5 * 60 * 1000,
    // Üç deneme: yukarıdaki "oturum yok" durumu kurulum sırasında bir kez
    // görülüp hemen düzelebiliyor; tek denemede pes etmek onboarding'i
    // atlatıyordu.
    retry: 3,
    retryDelay: (attempt) => Math.min(250 * 2 ** attempt, 2000),
  });
}
