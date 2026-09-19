import { I18nManager, Platform } from "react-native";

import { isRtlLanguage } from "@/lib/languages";

/**
 * Arayüz yazım yönünün (LTR/RTL) TEK yönetim noktası.
 *
 * DENETİM BULGUSU (2026-09-19): aynı mantık üç ekranda kopyalanmıştı
 * (`OnboardingFlow`, `ManageLanguagePairsScreen`, `LanguagePairScreen`) ve
 * üçü de aynı üç hatayı taşıyordu. Kural artık tek yerde.
 */

/**
 * Uygulamanın ŞU ANKİ yazım yönü.
 *
 * HATA 1 -- `I18nManager.isRTL` HER PLATFORMDA YOK. `react-native-web`'in
 * `I18nManager`'ı yalnızca `allowRTL`/`forceRTL`/`getConstants` sağlıyor;
 * `isRTL` diye bir alan taşımıyor, yani web'de `undefined`. Çağıran kod
 * `isRtlLanguage(dil) !== I18nManager.isRTL` diye karşılaştırdığı için
 * sonuç DAİMA `true` oluyordu: kullanıcı ana dilini seçip "Devam et"e
 * bastığında uygulama kendini yeniden başlatıyor, onboarding en başa
 * dönüyor, kullanıcı aynı adıma gelip aynı şeyi yaşıyordu -- SONSUZ
 * DÖNGÜ, uygulamaya hiç girilemiyordu. `getConstants().isRTL` üç
 * platformda da tanımlı olan tek okuma yolu.
 */
export function isLayoutRtl(): boolean {
  return I18nManager.getConstants().isRTL === true;
}

/**
 * İstenen dilin yönünü uygular. Değişiklik için yeniden başlatma
 * gerekiyorsa `true` döner.
 *
 * HATA 2 -- `allowRTL(true)` KOŞULSUZ ÇAĞRILIYORDU. `forceRTL(false)`
 * "RTL'i zorlama" demek, "LTR ol" demek DEĞİL: `allowRTL(true)` açıkken
 * yön cihazın diline düşer. Yani cihaz dili Arapça olan bir telefonda
 * Türkçe/İngilizce seçen kullanıcı için yön RTL kalıyordu, koşul bir
 * sonraki geçişte yine sağlanıyordu ve yeniden başlatma döngüye
 * giriyordu. LTR'yi gerçekten zorlamanın yolu `allowRTL(false)`.
 *
 * Web'de `forceRTL` bir no-op (yukarıdaki kaynağa bakın), dolayısıyla
 * yeniden başlatmanın düzeltebileceği bir şey yok -- orada hiç
 * istenmiyor. Web bu uygulamanın yayın platformu değil; metin yönü
 * i18next tarafından zaten doğru.
 */
export function applyLayoutDirection(languageCode: string): boolean {
  const wantsRtl = isRtlLanguage(languageCode);
  if (wantsRtl === isLayoutRtl()) return false;
  if (Platform.OS === "web") return false;

  I18nManager.allowRTL(wantsRtl);
  I18nManager.forceRTL(wantsRtl);
  return true;
}

/**
 * Uygulamayı yeniden başlatır. Başarılıysa bu satırdan sonrası hiç
 * çalışmaz; başarısızsa `false` döner ve ÇAĞIRAN AKIŞA DEVAM ETMELİDİR.
 *
 * HATA 3 -- `DevSettings.reload()` YAYIN DERLEMESİNDE ÇALIŞMAZ. Sadece
 * geliştirme derlemelerinde var. Eski kod onu çağırıp `return` ediyordu,
 * yani YAYINDAKİ bir Arapça kullanıcıda: yön bayrağı set ediliyor, yeniden
 * başlatma sessizce hiçbir şey yapmıyor ve akış bir sonraki adıma HİÇ
 * geçmiyordu -- "Devam et" düğmesi kalıcı olarak ölüydü. Onboarding'i
 * bitiremeyen bir uygulama App Store'da da anında red sebebi.
 *
 * `expo-updates` zaten bir bağımlılık ve `reloadAsync()` yayın
 * derlemesinde desteklenen yol. Expo Go gibi desteklenmeyen ortamlarda
 * fırlatıyor; o yüzden hata yutulmuyor, kaydediliyor ve `false` dönüyor.
 */
export async function reloadApp(): Promise<boolean> {
  if (Platform.OS === "web") {
    window.location.reload();
    return true;
  }

  try {
    const Updates = await import("expo-updates");
    await Updates.reloadAsync();
    return true;
  } catch (error) {
    // `trackError` TEMBEL yükleniyor: analytics -> supabase -> env zinciri
    // bu modülü ortam değişkeni olmadan import edilemez hâle getiriyordu
    // (yön kuralının kendisi hiçbirine ihtiyaç duymuyor).
    const { trackError } = await import("@/lib/analytics");
    trackError("rtl.reload", error);
    return false;
  }
}
