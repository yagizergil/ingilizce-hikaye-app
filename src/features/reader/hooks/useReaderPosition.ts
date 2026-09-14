import { useEffect, useMemo, useRef, useState } from "react";

import {
  flushPendingProgress,
  persistReadingProgress,
  useInitialReadingProgress,
  useReadingProgressMutation,
} from "@/features/reader/api/useReadingProgressMutation";

import type {
  ReaderChapter,
  ReaderPositionUpdatePayload,
  ReaderRestorePosition,
} from "@/features/reader/types";

const SAVE_DEBOUNCE_MS = 1500;

interface UseReaderPositionResult {
  /** Position to hand to ReaderWebView's `restorePosition` prop. `null`
   * while the initial-progress query hasn't resolved yet, or when there is
   * no saved position for this chapter (fresh start, first paragraph). */
  restorePosition: ReaderRestorePosition | null;
  /** Call this from ReaderWebView's `onPositionUpdate` callback. */
  handlePositionUpdate: (payload: ReaderPositionUpdatePayload) => void;
}

/**
 * Ephemeral per-chapter-session position tracking. This intentionally uses
 * a plain hook + ref + setTimeout debounce rather than adding a Zustand
 * store: ADR-003's Zustand guidance
 * covers persisted cross-render UI *preferences*, not a value that's
 * meaningless outside the currently-open WebView session and is never read
 * by any other component.
 *
 * Cross-session resume is paragraph-granularity only (see
 * useInitialReadingProgress) — the initial `restorePosition.charOffset` is
 * always 0, and `paragraphId` is derived by looking up the chapter's
 * paragraph whose `paragraphIndex` matches the stored `paragraph_index`.
 */
export function useReaderPosition(
  bookId: string,
  chapterId: string,
  chapter: ReaderChapter | undefined,
): UseReaderPositionResult {
  const { data: initialProgress } = useInitialReadingProgress(bookId, chapterId);
  const { mutate } = useReadingProgressMutation();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Zamanlayıcı henüz ateşlemediyse yazılmayı bekleyen kayıt. */
  const pendingRef = useRef<Parameters<typeof persistReadingProgress>[0] | null>(null);
  const [currentPosition, setCurrentPosition] = useState<ReaderPositionUpdatePayload | null>(null);

  useEffect(() => {
    void flushPendingProgress();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      /**
       * ÇÖZÜLEN HATA: burada zamanlayıcı yalnızca İPTAL ediliyordu. Sayfayı
       * çevirip 1,5 saniye dolmadan geri çıkan kullanıcının okuması hiç
       * kaydedilmiyordu -- "şu an okunuyor" rafı bu yüzden boş kalıyordu.
       * Bekleyen kayıt artık iptal değil, GÖNDERİLİYOR.
       */
      if (pendingRef.current) {
        const pending = pendingRef.current;
        pendingRef.current = null;
        void persistReadingProgress(pending);
      }
    };
  }, []);

  // Reset the in-session position whenever the chapter changes so a stale
  // position from the previous chapter can't leak into this one.
  // Bolum degisince pozisyonun sifirlanmasi kasitli (yukaridaki yoruma bakin).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPosition(null);
  }, [chapterId]);

  const restorePosition = useMemo<ReaderRestorePosition | null>(() => {
    if (currentPosition) {
      return { paragraphId: currentPosition.paragraphId, charOffset: currentPosition.charOffset };
    }
    if (!chapter || !initialProgress) return null;

    const paragraph = chapter.paragraphs.find(
      (candidate) => candidate.paragraphIndex === initialProgress.paragraphIndex,
    );
    if (!paragraph) return null;

    return { paragraphId: paragraph.id, charOffset: 0 };
  }, [currentPosition, chapter, initialProgress]);

  const handlePositionUpdate = (payload: ReaderPositionUpdatePayload) => {
    setCurrentPosition(payload);

    if (!chapter) return;
    const paragraph = chapter.paragraphs.find((candidate) => candidate.id === payload.paragraphId);
    if (!paragraph) return;

    /**
     * `payload.percent` 0..1 ARASI BİR ORAN (bkz. PaginatedReaderView'deki
     * `pageIndex / (pages - 1)`), veritabanındaki sütun ise yüzde.
     * `Math.round` doğrudan uygulanınca her sayfa 0, son sayfa 1 olarak
     * yazılıyordu -- yani ilerleme çubukları ve "%50" etiketleri hep sıfır
     * gösteriyordu. Orantı önce yüzdeye çevriliyor.
     */
    const percent = Math.min(100, Math.max(0, Math.round(payload.percent * 100)));

    const next = {
      bookId,
      chapterId,
      paragraphIndex: paragraph.paragraphIndex,
      percent,
    };
    pendingRef.current = next;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pendingRef.current = null;
      mutate(next);
    }, SAVE_DEBOUNCE_MS);
  };

  return { restorePosition, handlePositionUpdate };
}
