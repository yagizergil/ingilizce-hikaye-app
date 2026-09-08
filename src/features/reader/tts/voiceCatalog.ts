import * as Speech from "expo-speech";

/**
 * Cihazdaki İngilizce seslerin kataloğu ve kalite sıralaması.
 *
 * NEDEN KİMLİĞE BAKIYORUZ, `quality` ALANINA DEĞİL
 * ------------------------------------------------
 * `expo-speech` iOS tarafında kaliteyi ikiye indiriyor:
 *
 *     quality: voice.quality == .enhanced ? "Enhanced" : "Default"
 *
 * iOS 16'dan beri üçüncü ve EN İYİ bir kademe var: `.premium`. Yukarıdaki
 * eşleme onu "Default" yapıyor — yani cihazda kurulu en iyi ses, sırf
 * paketin kalite alanına baktığımız için en kötü sesle aynı kovaya
 * düşüyordu. Apple'ın ses kimlikleri kademeyi açıkça taşıyor
 * (`com.apple.voice.premium.en-US.Ava`), o yüzden sıralama kimlik
 * üzerinden yapılıyor ve `quality` yalnızca destekleyici kanıt.
 *
 * KULLANICININ BİLMESİ GEREKEN ŞEY
 * --------------------------------
 * iOS'ta gelişmiş ve premium sesler VARSAYILAN OLARAK KURULU DEĞİL;
 * kullanıcı Ayarlar > Erişilebilirlik > Sözlü İçerik > Sesler'den ücretsiz
 * indiriyor. İndirmemiş bir cihazda geriye yalnızca "compact" ses kalıyor
 * ve o gerçekten robotik duyuluyor. Uygulamanın yapabileceği en büyük
 * kalite iyileştirmesi bu indirmeyi kullanıcıya söylemek — bu yüzden
 * `hasHighQualityVoice` var.
 */

export type VoiceTier = "premium" | "enhanced" | "standard";

export interface CatalogVoice {
  identifier: string;
  /** Kullanıcıya gösterilecek ad (ör. "Ava"). */
  name: string;
  language: string;
  tier: VoiceTier;
}

const TIER_RANK: Record<VoiceTier, number> = { premium: 3, enhanced: 2, standard: 1 };

/** Öğrenciye en tanıdık aksanlar önce. */
const LOCALE_RANK: Record<string, number> = { "en-US": 3, "en-GB": 2 };

/**
 * Apple'ın İngilizce KADIN seslerinin adları.
 *
 * NEDEN VAR: `Speech.Voice` cinsiyet bilgisi taşımıyor — ne bir alan var
 * ne de kimlikte bir ipucu. Ürün sahibinin kararı anlatıcının kadın sesi
 * olması yönünde; tek yol adları tanımak.
 *
 * BU BİR KİLİT DEĞİL, VARSAYILAN: kullanıcı ayarlardaki ses seçicisinden
 * kurulu herhangi bir sese geçebiliyor. Liste yalnızca "hiçbir şey
 * seçilmemişse ne çalsın" sorusunu cevaplıyor. Tanınmayan bir ad listede
 * yoksa eleme yapılmıyor, sadece sıralamada arkaya düşüyor — yeni bir iOS
 * sürümü yeni ses eklediğinde özellik bozulmuyor.
 */
const FEMALE_VOICE_NAMES = new Set([
  "ava",
  "allison",
  "samantha",
  "susan",
  "nicky",
  "zoe",
  "joelle",
  "nora",
  "serena",
  "kate",
  "stephanie",
  "karen",
  "catherine",
  "moira",
  "tessa",
  "fiona",
  "veena",
]);

function isFemaleName(name: string): boolean {
  return FEMALE_VOICE_NAMES.has(name.trim().toLowerCase());
}

/**
 * Eski iOS'taki şaka sesleri ("Bad News", "Bells", "Trinoids"...).
 * Konuşma sentezleyici olarak listelense de hikâye okumak için
 * kullanılamazlar; listede görünmeleri kullanıcıyı yanıltır.
 */
