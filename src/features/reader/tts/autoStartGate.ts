/**
 * "Dinle" ile gelindiğinde seslendirmenin ne zaman başlayabileceği.
 *
 * NEDEN AYRI VE SAF BİR MODÜL: bu kural bir kez yanlış yazıldı ve sonuç
 * sessiz bir hataydı — düğmeye basılıyor, hiçbir şey olmuyordu. Sebebi tek
 * bir eksik koşuldu; saf fonksiyon olarak yazılınca her koşul tek tek test
 * edilebiliyor.
 *
 * HATANIN KENDİSİ (2026-09-08): otomatik başlatma yalnızca ERİŞİM kararını
 * bekliyordu. Ama imzalı bağlantı geldiği anda:
 *  - zaman işaretleri dosyası HENÜZ İNMEMİŞ oluyor (o sorgu ancak imzalı
 *    bağlantı gelince başlıyor), yani vurgulanacak kelime listesi boş;
 *  - mp3 HENÜZ YÜKLENMEMİŞ oluyor (`useAudioPlayer` kaynağı o render'da
 *    alıyor), ve yüklenmemiş bir oynatıcıda `play()` sessizce hiçbir şey
 *    yapmıyor.
 * İkisi de hata fırlatmıyor. Kullanıcının gördüğü tek şey, çalışmayan bir
 * düğme oluyordu.
 */
export interface AutoStartReadiness {
  /** Kullanıcı "Dinle" ile geldi mi (ve ekran sayfalamayı bitirdi mi). */
  requested: boolean;
  /** Erişim onaylandı ve imzalı bağlantı elde mi. */
  available: boolean;
  /** Kelime zaman işaretleri indi mi (vurgu bunsuz çalışmaz). */
  timingsReady: boolean;
  /** Ses dosyası yüklendi mi (`play()` bunsuz sessizce başarısız olur). */
  playerLoaded: boolean;
}

/** Çalmayı başlatmak için gereken her şey hazır mı. */
function machineryReady(readiness: AutoStartReadiness): boolean {
  return readiness.available && readiness.timingsReady && readiness.playerLoaded;
}

/**
 * Şimdi başlatılmalı mı.
 *
 * `alreadyStarted` AYRI BİR PARAMETRE, nesnenin içinde değil: çağıran taraf
 * onu bir ref'te tutuyor ve ref'i render sırasında okumak React kuralına
 * takılıyor. Ayırmak, `isAwaitingAutoStart`'ın render sırasında güvenle
 * çağrılabilmesini sağlıyor.
 */
export function shouldAutoStart(readiness: AutoStartReadiness, alreadyStarted: boolean): boolean {
  return readiness.requested && !alreadyStarted && machineryReady(readiness);
}

/**
 * "Dinle" istendi ama daha başlayamıyor — ekranda bir bekleme işareti
 * gösterilmeli.
 *
 * NEDEN `alreadyStarted`'A BAKMIYOR: kullanıcı başladıktan sonra
 * duraklatırsa `requested` hâlâ true kalıyor. Eğer bu fonksiyon
 * "başlatılmadı mı" diye sorsaydı, duraklatılmış bir seslendirme sonsuza
 * kadar "hazırlanıyor" görünürdü. Doğru soru "makine hazır mı" —
 * duraklatma anında hazır olduğu için gösterge çıkmıyor.
 */
export function isAwaitingAutoStart(readiness: AutoStartReadiness): boolean {
  return readiness.requested && !machineryReady(readiness);
}
