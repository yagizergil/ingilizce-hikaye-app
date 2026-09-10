/**
 * Seslendirme yeniden başlatılırken sesin nereden devam edeceği.
 *
 * ÇÖZÜLEN HATA (2026-09-10): kullanıcı bir kelimeye dokunup sözlüğe
 * baktıktan sonra seslendirmeyi sürdürdüğünde ses SAYFANIN BAŞINA
 * dönüyordu. Kural şuydu:
 *
 *     if (Math.abs(currentTime - sayfaninIlkKelimesi) > 1.5) seek(ilk)
 *
 * Bu kuralın amacı "kullanıcı elle sayfa çevirdiyse ses de oraya atlasın"
 * idi ve o amaç doğru. Ama kural iki farklı durumu ayırt edemiyordu:
 *
 *   - Kullanıcı BAŞKA bir sayfaya geçti  -> sesin oraya atlaması gerekir.
 *   - Kullanıcı AYNI sayfanın ortasında duraklattı -> sesin olduğu yerde
 *     kalması gerekir.
 *
 * İkincisinde `currentTime` sayfanın ilk kelimesinden doğal olarak
 * uzaktır (sayfanın ortasındasınızdır), yani eşik her zaman aşılıyor ve
 * her devam ettirme sayfayı baştan okutuyordu.
 *
 * DOĞRU SORU mesafe değil, KAPSAMA: ses hâlâ bu sayfanın zaman aralığında
 * mı? Aralıktaysa dokunma; dışındaysa sayfanın başına al.
 */
export interface ResumeSeekInput {
  /** Oynatıcının şu anki konumu (saniye). */
  currentTime: number;
  /** Ekranda duran sayfanın ilk kelimesinin zamanı. */
  pageStartTime: number;
  /**
   * Sayfanın bittiği an — bir sonraki sayfanın ilk kelimesinin zamanı
   * (`pageTurnTimeAfter`). Bölümün son sayfasındaysak null: sayfa sesin
   * sonuna kadar sürüyor demektir.
   */
  pageEndTime: number | null;
}

/**
 * Devam etmeden önce atlanacak konum; atlamaya gerek yoksa null.
 */
export function resumeSeekTarget({
  currentTime,
  pageStartTime,
  pageEndTime,
}: ResumeSeekInput): number | null {
  const beforePage = currentTime < pageStartTime;
  const afterPage = pageEndTime !== null && currentTime >= pageEndTime;

  // Ses bu sayfanın aralığında: kullanıcı burada duraklatmıştı, kaldığı
  // yerden devam etmeli.
  if (!beforePage && !afterPage) return null;

  // Ses başka bir yerde: kullanıcı sayfayı elle çevirmiş. Sesi ekranda
  // duran sayfaya taşı.
  return pageStartTime;
}
