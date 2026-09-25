import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Onboarding'in GERÇEK içeriği: kitap zevki adımında gösterilecek kapaklar
 * ve ilk okuma adımındaki pasaj.
 *
 * NEDEN SAHTE/ÖRNEK İÇERİK DEĞİL: referans akışta kullanıcı daha
 * onboarding'deyken gerçek bir kitabı beğeniyor ve gerçek bir paragrafı
 * okuyor. Uydurma bir pasaj göstermek, sonra kütüphanede bambaşka bir şey
 * bulmak akışın verdiği sözü bozardı -- üstelik bizim zaten bu dillerde
 * yayında içeriğimiz var, uydurmaya gerek yok.
 *
 * TEK SORGU DEĞİL AMA TEK HOOK: kapaklar ve pasaj ayrı tablolardan
 * geliyor; ikisini tek hook'ta toplamak, onboarding'in "içerik hazır mı"
 * sorusunu tek yerden sormasını sağlıyor.
 */

export interface OnboardingBook {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  cefrLevel: string | null;
}

export interface OnboardingPassage {
  bookId: string;
  bookTitle: string;
  /** Okunacak paragraflar -- kısa tutuluyor, bu bir ders değil bir tadım. */
  paragraphs: string[];
}

export interface OnboardingContent {
  books: OnboardingBook[];
  passage: OnboardingPassage | null;
}

/** Kitap zevki adımında kaç kapak gösterilecek. Referansta 5 kitap seçiliyor. */
const TASTE_BOOK_COUNT = 12;

/** İlk okuma adımındaki paragraf sayısı -- referansta tek kısa paragraf. */
const PASSAGE_PARAGRAPH_COUNT = 2;

/**
 * Okuma pasajı için tercih sırası: kullanıcının seçtiği seviye, sonra daha
 * kolayı. İlk okuma deneyimi ZOR OLMAMALI -- referansın kendi metni de
 * "A1 · sana göre uyarlandı" etiketiyle geliyor.
 */
function levelsToTry(level: string | null): string[] {
  const ladder = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const index = level ? ladder.indexOf(level) : 0;
  if (index <= 0) return ["A1", "A2"];
  // Seçilen seviye ve bir altı: bir altı, ilk temasta güven veriyor.
  return [ladder[index - 1] as string, ladder[index] as string];
}

const LINGO_STUDIO_AUTHOR = "Lingo Studio";

/** Pasaj adayı olarak okunacak paragraf sayısı (ilk bölüm(ler)in başı). */
const PASSAGE_SCAN_LIMIT = 60;

/** "Güzel, uzun" bir paragrafın alt sınırı (karakter). */
const MIN_PROSE_LENGTH = 220;

/**
 * Bir paragrafın okunabilir DÜZYAZI olup olmadığı (saf, testli).
 *
 * KULLANICI BULGUSU (2026-09-25): ilk okuma adımı Frankenstein'ın mektup
 * başlığını ("To Mrs. Saville, England / St. Petersburgh, Dec. 11th, 17—")
 * gösteriyordu -- bölümün İLK iki paragrafı körü körüne alınıyordu. Başlık,
 * tarih, hitap ve bölüm adı satırları kısa, rakam içeren ya da cümle
 * noktalaması taşımayan satırlar; hepsi burada eleniyor.
 */
export function isReadableProse(text: string): boolean {
  const trimmed = text.trim();
  // CJK'de karakter başına bilgi çok daha yoğun; aynı eşik orada çok uzun olurdu.
  const isCjk = /[぀-ヿ一-鿿]/.test(trimmed);
  if (trimmed.length < (isCjk ? MIN_PROSE_LENGTH / 3 : MIN_PROSE_LENGTH)) return false;
  if (/[0-9]/.test(trimmed)) return false;
  if (/^(chapter|letter|book|part|volume)\b/i.test(trimmed)) return false;
  // Tamamı büyük harf başlık satırı (harf büyüklüğü olmayan yazılarda uygulanmaz).
  const hasCase = trimmed.toUpperCase() !== trimmed.toLowerCase();
  if (hasCase && trimmed === trimmed.toUpperCase()) return false;
  const sentenceEnds = trimmed.match(/[.!?](\s|$)|[。！？]/g)?.length ?? 0;
  return sentenceEnds >= 2;
}

