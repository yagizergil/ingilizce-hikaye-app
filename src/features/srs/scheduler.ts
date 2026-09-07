/**
 * SM-2 aralıklı tekrar planlayıcısı.
 *
 * Saf fonksiyon: girdi kartın mevcut durumu + kullanıcının değerlendirmesi,
 * çıktı kartın yeni durumu. Ağ, saat, veritabanı yok — bu yüzden tam olarak
 * test edilebiliyor. Şu anki zaman dışarıdan veriliyor (`now`), böylece
 * testler sabit bir tarihle çalışabiliyor.
 *
 * NEDEN SM-2, FSRS DEĞİL: `srs_cards` tablosu her ikisinin alanlarını da
 * taşıyor. FSRS ölçülebilir biçimde daha iyi planlama yapar ama parametre
 * uydurma için binlerce tekrar verisi ister — bugün sıfır var. Veri
 * birikince geçiş yapılabilir; `stability`/`difficulty` sütunları o güne
 * kadar boş kalıyor. Bkz. docs/plans/2026-09-07-eksik-katmanlar-design.md.
 */

/**
 * Kullanıcının bir kart için verdiği cevap.
 *
 * Anki'nin dört düğmesi yeni kullanıcı için fazla; üçe indirildi. Sayısal
 * değerler SM-2'nin 0-5 ölçeğine denk geliyor: `again` başarısızlık eşiğinin
 * altında, `hard` zar zor hatırlama, `easy` rahat hatırlama.
 */
export type SrsRating = "again" | "hard" | "easy";

export const RATING_SCORE: Record<SrsRating, number> = {
  again: 0,
  hard: 3,
  easy: 5,
};

/** Kartın planlamayı etkileyen durumu. */
export interface SrsCardState {
  /** Kaç kez üst üste doğru hatırlandı. Başarısızlıkta sıfırlanır. */
  repetitions: number;
  /** Bir sonraki tekrara kaç gün var. */
  intervalDays: number;
  /** SM-2 kolaylık çarpanı. 1.3 alt sınır. */
  ease: number;
  /** Kaç kez unutuldu. Yalnızca istatistik/raporlama için. */
  lapses: number;
}

export interface SrsScheduleResult extends SrsCardState {
  /** Kartın bir sonraki gösterim zamanı. */
  dueAt: Date;
}

/** Yeni oluşturulan bir kartın başlangıç durumu. */
export const NEW_CARD: SrsCardState = {
  repetitions: 0,
  intervalDays: 0,
  ease: 2.5,
  lapses: 0,
};

/**
 * SM-2'nin alt sınırı. Bunun altına inen kartlar pratikte her gün geri
 * gelir ve kullanıcıyı bunaltır.
 */
const MIN_EASE = 1.3;

/**
 * Aynı gün içinde tekrar gösterim için kullanılan gecikme (gün cinsinden).
 * `again` cevabında kart tamamen başa döner ama hemen değil — 10 dakika
 * sonra. Aksi halde kullanıcı aynı kelimeyi arka arkaya görür ve bu
 * hatırlama değil kopyalama olur.
 */
const AGAIN_DELAY_DAYS = 10 / (60 * 24);

/** İlk iki başarılı tekrarın sabit aralıkları (SM-2 tanımı). */
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 6;

/** "Zor" cevabında ikinci tekrarın aralığı — "kolay"ın 6 gününden kısa. */
const SECOND_INTERVAL_DAYS_HARD = 4;

/**
 * "Zor" cevabında aralık bu çarpanla büyür (ease ile DEĞİL).
 *
 * Saf SM-2'de "zor" da ease çarpanını kullanır, bu da 30 günlük bir kartı
 * "zor" cevabına rağmen 42 güne çıkarır — kullanıcı zorlandığını söylemişken
 * kartı daha da seyrekleştirmek yanlış. Anki'nin davranışını izleyerek
 * "zor" sabit ve küçük bir büyüme veriyor.
 */
const HARD_INTERVAL_MULTIPLIER = 1.2;

/**
 * Bir kartın üst sınırı. SM-2 teorik olarak sınırsız büyür; 365 günün
 * ötesindeki bir aralık bu ürün için anlamsız (kullanıcı o kelimeyi zaten
 * kitaplarda görüyor) ve "bir daha asla görmem" hissi veriyor.
 */
const MAX_INTERVAL_DAYS = 365;

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Kartın bir değerlendirmeden sonraki yeni durumunu hesaplar.
 *
 * @param card Kartın mevcut durumu.
 * @param rating Kullanıcının cevabı.
 * @param now Şu anki zaman (test edilebilirlik için dışarıdan verilir).
 */
export function scheduleCard(
  card: SrsCardState,
  rating: SrsRating,
  now: Date,
): SrsScheduleResult {
  const score = RATING_SCORE[rating];

  // SM-2 kolaylık güncellemesi. Formül orijinaliyle aynı; `easy` (5) ease'i
  // yükseltiyor, `hard` (3) düşürüyor, `again` (0) sert düşürüyor.
  const nextEase = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)),
  );

  if (rating === "again") {
    return {
      repetitions: 0,
      intervalDays: 0,
      ease: nextEase,
      lapses: card.lapses + 1,
      dueAt: addDays(now, AGAIN_DELAY_DAYS),
    };
  }

  const repetitions = card.repetitions + 1;

  let intervalDays: number;
  if (repetitions === 1) {
    intervalDays = FIRST_INTERVAL_DAYS;
  } else if (repetitions === 2) {
    intervalDays = rating === "hard" ? SECOND_INTERVAL_DAYS_HARD : SECOND_INTERVAL_DAYS;
  } else if (rating === "hard") {
    intervalDays = Math.max(
      FIRST_INTERVAL_DAYS,
      card.intervalDays * HARD_INTERVAL_MULTIPLIER,
    );
  } else {
    intervalDays = card.intervalDays * nextEase;
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.round(intervalDays * 100) / 100);

  return {
    repetitions,
    intervalDays,
    ease: Math.round(nextEase * 1000) / 1000,
    lapses: card.lapses,
    dueAt: addDays(now, intervalDays),
  };
}

/**
 * Kartın hangi öğrenme aşamasında olduğunu döndürür. Kelimelerim ekranındaki
 * rozet ve istatistikler bunu kullanıyor.
 *
 * - `new`: hiç çalışılmadı.
 * - `learning`: ilk iki başarılı tekrarın içinde ya da yakın zamanda unutuldu.
 * - `known`: 21 günün üstünde bir aralığa ulaştı — uzun süreli belleğe geçmiş
 *   sayılıyor (SRS literatüründe yaygın olarak kullanılan "mature" eşiği).
 */
export function cardStage(card: SrsCardState): "new" | "learning" | "known" {
  if (card.repetitions === 0) return "new";
  if (card.intervalDays >= 21) return "known";
  return "learning";
}
