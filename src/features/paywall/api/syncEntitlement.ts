import { supabase } from "@/lib/supabase";
import { trackError, trackEvent } from "@/lib/analytics";

/**
 * Sunucudaki yetkiyi RevenueCat'in gerçek durumuyla ONARIR.
 *
 * NEDEN GEREKLİ (olay kaydı, 2026-09-07): yetkiyi normalde RevenueCat
 * webhook'u yazıyor (ADR-009) ve bu doğru mimari. Ama webhook teslimi
 * "at least once" garantisi verir, "asla kaybolmaz" garantisi VERMEZ.
 * Gerçekte olan da bu oldu: bir satın almanın tek webhook teslimi, o an
 * RevenueCat'teki yetki adı farklı olduğu için yok sayıldı. Yapılandırma
 * düzeltildi ama RevenueCat aynı satın alma için yeni bir olay üretmiyor —
 * kullanıcı ödemişti, sunucu sonsuza kadar 'free' diyordu ve bunu
 * düzeltecek hiçbir yol yoktu.
 *
 * İkinci ve daha sık karşılaşılacak durum: uygulamayı silip yeniden kuran
 * ödeyen kullanıcı. "Satın alımları geri yükle" eskiden yalnızca cihazdaki
 * SDK durumunu tazeliyordu; sunucuya hiç dokunmuyordu. Kullanıcı SDK'da
 * premium, sunucuda 'free' kalıyor ve ücretsiz katman sınırına takılıyordu.
 *
 * YETKİYİ YİNE İSTEMCİ YAZMIYOR: bu çağrı sunucuya yalnızca "benim
 * durumumu mağazadan tazele" diyor. Kimlik JWT'den okunuyor, ne
 * yazılacağına RevenueCat'in kendi API'si karar veriyor ve yazma yine
 * `apply_entitlement_event()` üzerinden yapılıyor. Fonksiyon yalnızca
 * yetki VEREBİLİR, asla alamaz.
 *
 * @returns Sunucu premium yazdıysa/gördüyse `true`.
 */
export async function syncEntitlementFromStore(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      tier?: string;
      applied?: boolean;
    }>("sync-entitlement", { body: {} });

    if (error) {
      // Sessizce yutulmuyor: çağıran zaten yoklamaya devam ediyor ve
      // süre dolarsa kullanıcıya görünür bir mesaj gösteriliyor.
      trackError("entitlement.sync", error);
      return false;
    }

    const premium = data?.tier === "premium";
    trackEvent("entitlement_synced", { premium, applied: data?.applied ?? false });
    return premium;
  } catch (error) {
    trackError("entitlement.sync", error);
    return false;
  }
}