/** Ardışık iki düzyazı paragrafı tercih eder; yoksa en iyi tekini. */
export function pickPassageParagraphs(texts: string[]): string[] {
  for (let i = 0; i < texts.length - 1; i++) {
    const a = texts[i] as string;
    const b = texts[i + 1] as string;
    if (isReadableProse(a) && isReadableProse(b)) return [a.trim(), b.trim()];
  }
  const single = texts.find(isReadableProse);
  return single ? [single.trim()] : [];
}

function mapBook(row: Record<string, unknown>): OnboardingBook {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    author: (row.author as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    cefrLevel: (row.cefr_level as string | null) ?? null,
  };
}

async function fetchPassage(book: OnboardingBook): Promise<OnboardingPassage | null> {
  const { data: sectionRows, error: sectionError } = await supabase
    .from("book_sections")
    .select("id")
    .eq("book_id", book.id)
    .order("order_index", { ascending: true })
    .limit(2);
  if (sectionError) throw sectionError;

  for (const section of sectionRows ?? []) {
    const { data: paragraphRows, error: paragraphError } = await supabase
      .from("book_paragraphs")
      .select("text")
      .eq("section_id", section.id as string)
      .order("order_index", { ascending: true })
      .limit(PASSAGE_SCAN_LIMIT);
    if (paragraphError) throw paragraphError;

    const paragraphs = pickPassageParagraphs(
      (paragraphRows ?? []).map((row) => (row.text as string | null) ?? ""),
    ).slice(0, PASSAGE_PARAGRAPH_COUNT);
    if (paragraphs.length > 0) {
      return { bookId: book.id, bookTitle: book.title, paragraphs };
    }
  }
  return null;
}

async function fetchOnboardingContent(
  targetLanguage: string,
  level: string | null,
): Promise<OnboardingContent> {
  const columns = "id, slug, title, author, cover_url, cefr_level";

  /**
   * KİTAP ZEVKİ: önce KLASİKLER (kullanıcı bulgusu, 2026-09-25). Lingo
   * Studio kapaklarında başlık/yazar yazmıyor; kullanıcı yalnızca bir
   * resme bakıp "bunu okumak isterim" diyemiyor. Klasikler tanınıyor.
   * O dilde klasik azsa Lingo Studio ile tamamlanıyor.
   */
  const { data: classicRows, error: classicError } = await supabase
    .from("books")
    .select(columns)
    .eq("status", "published")
    .eq("target_language", targetLanguage)
    .neq("author", LINGO_STUDIO_AUTHOR)
    .not("cover_url", "is", null)
    .order("popularity_score", { ascending: false })
    .limit(TASTE_BOOK_COUNT);
  if (classicError) throw classicError;

  const levels = levelsToTry(level);
  const { data: levelRows, error: levelError } = await supabase
    .from("books")
    .select(columns)
    .eq("status", "published")
    .eq("target_language", targetLanguage)
    .in("cefr_level", level ? [level, ...levels] : levels)
    .order("popularity_score", { ascending: false })
    .limit(TASTE_BOOK_COUNT * 2);
  if (levelError) throw levelError;

  const classics = (classicRows ?? []).map(mapBook);
  const levelBooks = (levelRows ?? []).map(mapBook);
  const seen = new Set(classics.map((book) => book.id));
  const books = [...classics, ...levelBooks.filter((book) => !seen.has(book.id))].slice(
    0,
    TASTE_BOOK_COUNT,
  );

  /**
   * PASAJ: kullanıcının seçtiği seviyeyi temsil etmeli (2026-09-18 bulgusu).
   * Önce tam seviye, sonra bir altı; her aday kitapta okunabilir düzyazı
   * bulunana kadar denenir.
   */
  const candidates = [
    ...levelBooks.filter((book) => book.cefrLevel === level),
    ...levelBooks.filter((book) => book.cefrLevel !== level),
  ].slice(0, 4);
  for (const candidate of candidates) {
    const passage = await fetchPassage(candidate);
    if (passage) return { books, passage };
  }
  return { books, passage: null };
}

export function useOnboardingContentQuery(targetLanguage: string | null, level: string | null) {
  return useQuery({
    queryKey: ["onboarding", "content", targetLanguage, level],
    queryFn: () => fetchOnboardingContent(targetLanguage as string, level),
    enabled: Boolean(targetLanguage),
    // Onboarding tek oturumluk; içerik değişmeyecek.
    staleTime: Infinity,
    retry: 1,
  });
}
