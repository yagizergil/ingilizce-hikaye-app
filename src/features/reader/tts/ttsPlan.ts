import { tokenize } from "@/features/reader/text/tokenizer";

import type { Page } from "@/features/reader/pagination/types";
import type { ReaderChapter } from "@/features/reader/types";
import type { Token } from "@/features/reader/text/tokenizer";

/**
 * Sesli okumanın SAF mantığı: sayfadaki metni konuşulacak parçalara böler
 * ve seslendiricinin bildirdiği karakter konumunu ekrandaki kelimeye
 * eşler.
 *
 * NEDEN AYRI VE SAF: bu eşleme yanlış olursa vurgu sesin bir kelime
 * gerisinde ya da ilerisinde kalır — özelliği kullanılamaz yapan tam olarak
 * budur. Cihaz API'sinden ayrı tutulduğu için tarih/olay verilerek test
 * edilebiliyor.
 *
 * NEDEN SAYFA SLICE'I KONUŞULUYOR, PARAGRAFIN TAMAMI DEĞİL: bir paragraf
 * iki sayfaya bölünebiliyor. Paragrafın tamamı konuşulsaydı ses ekranda
 * görünmeyen metne devam eder, vurgu sayfanın dışına taşardı. Konuşulan
 * metin her zaman ekranda duran metnin ta kendisi.
 */

export interface SpeechWord {
  /** Konuşulan metin içindeki başlangıç konumu (dahil). */
  start: number;
  /** Bitiş konumu (hariç). */
  end: number;
}

export interface SpeechSegment {
  paragraphId: string;
  /**
   * Sayfa parçasının paragraf içindeki başlangıcı.
   *
   * Anahtara giriyor çünkü aynı paragrafın iki farklı sayfadaki parçası
   * kendi içinde 0'dan başlayan token konumlarına sahip — bu alan olmadan
   * iki farklı kelime aynı anahtarı üretirdi.
   */
  segmentCharStart: number;
  /** Seslendiriciye verilecek metin. Ekranda duranla birebir aynı. */
  text: string;
  /** Metin içindeki kelime aralıkları, artan sırada. */
  words: SpeechWord[];
}

/**
 * Bir kelimenin benzersiz anahtarı. `ReaderPage` aynı formülü kullanarak
 * kendi token'ının anahtarını üretiyor; ikisi eşleştiğinde o kelime
 * vurgulanıyor.
 */
export function wordKey(paragraphId: string, segmentCharStart: number, tokenStart: number): string {
  return `${paragraphId}:${segmentCharStart}:${tokenStart}`;
}

/** Sayfadaki her parçayı, konuşulacak metne ve kelime aralıklarına çevirir. */
export function buildPageSpeech(
  page: Page,
  paragraphs: ReaderChapter["paragraphs"],
): SpeechSegment[] {
  const byId = new Map(paragraphs.map((paragraph) => [paragraph.id, paragraph]));
  const segments: SpeechSegment[] = [];

  for (const segment of page.segments) {
    const paragraph = byId.get(segment.paragraphId);
    if (!paragraph) continue;

    const text = paragraph.text.slice(segment.charStart, segment.charEnd);
    // Yalnızca boşluk/noktalama içeren bir parçayı konuşmanın anlamı yok ve
    // bazı platformlarda boş metin hiç `onDone` üretmiyor — zincir orada
    // sessizce dururdu.
    const words = tokenize(text)
      .filter((token: Token) => token.type === "word")
      .map((token: Token) => ({ start: token.start, end: token.end }));

    if (words.length === 0) continue;

    segments.push({
      paragraphId: segment.paragraphId,
      segmentCharStart: segment.charStart,
      text,
      words,
    });
  }

  return segments;
}

/**
 * Seslendiricinin bildirdiği karakter konumunu, o konumu İÇEREN kelimenin
 * başlangıcına çevirir.
 *
 * NEDEN "İÇEREN" VE NEDEN null DÖNEBİLİYOR: sınır olayları normalde tam
 * kelime başlangıcında geliyor, ama platformlar kısaltma ve noktalama
 * çevresinde metnin ortasından da haber verebiliyor. En yakın önceki
 * kelimeye yuvarlamak yerine null dönüyoruz; çağıran bu durumda vurguyu
 * OLDUĞU YERDE bırakıyor. Yanlış kelimeyi yakıp söndürmektense bir olayı
 * atlamak daha az rahatsız edici.
 *
 * İkili arama: bir sayfada ~300 kelime var ve olay saniyede birkaç kez
 * geliyor; doğrusal tarama da yeterdi ama bu ölçüde bile bedava.
 */
export function findWordStart(words: SpeechWord[], charIndex: number): number | null {
  let low = 0;
  let high = words.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const word = words[mid];
    if (!word) return null;

    if (charIndex < word.start) {
      high = mid - 1;
    } else if (charIndex >= word.end) {
      low = mid + 1;
    } else {
      return word.start;
    }
  }

  return null;
}
