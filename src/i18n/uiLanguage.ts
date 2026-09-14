import AsyncStorage from "@/lib/storage";
import { UI_LANGUAGE_CODES } from "@/lib/languages";

/**
 * Kullanıcının SEÇTİĞİ arayüz dilinin kalıcı kaydı.
 *
 * ÇÖZÜLEN HATA (denetim bulgusu, 2026-09-14): arayüz dili yalnızca
 * CİHAZIN diline göre açılıyordu ve kullanıcının onboarding'de ya da
 * ayarlarda seçtiği dil hiçbir yere yazılmıyordu. Sonuç: Almanca telefonu
 * olan bir kullanıcı ana dilini Türkçe seçse bile, uygulamayı kapatıp
 * açtığında arayüz yine Almanca açılıyordu -- yani on dilli bir
 * uygulamada dil seçimi ÇALIŞMIYORDU. Sunucudaki dil çifti kaydı doğru,
 * arayüz yanlış kalıyordu.
 *
 * NEDEN SUNUCUDAN OKUNMUYOR: dil, uygulamanın ilk karesinde gerekiyor --
 * splash ve karşılama ekranı dâhil. Sunucu isteğini beklemek, her açılışta
 * bir tur İngilizce/cihaz dili gösterip sonra dili değiştirmek demekti.
 * Yerel kayıt anında okunuyor; sunucudaki `user_language_pairs` yine tek
 * doğruluk kaynağı, bu sadece onun hızlı bir yansıması.
 */
const KEY = "i18n.uiLanguage";

export async function readStoredUiLanguage(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (!value) return null;
    // Desteklenmeyen bir kod (eski sürümden kalma, elle bozulmuş kayıt)
    // sessizce yok sayılıyor -- yoksa i18next bilinmeyen bir dile düşüp
    // her metni ham anahtar olarak basardı.
    return (UI_LANGUAGE_CODES as readonly string[]).includes(value) ? value : null;
  } catch {
    // Depo okunamıyorsa (nadir) cihaz diline düşmek doğru davranış.
    return null;
  }
}

export async function storeUiLanguage(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch {
    // Yazamamak akışı durdurmamalı: kullanıcı dili yine bu oturumda
    // değişiyor, yalnızca bir sonraki açılışta hatırlanmıyor.
  }
}
