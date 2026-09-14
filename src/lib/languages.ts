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
  /**
   * Bayrak emojisi, dil seçici satırlarında görsel tanınırlık için.
   * Bilerek SVG/görsel asset değil: yeni bir bağımlılık ya da build adımı
   * gerektirmeyen tek seçenek ("Basitlik önce gelir"). Bilinen sınırlama:
   * bazı eski Android cihazlarda/bölge ayarlarında bayrak emojileri iki
   * harfli ülke koduna düşebilir (sistem fontu bayrak glifi taşımıyorsa) --
   * kabul edilen bir bedel, native isim zaten yanında duruyor.
   */
  flag: string;
  /**
   * `circle-flags` setindeki dosya adı (ISO 3166-1 alpha-2).
   *
   * NEDEN EMOJİ YETMEDİ: emoji bayraklar her platformda farklı çiziliyor,
   * iOS'ta dikdörtgen ve satırın geri kalanıyla aynı görsel dile ait
   * değiller -- ekran "hazır parça yapıştırılmış" gibi duruyordu. Yuvarlak
   * bayraklar satırdaki diğer yuvarlak öğelerle (radyo düğmesi, rozet)
   * aynı geometride. `flag` alanı erişilebilirlik metni ve görüntü
   * yüklenemezse yedek olarak duruyor.
   */
  flagCode: string;
  /**
   * Seçici listelerindeki sıra -- küçük sayı önce. Alfabetik ya da dosya
   * sırası DEĞİL: on satırlık bir listede kullanıcının aradığı dil
   * genellikle ilk üçte olur, o yüzden dünyada en çok konuşulan/öğrenilen
   * diller yukarı alındı. Ana dil adımında cihazın dili bu sıralamanın da
   * ÜSTÜNE çıkıyor (bkz. OnboardingLanguageStep) -- ilk satır çoğu
   * kullanıcı için zaten doğru cevap.
   *
   * Sıra editoryal bir karar; veri bütünlüğüyle ilgisi yok, istenirse tek
   * yerden değiştirilir.
   */
  popularity: number;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  {
    code: "en",
    popularity: 1,
    flagCode: "gb",
    nameEn: "English",
    nativeName: "English",
    isRtl: false,
    isContentTarget: true,
    flag: "🇬🇧",
  },
  {
    code: "es",
    popularity: 2,
    flagCode: "es",
    nameEn: "Spanish",
    nativeName: "Español",
    isRtl: false,
    isContentTarget: true,
    flag: "🇪🇸",
  },
  {
    code: "zh",
    popularity: 3,
    flagCode: "cn",
    nameEn: "Chinese",
    nativeName: "中文",
    isRtl: false,
    isContentTarget: true,
    flag: "🇨🇳",
  },
  {
    code: "ar",
    popularity: 5,
    flagCode: "sa",
    nameEn: "Arabic",
    nativeName: "العربية",
    isRtl: true,
    isContentTarget: true,
    flag: "🇸🇦",
  },
  {
    code: "fr",
    popularity: 4,
    flagCode: "fr",
    nameEn: "French",
    nativeName: "Français",
    isRtl: false,
    isContentTarget: true,
    flag: "🇫🇷",
  },
  {
    code: "ru",
    popularity: 6,
    flagCode: "ru",
    nameEn: "Russian",
    nativeName: "Русский",
    isRtl: false,
    isContentTarget: true,
    flag: "🇷🇺",
  },
  {
    code: "tr",
    popularity: 10,
    flagCode: "tr",
    nameEn: "Turkish",
    nativeName: "Türkçe",
    isRtl: false,
    isContentTarget: true,
    flag: "🇹🇷",
  },
  {
    code: "de",
    popularity: 7,
    flagCode: "de",
    nameEn: "German",
    nativeName: "Deutsch",
    isRtl: false,
    isContentTarget: true,
    flag: "🇩🇪",
  },
  {
    code: "ja",
    popularity: 8,
    flagCode: "jp",
    nameEn: "Japanese",
    nativeName: "日本語",
    isRtl: false,
    isContentTarget: true,
    flag: "🇯🇵",
  },
  {
    code: "it",
    popularity: 9,
    flagCode: "it",
    nameEn: "Italian",
    nativeName: "Italiano",
    isRtl: false,
    isContentTarget: true,
    flag: "🇮🇹",
  },
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
