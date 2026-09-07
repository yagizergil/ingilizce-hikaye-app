export interface ReaderParagraph {
  id: string;
  paragraphIndex: number;
  text: string;
}

export interface ReaderChapter {
  id: string;
  bookId: string;
  sectionIndex: number;
  title: string | null;
  wordCount: number | null;
  paragraphs: ReaderParagraph[];
  nextChapterId: string | null;
}

export type ReaderFontFamily = "serif" | "sans";

export interface ReaderSettings {
  fontScale: number;
  lineHeightScale: number;
  fontFamily: ReaderFontFamily;
  marginScale: number;
  pageTransitionMs: number;
  highlightsEnabled: boolean;
}

/**
 * Reader etkileşim yükleri.
 *
 * Bu üç tip daha önce artık render edilmeyen WebView okuma yolunun
 * (`components/ReaderWebView.tsx` + `webview/`) içinde tanımlıydı; o yol
 * silinirken buraya taşındı. Native sayfalama yolu (`PaginatedReaderView`)
 * bunları üretiyor ve tüketiyor.
 */

/** Okurken bir kelimeye dokunulduğunda üretilen yük. */
export interface ReaderWordTapPayload {
  surface: string;
  lemma: string;
  paragraphId: string | null;
  sentenceText: string;
  tapMs: number;
  /**
   * Dokunulan kelimenin `sentenceText` içindeki karakter konumu. Tüketici
   * tarafın `surface`'i cümlede arayarak yanlış eşleşme bulmasını önler
   * (örn. "a" kelimesine dokunulduğunda "heard" içindeki "a"ya denk gelmesi).
   */
  sentenceCharOffset?: number;
}

/** Okuma pozisyonu ilerledikçe raporlanan yük. */
export interface ReaderPositionUpdatePayload {
  paragraphId: string;
  charOffset: number;
  percent: number;
}

/** Bölüm açılırken geri yüklenecek kayıtlı pozisyon. */
export interface ReaderRestorePosition {
  paragraphId: string;
  charOffset: number;
}