function isNoveltyVoice(identifier: string): boolean {
  return identifier.includes(".speech.synthesis.voice.");
}

export function voiceTier(voice: Speech.Voice): VoiceTier {
  const id = voice.identifier.toLowerCase();
  if (id.includes("premium")) return "premium";
  if (id.includes("enhanced") || voice.quality === Speech.VoiceQuality.Enhanced) return "enhanced";
  return "standard";
}

/**
 * Ses adını kimlikten çıkarır.
 *
 * `Voice.name` bazı cihazlarda kimliğin tamamını döndürüyor; kullanıcıya
 * "com.apple.voice.premium.en-US.Ava" göstermek kabul edilemez.
 */
export function displayName(voice: Speech.Voice): string {
  const last = voice.identifier.split(".").pop() ?? "";
  if (last && !last.includes("-") && last.length <= 20) return last;

  const name = voice.name?.trim();
  if (name && !name.includes(".")) return name;

  return voice.language;
}

/** Kalite, sonra aksan, sonra ada göre sıralar. */
export function rankVoices(voices: Speech.Voice[]): CatalogVoice[] {
  return voices
    .filter((voice) => voice.language.startsWith("en") && !isNoveltyVoice(voice.identifier))
    .map((voice) => ({
      identifier: voice.identifier,
      name: displayName(voice),
      language: voice.language,
      tier: voiceTier(voice),
    }))
    .sort((a, b) => {
      // 1) Kalite her şeyin önünde — gelişmiş bir erkek sesi, robotik bir
      //    kadın sesinden iyidir.
      const byTier = TIER_RANK[b.tier] - TIER_RANK[a.tier];
      if (byTier !== 0) return byTier;

      // 2) Aynı kalitede kadın sesi öne alınıyor (ürün kararı).
      const byGender = Number(isFemaleName(b.name)) - Number(isFemaleName(a.name));
      if (byGender !== 0) return byGender;

      // 3) Sonra tanıdık aksan.
      const byLocale = (LOCALE_RANK[b.language] ?? 0) - (LOCALE_RANK[a.language] ?? 0);
      if (byLocale !== 0) return byLocale;

      return a.name.localeCompare(b.name);
    });
}

/** Listede gelişmiş ya da premium bir ses var mı. */
export function hasHighQualityVoice(voices: CatalogVoice[]): boolean {
  return voices.some((voice) => voice.tier !== "standard");
}

/**
 * Kullanıcının seçtiği ses, yoksa en iyi olan.
 *
 * Seçilen ses artık cihazda yoksa (kullanıcı sildi, sistem güncellemesi)
 * sessizce en iyiye düşüyor — konuşmanın hiç çalışmaması yerine.
 */
export function resolveVoice(
  voices: CatalogVoice[],
  preferredIdentifier: string | null,
): CatalogVoice | null {
  if (preferredIdentifier) {
    const preferred = voices.find((voice) => voice.identifier === preferredIdentifier);
    if (preferred) return preferred;
  }
  return voices[0] ?? null;
}

/**
 * Cihaz sorgusu oturum başına bir kez yapılıyor.
 *
 * `getAvailableVoicesAsync()` gerçek bir sistem çağrısı ve sonuç oturum
 * içinde değişmiyor. Kullanıcı Ayarlar'dan yeni bir ses indirirse
 * uygulamayı yeniden açması gerekiyor — bunu kabul ediyoruz; alternatifi
 * her konuşma başlangıcında sistem sorgusu yapmak.
 */
let cachedCatalog: Promise<CatalogVoice[]> | null = null;

export function getVoiceCatalog(): Promise<CatalogVoice[]> {
  if (!cachedCatalog) {
    cachedCatalog = Speech.getAvailableVoicesAsync()
      .then(rankVoices)
      .catch(() => []);
  }
  return cachedCatalog;
}
