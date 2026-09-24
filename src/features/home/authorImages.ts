import { categoryImageUrl } from "@/features/home/categoryRegistry";

/**
 * "Yazarlar ve Seriler" kartlarının kendi görselleri.
 *
 * Eskiden bu kartlar yazarın/serinin bir KİTAP KAPAĞINI gösteriyordu; kare
 * kutuda kapağın başlığı kesiliyordu ve aynı yazarın her dilde farklı rastgele
 * bir kapağı çıkıyordu (kullanıcı bulgusu, 2026-09-24). Her yazar ve koleksiyon
 * için yazarın dünyasını anlatan kare bir illüstrasyon üretildi (portre yok:
 * gerçek kişilerin yapay benzerliği yanlış olurdu) ve `category-images`
 * altına yüklendi.
 *
 * Kayıtta olmayan yeni bir yazar kitap kapağına düşer; kart hiçbir zaman
 * boş kalmaz. Anahtarlar veritabanındaki `books.author` ve
 * `collections.title_key` değerleriyle BİREBİR aynı olmalı.
 */
const AUTHOR_IMAGE_KEYS: Record<string, string> = {
  "Lingo Studio": "author-lingo-studio",
  "Mann, Thomas": "author-thomas-mann",
  "Freud, Sigmund": "author-sigmund-freud",
  "Oscar Wilde": "author-oscar-wilde",
  "L. Frank Baum": "author-l-frank-baum",
  "Jane Austen": "author-jane-austen",
  "Joseph Conrad": "author-joseph-conrad",
  "H. G. Wells": "author-h-g-wells",
  "William Shakespeare": "author-william-shakespeare",
  "A. A. Milne": "author-a-a-milne",
  "Arthur Conan Doyle": "author-arthur-conan-doyle",
  "Lewis Carroll": "author-lewis-carroll",
  "Charles Dickens": "author-charles-dickens",
  "Pérez Galdós, Benito": "author-perez-galdos",
  "Rizal, José": "author-jose-rizal",
  Homer: "author-homer",
  "Pardo Bazán, Emilia, condesa de": "author-pardo-bazan",
  "Unamuno, Miguel de": "author-unamuno",
  "Hugo, Victor": "author-victor-hugo",
  "Dumas, Alexandre, Maquet, Auguste": "author-alexandre-dumas",
  "Mendès, Catulle": "author-catulle-mendes",
  "Verne, Jules": "author-jules-verne",
  "Serao, Matilde": "author-matilde-serao",
  "Dante Alighieri": "author-dante-alighieri",
  "Cantù, Cesare": "author-cesare-cantu",
  "De Roberto, Federico": "author-federico-de-roberto",
  芥川竜之介: "author-akutagawa",
  秋田滋: "author-akita-shigeru",
  アーヴィングワシントン: "author-washington-irving",
};

const SERIES_IMAGE_KEYS: Record<string, string> = {
  "collections.beginner.title": "series-beginner",
  "collections.classics.title": "series-classics",
  "collections.shortStories.title": "series-short-stories",
  "collections.popular.title": "series-popular",
  "collections.ozSeries.title": "series-oz",
};

export function authorImageUrl(author: string): string | null {
  const key = AUTHOR_IMAGE_KEYS[author];
  return key ? categoryImageUrl(key) : null;
}

export function seriesImageUrl(titleKey: string): string | null {
  const key = SERIES_IMAGE_KEYS[titleKey];
  return key ? categoryImageUrl(key) : null;
}
