import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Kullanıcı sistemde "hareketi azalt"ı açtı mı.
 *
 * NEDEN VAR: onboarding'in ilk okuma adımı kullanıcıya nereye dokunacağını
 * ANLATMAK için iki nabız kullanıyor (kelimede vurgu, kaydet düğmesinde
 * ölçek). Hareket duyarlılığı olan kullanıcıda bunları körlemesine
 * oynatmak erişilebilirlik ayarını yok saymak olurdu.
 *
 * KRİTİK DAVRANIŞ: bu hook `true` döndüğünde çağıran, animasyonu
 * DURDURMUYOR -- animasyonlu değeri EN BELİRGİN ucunda SABİTLİYOR. Nabzı
 * sessizce kapatmak, yönlendirmeye en çok ihtiyaç duyan kullanıcıyı hiç
 * sinyalsiz bırakırdı; oysa mesele hareket, sinyalin kendisi değil.
 *
 * Bu, depoda hareket-azaltma ayarının okunduğu İLK yer (2026-09-19).
 * `Skeleton` ve `Toast` koşulsuz döngüler çalıştırıyor; onları da buna
 * bağlamak ayrı ve daha geniş bir iş.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
