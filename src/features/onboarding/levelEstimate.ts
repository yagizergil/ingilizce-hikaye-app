/**
 * Seviye tespiti testinin puanlaması.
 *
 * Saf fonksiyon: girdi kullanıcının cevapları, çıktı tahmini kelime
 * dağarcığı ve CEFR seviyesi. Ağ ve saat yok — tam test edilebilir.
 *
 * YÖNTEM: Meara'nın Yes/No kelime tanıma testi ailesinden. Her CEFR
 * bandından rastgele kelime gösterilir; bandın bilinme oranı, o bandın
 * tamamının ne kadarının bilindiğinin tahminidir.
 *
 * BİLİNEN ZAYIFLIK: insanlar bilmedikleri kelimeye "biliyorum" der
 * (over-claiming). Klasik çözüm sözde-kelime serpiştirmektir; öyle bir
 * liste yok. Bunun yerine üç seçenekli cevap kullanılıyor ve "emin değilim"
 * yarım ağırlık alıyor. Sonuç kesin bir hüküm değil, kullanıcının tek
 * dokunuşla değiştirebildiği bir başlangıç noktası olarak sunuluyor.
 */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Kullanıcının bir kelimeye verdiği cevap. */
export type WordAnswer = "known" | "unsure" | "unknown";

/**
 * Cevapların puan ağırlıkları. "Emin değilim" bilerek yarım sayılıyor:
 * şişirmeye karşı muhafazakâr davranıyoruz.
 */
export const ANSWER_WEIGHT: Record<WordAnswer, number> = {
  known: 1,
  unsure: 0.5,
  unknown: 0,
};

/**
 * Her CEFR bandındaki toplam kelime sayısı (canlı `lemma_canonical`
 * sayımından, 2026-09-07).
 *
 * Bu sayılar tahmini dağarcığı ölçeklendirmek için kullanılıyor: bir bandın
 * %60'ını bilen kullanıcı o bandın 0,6 katı kelimesini biliyor sayılıyor.
 * Sözlük büyüdükçe bu sabitler güncellenmeli — bu yüzden tek yerde ve
 * yorumlu duruyorlar.
 */
export const BAND_SIZE: Record<CefrLevel, number> = {
  A1: 910,
  A2: 1085,
  B1: 1899,
  B2: 2038,
  C1: 667,
  C2: 552,
};

/**
 * Bir bandın "geçilmiş" sayılması için gereken bilinme oranı.
 *
 * %80 dil öğretiminde yaygın kullanılan eşik: bir metnin kelimelerinin
 * %80'ini bilmek, kalanları bağlamdan çıkarabilmenin alt sınırı sayılıyor.
 */
const BAND_PASS_RATIO = 0.8;

export interface BandResult {
  level: CefrLevel;
  /** O banttan sorulan kelime sayısı. */
  asked: number;
  /** Ağırlıklı doğru sayısı (0 ile `asked` arası). */
  score: number;
  /** `score / asked`. Hiç sorulmadıysa 0. */
  ratio: number;
}

export interface LevelEstimate {
  /** Tahmini seviye. Hiçbir bant geçilemezse "A1". */
  level: CefrLevel;
  /** Tahmini bilinen kelime sayısı. */
  estimatedSize: number;
  bands: BandResult[];
}

/** Bir soru: hangi kelime, hangi bant. */
export interface LevelTestItem {
  lemma: string;
  level: CefrLevel;
  trGloss: string | null;
}

/**
 * Cevapları puanlar.
 *
 * @param items Sorulan kelimeler (sırası önemsiz).
 * @param answers Kelime → cevap eşlemesi. Cevaplanmamış kelime "unknown"
 *   sayılır — kullanıcı testi yarıda bırakırsa sonuç yine üretilebilir.
 */
export function estimateLevel(
  items: LevelTestItem[],
  answers: Record<string, WordAnswer>,
): LevelEstimate {
  const bands: BandResult[] = CEFR_LEVELS.map((level) => {
    const bandItems = items.filter((item) => item.level === level);
    const score = bandItems.reduce(
      (total, item) => total + ANSWER_WEIGHT[answers[item.lemma] ?? "unknown"],
      0,
    );
    return {
      level,
      asked: bandItems.length,
      score,
      ratio: bandItems.length > 0 ? score / bandItems.length : 0,
    };
  });

  // Tahmini dağarcık: her bandın bilinme oranı × o bandın büyüklüğü.
  const estimatedSize = Math.round(
    bands.reduce((total, band) => total + band.ratio * BAND_SIZE[band.level], 0),
  );

  // Seviye: eşiği geçen EN YÜKSEK ardışık bant. "Ardışık" önemli — B2'yi
  // şans eseri geçip B1'de kalan biri B1'dir, B2 değil.
  let level: CefrLevel = "A1";
  for (const band of bands) {
    if (band.asked > 0 && band.ratio >= BAND_PASS_RATIO) {
      level = band.level;
    } else {
      break;
    }
  }

  return { level, estimatedSize, bands };
}

/**
 * Tahmin edilen seviyeye göre okumaya başlanacak seviyeyi döndürür.
 *
 * Kullanıcıyı tam kendi seviyesinde bir kitaba göndermek yerine BİR ALT
 * seviyeden başlatıyoruz: yabancı dilde okumanın akıcı olması için
 * kelimelerin çok büyük çoğunluğunun tanıdık olması gerekiyor. Kendi
 * seviyesinde bir metin "çalışma", bir alt seviyedeki metin "okuma"dır —
 * ve bu uygulamanın vaadi okuma.
 */
export function readingLevelFor(level: CefrLevel): CefrLevel {
  const index = CEFR_LEVELS.indexOf(level);
  return CEFR_LEVELS[Math.max(0, index - 1)] ?? "A1";
}
