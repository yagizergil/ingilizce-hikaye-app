/**
 * Desteklenen dillerin sabit istemci-taraflı listesi.
 *
 * `public.languages` tablosuyla (migration 033) BİREBİR aynı veriyi taşır.
 * Neden ayrıca burada da var: bu liste seçici ekranlarında (onboarding,
 * profil ayarları) ağ isteği beklemeden çizilmeli -- statik ve neredeyse
 * hiç değişmeyen bir referans veri için her ekran açılışında bir round-trip
 * eklemenin faydası yok. Sunucu tarafı `languages` tablosu tek doğruluk
 * kaynağıdır (erişim kararları, FK bütünlüğü hep ondan); bu dosya yalnızca
 * çizim hızı için bir istemci-taraflı yansıması. İkisi ayrışırsa (yeni dil
 * eklenip burası güncellenmezse) tek sonucu o dilin seçici ekranında geç
 * görünmesi olur -- veri bütünlüğünü etkilemez çünkü `set_language_pair()`
 * sunucuda kendi `languages` tablosuna karşı doğruluyor.
 */

export interface LanguageInfo {
  code: string;
  nameEn: string;
  nativeName: string;
  isRtl: boolean;
  /**
   * Bu dilde yazılmış kitap var/olabilir. 2026-09-14 gece oturumunda
   * 9 dilin (es/fr/de/it/ru wave 1, zh/ja/tr/ar wave 2 -- migration
   * 035/036) A1-B1 orijinal katmanı tamamlanıp yayınlandı. Çince B1
   * diğerlerinden ince (4 hikâye, kelime listesi kısıtları) ama A1-A2
   * sağlam -- yine de aktif. B2/C1/C2 (klasikler) devam eden bir iş.
   */
  isContentTarget: boolean;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: "en", nameEn: "English", nativeName: "English", isRtl: false, isContentTarget: true },
  { code: "es", nameEn: "Spanish", nativeName: "Español", isRtl: false, isContentTarget: true },
  { code: "zh", nameEn: "Chinese", nativeName: "中文", isRtl: false, isContentTarget: true },
  { code: "ar", nameEn: "Arabic", nativeName: "العربية", isRtl: true, isContentTarget: true },
  { code: "fr", nameEn: "French", nativeName: "Français", isRtl: false, isContentTarget: true },
  { code: "ru", nameEn: "Russian", nativeName: "Русский", isRtl: false, isContentTarget: true },
  { code: "tr", nameEn: "Turkish", nativeName: "Türkçe", isRtl: false, isContentTarget: true },
  { code: "de", nameEn: "German", nativeName: "Deutsch", isRtl: false, isContentTarget: true },
  { code: "ja", nameEn: "Japanese", nativeName: "日本語", isRtl: false, isContentTarget: true },
  { code: "it", nameEn: "Italian", nativeName: "Italiano", isRtl: false, isContentTarget: true },
] as const;

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]));

export function getLanguage(code: string): LanguageInfo | undefined {
  return BY_CODE.get(code);
}

export function isRtlLanguage(code: string): boolean {
  return BY_CODE.get(code)?.isRtl ?? false;
}

/** Bugün kitap içeriği barındırabilen diller -- hedef dil seçicisinde gösterilenler. */
export const CONTENT_TARGET_LANGUAGES: readonly LanguageInfo[] = LANGUAGES.filter(
  (language) => language.isContentTarget,
);

/** i18next'in desteklediği tüm arayüz dilleri -- ana dil seçicisinde gösterilenler. */
export const UI_LANGUAGE_CODES: readonly string[] = LANGUAGES.map((language) => language.code);
