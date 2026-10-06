import { useMemo } from "react";

import { useLibraryBooksQuery } from "@/features/library";
import { useOnboardingStatusQuery } from "@/features/onboarding";
import { useCurrentlyReadingQuery } from "@/features/home/api/useCurrentlyReadingQuery";
import { useFinishedBookIdsQuery } from "@/features/home/api/useFinishedBookIdsQuery";

import type { Book } from "@/features/library/types";

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
/** İlk oturumda "kısa" kabul edilen okuma süresi (dakika). */
const SHORT_READ_MINUTES = 15;

/**
 * Ana sayfadaki "Senin için" önerisi: kullanıcının onboarding seviyesine
 * uygun, kısa, henüz başlamadığı/bitirmediği bir kitap.
 *
 * NEDEN (2026-10-05, ilk-kullanıcı denetimi): yeni kullanıcı ana sayfadan
 * bir kitaba ulaşmak için Ara'ya gidip çiplerden seçmek, detayı açmak ve
 * okumaya basmak zorundaydı -- motivasyonun en yüksek olduğu anda en az üç
 * dokunuş ve bir karar. Öneri istemcide, mevcut katalogdan türetiliyor.
 *
 * Sıralama: aynı seviye > bir alt seviye; kısa (≤15 dk) önce; yeni ve
 * popüler öne; en sonda kısa süre.
 */
export function useRecommendedBook(): Book | null {
  const { data: books } = useLibraryBooksQuery();
  const { data: onboarding } = useOnboardingStatusQuery();
  const { data: currentlyReading } = useCurrentlyReadingQuery();
  const { data: finished } = useFinishedBookIdsQuery();
  const targetLevel = onboarding?.targetLevel ?? null;

  return useMemo(() => {
    if (!books || books.length === 0) return null;
    const started = new Set((currentlyReading ?? []).map((item) => item.book.id));
    const levelIndex = targetLevel ? CEFR_ORDER.indexOf(targetLevel) : -1;

    const score = (book: Book): number => {
      const index = CEFR_ORDER.indexOf(book.level);
      let value = 0;
      if (levelIndex >= 0) {
        if (index === levelIndex) value += 100;
        else if (index === levelIndex - 1) value += 70;
        else if (index > levelIndex) value -= 50;
      }
      if (book.estimatedMinutes <= SHORT_READ_MINUTES) value += 30;
      if (book.isNew) value += 10;
      if (book.isPopular) value += 10;
      return value - book.estimatedMinutes / 100;
    };

    const candidates = books.filter(
      (book) => !started.has(book.id) && !(finished?.has(book.id) ?? false),
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, book) => (score(book) > score(best) ? book : best));
  }, [books, currentlyReading, finished, targetLevel]);
}
