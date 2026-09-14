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

async function fetchOnboardingContent(
  targetLanguage: string,
  level: string | null,
): Promise<OnboardingContent> {
  const levels = levelsToTry(level);

  const { data: bookRows, error: bookError } = await supabase
    .from("books")
    .select("id, slug, title, author, cover_url, cefr_level")
    .eq("status", "published")
    .eq("target_language", targetLanguage)
    .in("cefr_level", levels)
    .order("popularity_score", { ascending: false })
    .limit(TASTE_BOOK_COUNT);

  if (bookError) throw bookError;

  const books: OnboardingBook[] = (bookRows ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    author: (row.author as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    cefrLevel: (row.cefr_level as string | null) ?? null,
  }));

  const source = books[0];
  if (!source) return { books, passage: null };

  // Pasaj: ilk bölümün ilk paragrafları.
  const { data: sectionRows, error: sectionError } = await supabase
    .from("book_sections")
    .select("id")
    .eq("book_id", source.id)
    .order("order_index", { ascending: true })
    .limit(1);

  if (sectionError) throw sectionError;
  const sectionId = sectionRows?.[0]?.id as string | undefined;
  if (!sectionId) return { books, passage: null };

  const { data: paragraphRows, error: paragraphError } = await supabase
    .from("book_paragraphs")
    .select("text")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: true })
    .limit(PASSAGE_PARAGRAPH_COUNT);

  if (paragraphError) throw paragraphError;

  const paragraphs = (paragraphRows ?? [])
    .map((row) => (row.text as string | null) ?? "")
    .filter((text) => text.trim().length > 0);

  return {
    books,
    passage: paragraphs.length
      ? { bookId: source.id, bookTitle: source.title, paragraphs }
      : null,
  };
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
