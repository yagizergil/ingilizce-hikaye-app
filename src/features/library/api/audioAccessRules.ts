/**
 * Stüdyo seslendirmesine erişimin istemci tarafı yorumu (migration 110).
 *
 * SAF MODÜL (Supabase importu yok, Jest doğrudan import ediyor).
 *
 * KURAL BURADA TANIMLANMIYOR: "ücretsiz bölüm hangisi" sorusunun cevabı
 * sunucudaki `free_audio_section_id()`'den, "tam erişim var mı" sorusunun
 * cevabı `can_play_book_audio()`'dan geliyor. Burası yalnızca iki cevabı
 * birleştiriyor. Asıl kapı yine sunucuda (`chapter-audio` ->
 * `can_play_section_audio()`); buradaki karar yanlış olsa bile ödemeyen
 * kullanıcı kilitli bir bölümü dinleyemez, yalnızca düğme yanlış görünür.
 */
export interface BookAudioAccess {
  /** Kitabın TÜM bölümlerinin sesi açık mı (aktif premium). */
  canPlay: boolean;
  /**
   * Premium olmadan dinlenebilen bölüm (kitabın ilk seslendirilmiş bölümü).
   * Sunucu fonksiyonu henüz canlıda değilse ya da kitapta ses yoksa null;
   * o durumda davranış eskisiyle aynı (premium olmayana kilitli).
   */
  freeSectionId: string | null;
}

/** Fonksiyon veritabanında henüz yok (PostgREST PGRST202 / Postgres 42883). */
export function isMissingFunctionError(
  error: { code?: string | null } | null | undefined,
): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}

/** Bu bölümün sesi bu kullanıcıya açık mı. Erişim bilinmiyorsa false. */
export function canListenToSection(
  access: BookAudioAccess | undefined,
  sectionId: string | null | undefined,
): boolean {
  if (!access) return false;
  if (access.canPlay) return true;
  return Boolean(sectionId) && sectionId === access.freeSectionId;
}

export type BookAudioCardState = "unlocked" | "firstChapterFree" | "locked";

/** Kitap detayındaki seslendirme kartının hangi metni göstereceği. */
export function bookAudioCardState(access: BookAudioAccess): BookAudioCardState {
  if (access.canPlay) return "unlocked";
  return access.freeSectionId ? "firstChapterFree" : "locked";
}

/**
 * Okuyucudaki dinle yuvarlağı kilitli mi (2026-10-06 kararı + 2026-10-31
 * ücretsiz bölüm 1).
 *
 * - Bölümde stüdyo sesi yoksa hap zaten yok: false.
 * - Premium durumu bilinmiyorsa (undefined) kilit gösterilmiyor (eskisiyle
 *   aynı).
 * - Premium değilse: bölüm ücretsiz bölümse açık, değilse kilitli. Erişim
 *   cevabı henüz gelmediyse kilitli kalıyor: ücretsiz olmayan bölümlerde
 *   eski davranış (anında kilit) bozulmasın. Cevap kitap detayından
 *   genellikle önbellekte hazır geliyor.
 */
export function isReaderListenLocked(input: {
  hasStudioAudio: boolean;
  isPremium: boolean | undefined;
  access: BookAudioAccess | undefined;
  sectionId: string | null | undefined;
}): boolean {
  if (!input.hasStudioAudio) return false;
  if (input.isPremium !== false) return false;
  return !canListenToSection(input.access, input.sectionId);
}
