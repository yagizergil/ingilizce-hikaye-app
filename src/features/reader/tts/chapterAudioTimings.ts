import { wordKey } from "@/features/reader/tts/ttsPlan";

import type { SpeechSegment } from "@/features/reader/tts/ttsPlan";

/**
 * `pipeline/scripts/generate_audio.py` tarafından üretilen zamanlama
 * dosyasının şekli.
 *
 * Alan adları tek harf çünkü dosya kelime başına bir kayıt tutuyor —
 * 63 hikâyede 127 bin kayıt. Uzun adlar dosyayı gereksiz büyütür ve bu
 * dosya her bölüm açılışında indiriliyor.
 */
export interface RawWordTiming {
  /** Paragrafın bölüm içindeki sırası (`book_paragraphs.order_index`). */
  p: number;
  /** Kelimenin paragraf metnindeki başlangıcı. */
  s: number;
  /** Bitişi (hariç). */
  e: number;
  /** Sesin başından itibaren geçen saniye. */
  t: number;
}

export interface ChapterAudioTimings {
  voice: string;
  words: RawWordTiming[];
}

/** Zaman sırasına dizilmiş, doğrudan vurguya çevrilebilir kelime. */
export interface TimedWord {
  /** `ttsPlan.wordKey` ile üretilmiş anahtar; ekrandaki token'la eşleşir. */
  key: string;
  /** Sesin başından itibaren saniye. */
  time: number;
}

/**
 * Sunucudan gelen zamanlamaları ekrandaki sayfa parçalarıyla eşleştirir.
 *
 * NEDEN DÖNÜŞTÜRME GEREKİYOR: zamanlama dosyası PARAGRAF koordinatlarında
 * (kaçıncı paragraf, paragrafın kaçıncı karakteri). Ekrandaki vurgu ise
 * SAYFA PARÇASI koordinatlarında çalışıyor (`ttsPlan.wordKey`), çünkü aynı
 * paragraf iki sayfaya bölünebiliyor ve her parça kendi içinde 0'dan
 * başlıyor. Bu fonksiyon aradaki çeviriyi yapıyor.
 *
 * Eşleşmeyen kelimeler sessizce atılıyor: bir kelime o an ekranda olmayan
 * bir parçaya aitse vurgulanacak bir şey yok demektir. Bu bir hata değil,
 * sayfalamanın doğal sonucu.
 */
export function mapTimingsToPage(
  timings: RawWordTiming[],
  segments: SpeechSegment[],
  paragraphIndexById: Map<string, number>,
): TimedWord[] {
  if (timings.length === 0 || segments.length === 0) return [];

  // Paragraf sırası -> o paragrafın bu sayfadaki parçaları.
  const byParagraphIndex = new Map<number, SpeechSegment[]>();
  for (const segment of segments) {
    const index = paragraphIndexById.get(segment.paragraphId);
    if (index === undefined) continue;
    const list = byParagraphIndex.get(index);
    if (list) list.push(segment);
    else byParagraphIndex.set(index, [segment]);
  }

  const result: TimedWord[] = [];

  for (const timing of timings) {
    const candidates = byParagraphIndex.get(timing.p);
    if (!candidates) continue;

    for (const segment of candidates) {
      const tokenStart = timing.s - segment.segmentCharStart;
      if (tokenStart < 0 || tokenStart >= segment.text.length) continue;

      // Parçanın kendi kelime listesinde gerçekten böyle bir kelime var mı.
      // Bu kontrol olmadan, paragrafın bu sayfada görünmeyen kısmına ait
      // bir kelime yanlış bir token'ı vurgulayabilirdi.
      const exists = segment.words.some((word) => word.start === tokenStart);
      if (!exists) continue;

      result.push({
        key: wordKey(segment.paragraphId, segment.segmentCharStart, tokenStart),
        time: timing.t,
      });
      break;
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Verilen ana ait kelimenin listedeki sırası — ikili arama.
 *
 * NEDEN İKİLİ ARAMA: bu fonksiyon oynatma sırasında saniyede birkaç kez
 * çağrılıyor ve liste bölüm başına binlerce kelime içerebiliyor. Doğrusal
 * tarama her karede listenin tamamını dolaşırdı.
 *
 * `time`'dan küçük veya eşit EN SON kelimenin sırasını döner; hiçbiri
 * başlamamışsa -1.
 */
export function findWordIndexAtTime(words: TimedWord[], time: number): number {
  let low = 0;
  let high = words.length - 1;
  let answer = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (words[mid]!.time <= time) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return answer;
}
