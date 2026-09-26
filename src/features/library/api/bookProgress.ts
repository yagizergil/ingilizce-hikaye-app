export interface ProgressSection {
  id: string;
}

export interface ProgressRow {
  section_id: string | null;
  /** Şu anki BÖLÜMÜN içindeki ilerleme, 0-100 (kitabın değil). */
  percent: number;
  finished_at?: string | null;
}

export interface BookProgress {
  /** Kitabın TAMAMI için tamamlanma yüzdesi, 0-100. */
  percent: number;
  hasStarted: boolean;
  isFinished: boolean;
  /** Okunan bölümün listedeki sırası (0 tabanlı); bilinmiyorsa null. */
  currentPosition: number | null;
}

/**
 * Kitap düzeyinde ilerleme.
 *
 * KULLANICI BULGUSU (2026-09-26): `user_book_progress.percent` şu anki
 * BÖLÜMÜN içindeki ilerleme (sayfa / toplam sayfa); ama kitap ekranında ve
 * "Şu an okunuyor" rafında kitabın tamamlanma oranı gibi gösteriliyordu.
 * Çok bölümlü bir kitabın ilk bölümünün sonuna gelen kullanıcı "%100
 * tamamlandı" görüyordu. Sütunun anlamı (bölüm içi) bilerek korunuyor --
 * mevcut satırlar o anlamda yazılmış -- kitap yüzdesi burada türetiliyor:
 * bitirilen bölümler + şu anki bölümün payı.
 *
 * Bitmemiş bir kitap %100 gösterilmiyor: %100 yalnızca kitap bitirildi
 * işaretlenince (son bölümün sonu) çıkıyor.
 */
export function computeBookProgress(
  sections: ProgressSection[],
  row: ProgressRow | null,
): BookProgress {
  if (!row) return { percent: 0, hasStarted: false, isFinished: false, currentPosition: null };

  if (row.finished_at != null) {
    return { percent: 100, hasStarted: true, isFinished: true, currentPosition: null };
  }

  const position = row.section_id
    ? sections.findIndex((section) => section.id === row.section_id)
    : -1;
  if (position < 0 || sections.length === 0) {
    return { percent: 0, hasStarted: false, isFinished: false, currentPosition: null };
  }

  const within = Math.min(100, Math.max(0, row.percent)) / 100;
  const percent = Math.min(99, Math.round(((position + within) / sections.length) * 100));
  return { percent, hasStarted: true, isFinished: false, currentPosition: position };
}
