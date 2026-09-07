import type { CategoryTagNavTarget } from "@/features/home/types";

/**
 * Ana sayfadaki "Türler ve Konular" rafının küratörlü listesi.
 *
 * NEDEN KÜRATÖRLÜ, OTOMATİK DEĞİL (2026-09-07):
 * Kartlar eskiden veritabanındaki HER `genres`/`themes` değerinden
 * otomatik üretiliyordu. Üç sorunu vardı:
 *
 * 1. **Etiketler İngilizceydi.** Kart üstünde Türk kullanıcıya
 *    "slice-of-life", "kindness" yazıyordu. Uygulama arayüzü Türkçe; ham
 *    veritabanı değerini kullanıcıya göstermek CLAUDE.md'nin i18n
 *    kuralının ihlaliydi.
 * 2. **Uzun kuyruk.** 20'den fazla konu yalnızca tek bir kitapta
 *    geçiyordu; raf tek kitaplık kartlarla doluyordu.
 * 3. **Yazım tutarsızlığı.** "neighbors" ve "neighbours" ayrı iki kart
 *    oluyordu.
 *
 * NEDEN YALNIZCA TÜR, KONU DEĞİL:
 * Karta dokunmak kütüphaneyi filtreliyor. Kütüphanenin tür filtresi
 * `book.genre` üzerinde TAM eşleşme yapıyor (bkz. useFilteredBooks.ts);
 * konu için ise yalnızca serbest metin araması var. Bir konu kümesini
 * ("dostluk" = friendship + kindness + trust + loyalty) tek bir arama
 * terimiyle temsil etmek, kartta "18 kitap" yazıp kullanıcıyı 5 kitaplık
 * bir listeye götürürdü. Karttaki sayının götürdüğü yerle birebir tutması,
 * kütüphaneye yeni bir çoklu-konu filtresi eklemekten daha değerli — konu
 * bazlı raf, öyle bir filtre gerçekten gerekince geri gelebilir.
 *
 * Bu liste ancak `books.genres` dolu olduğu için işe yarıyor: klasiklerin
 * 46'sının TAMAMI etiketsizdi (kataloğun yarısı, üstelik kullanıcının
 * tanıdığı yarısı hiçbir kartta görünmüyordu);
 * `pipeline/scripts/tag_classics.py` ile dolduruldu. Yeni bir tür yayına
 * girdiğinde buraya eklenmediği sürece rafta görünmez — raf küratörlü bir
 * vitrin, veritabanının dökümü değil.
 */
export interface CategoryDefinition {
  /** Kart görselinin ve i18n anahtarının kimliği. */
  key: string;
  /**
   * Kitabın ANA türü (`books.genres` dizisinin ilk elemanı; uygulama onu
   * `book.genre` olarak okuyor). Kütüphane filtresiyle aynı değer
   * kullanılıyor ki karttaki sayı ile açılan listenin uzunluğu eşit olsun.
   */
  genre: string;
  /** Kart açıldığında hangi filtreye gidiyor. */
  navTarget: CategoryTagNavTarget;
}

function genreCategory(key: string, genre: string): CategoryDefinition {
  return { key, genre, navTarget: { kind: "library", genre } };
}

export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
  genreCategory("everyday", "drama"),
  genreCategory("adventure", "adventure"),
  genreCategory("fantasy", "fantasy"),
  genreCategory("mystery", "mystery"),
  genreCategory("romance", "romance"),
  genreCategory("philosophy", "philosophy"),
  genreCategory("gothic", "gothic"),
  genreCategory("comedy", "comedy"),
  genreCategory("scifi", "science-fiction"),
] as const;

/** Kategori görsellerinin bulunduğu Storage klasörü. */
export const CATEGORY_IMAGE_BASE =
  "https://lzewiwkwcshwxsfwybml.supabase.co/storage/v1/object/public/category-images";

export function categoryImageUrl(key: string): string {
  return `${CATEGORY_IMAGE_BASE}/${key}.jpg`;
}
