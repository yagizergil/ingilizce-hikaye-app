# Kitap Kataloğu

Bu dosya, uygulamada yayınlanan kitapların telif/atıf ve içerik
kaynağı bilgisinin tek doğruluk kaynağıdır (source of truth).
**Uygulama içi lisans/atıf ekranı bu dosyadan üretilmeli** —
`books` tablosundaki `license`, `license_text`, `source`,
`source_url`, `author_death_year` alanlarıyla birebir eşleşir.

Son güncelleme: 2026-08-06 (5 kitap, `pipeline run` ile üretildi).

## Ortak lisans/telif notu

Tüm kitaplar [Standard Ebooks](https://standardebooks.org) tarafından
tipografik olarak yeniden düzenlenmiş, kamu malı (public domain)
metinlerdir. Standard Ebooks'un kendi katkısı (tipografi, düzenleme,
kapak) [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
ile kamuya adanmıştır. Kaynak metin, Standard Ebooks'un transkripsiyon
temel aldığı [Project Gutenberg](https://www.gutenberg.org) baskısıdır
(her kitabın `source_url`'ü budur). Her iki kaynak da ücretsiz ve
sınırsız yeniden dağıtıma izin verir.

Telif kuralı ([ADR/thresholds.yaml](../pipeline/config/thresholds.yaml)
`copyright.max_author_death_year`): yazarın ölüm yılı ≤1956 olmalı
(TR/AB "ölüm + 70 yıl" kuralına göre, bu dosyanın güncellendiği yıl
esas alınarak). Aşağıdaki 5 yazarın hepsi bu sınırın açıkça altında.

## Özet tablo

| Kitap | Yazar | Ölüm Yılı | Seviye | Kelime | Bölüm | Paragraf | Süre (dk) |
|---|---|---|---|---|---|---|---|
| Frankenstein | Mary Shelley | 1851 | C1 | 74,858 | 33 | 762 | 374 |
| The Call of the Wild | Jack London | 1916 | B2 | 31,911 | 19 | 338 | 160 |
| The Wonderful Wizard of Oz | L. Frank Baum | 1919 | B1 | 39,331 | 24 | 1,128 | 197 |
| Children's Stories | Oscar Wilde | 1900 | B2 | 49,539 | 32 | 935 | 248 |
| The Adventures of Sherlock Holmes | Arthur Conan Doyle | 1930 | B1 | 104,335 | 74 | 2,531 | 522 |

`slug` sütun adları uygulamada `books.slug` ile birebir eşleşir (aşağıda
her kitabın başlığında parantez içinde verilmiştir).

---

## Frankenstein (`mary-shelley-frankenstein`)

- **Yazar:** Mary Shelley — öldüğü yıl: **1851**
- **Kaynak:** Standard Ebooks / [Project Gutenberg #42324](https://www.gutenberg.org/ebooks/42324)
- **Lisans:** CC0 1.0 Universal (kaynak metin ve Standard Ebooks katkısı ABD'de kamu malı sayılır)
- **content_type:** novel — **CEFR seviyesi:** C1
- **Metrikler:** 74,858 kelime · 4,997 benzersiz lemma · ort. cümle 22.6 kelime · maks. cümle 157 kelime
- **CEFR kapsam dağılımı:** A1 %59.6 · A2 %14.5 · B1 %11.7 · B2 %5.7 · C1 %0.9 · C2 %0.6
- **off_list_ratio:** %7.04 · **dialect_ratio:** %0.01 · **dialogue_ratio:** %41.2
- **Yapı:** 4 mektup (Letter I–IV) + 24 bölüm (Chapter I–XXIV), 33 DB section'ı (Chapter XXIV chunker tarafından 6 parçaya bölündü)
- **Tahmini okuma süresi:** 374 dakika

## The Call of the Wild (`jack-london-the-call-of-the-wild`)

- **Yazar:** Jack London — öldüğü yıl: **1916**
- **Kaynak:** Standard Ebooks / [Project Gutenberg #215](https://www.gutenberg.org/ebooks/215)
- **Lisans:** CC0 1.0 Universal
- **content_type:** novel — **CEFR seviyesi:** B2
- **Metrikler:** 31,911 kelime · 3,578 benzersiz lemma · ort. cümle 18.7 kelime · maks. cümle 105 kelime
- **CEFR kapsam dağılımı:** A1 %64.0 · A2 %12.6 · B1 %9.0 · B2 %5.2 · C1 %0.7 · C2 %0.4
- **off_list_ratio:** %8.11 (Klondike/köpek kızağı terminolojisi — husky, sledge, malemute, wheeler — ve özel yer adları kaynaklı, normalizasyon kaçağı değil) · **dialect_ratio:** %0.02 · **dialogue_ratio:** %20.7
- **Yapı:** 7 bölüm (I–VII), 19 DB section'ı (III/V/VI/VII bölümleri chunker tarafından parçalara ayrıldı)
- **Tahmini okuma süresi:** 160 dakika

## The Wonderful Wizard of Oz (`l-frank-baum-the-wonderful-wizard-of-oz`)

- **Yazar:** L. Frank Baum — öldüğü yıl: **1919**
- **Kaynak:** Standard Ebooks / [Project Gutenberg #55](https://www.gutenberg.org/ebooks/55)
- **Lisans:** CC0 1.0 Universal
- **content_type:** novel — **CEFR seviyesi:** B1
- **Metrikler:** 39,331 kelime · 2,060 benzersiz lemma · ort. cümle 18.1 kelime · maks. cümle 80 kelime
- **CEFR kapsam dağılımı:** A1 %78.0 · A2 %11.7 · B1 %5.0 · B2 %2.5 · C1 %0.1 · C2 %0.04
- **off_list_ratio:** %2.54 (kitaptaki 5 kitap arasında en düşük — basit kelime dağarcığı) · **dialect_ratio:** %0 · **dialogue_ratio:** %61.3
- **Yapı:** 24 bölüm (I–XXIV), hiçbiri chunker eşiğini (4000 kelime) aşmadığı için section sayısı bölümle birebir
- **Tahmini okuma süresi:** 197 dakika

## Children's Stories (`oscar-wilde-childrens-stories`)

- **Yazar:** Oscar Wilde — öldüğü yıl: **1900**
- **Kaynak:** Standard Ebooks / [Project Gutenberg #902](https://www.gutenberg.org/ebooks/902)
- **Lisans:** CC0 1.0 Universal
- **content_type:** collection — **CEFR seviyesi:** B2
- **Metrikler:** 49,539 kelime · 3,396 benzersiz lemma · ort. cümle 19.9 kelime · maks. cümle 155 kelime
- **CEFR kapsam dağılımı:** A1 %70.7 · A2 %11.4 · B1 %6.6 · B2 %3.4 · C1 %0.4 · C2 %0.2
- **off_list_ratio:** %7.34 · **dialect_ratio:** %0.06 · **dialogue_ratio:** %49.9
- **İçerik:** *The Happy Prince and Other Tales* (5 öykü) + *A House of
  Pomegranates* (4 öykü) — toplam 9 öykü, 32 DB section'ı:

  | Öykü | Parça |
  |---|---|
  | The Happy Prince | 1 |
  | The Nightingale and the Rose | 1 |
  | The Selfish Giant | 1 |
  | The Devoted Friend | 3 |
  | The Remarkable Rocket | 3 |
  | The Young King | 4 |
  | The Birthday of the Infanta | 5 |
  | The Fisherman and His Soul | 9 |
  | The Star-Child | 5 |

- **Tahmini okuma süresi:** 248 dakika

## The Adventures of Sherlock Holmes (`arthur-conan-doyle-the-adventures-of-sherlock-holmes`)

- **Yazar:** Arthur Conan Doyle — öldüğü yıl: **1930**
- **Kaynak:** Standard Ebooks / [Project Gutenberg #1661](https://www.gutenberg.org/ebooks/1661)
- **Lisans:** CC0 1.0 Universal
- **content_type:** collection — **CEFR seviyesi:** B1
- **Metrikler:** 104,335 kelime · 5,521 benzersiz lemma · ort. cümle 15.7 kelime · maks. cümle 101 kelime
- **CEFR kapsam dağılımı:** A1 %68.9 · A2 %13.8 · B1 %7.8 · B2 %3.7 · C1 %0.5 · C2 %0.2
- **off_list_ratio:** %5.02 (5 kitap arasında en düşük ikinci) · **dialect_ratio:** %0.003 · **dialogue_ratio:** %87.3 (5 kitap arasında en yüksek — dedektif kurgusunun diyalog ağırlıklı doğası)
- **Yapı:** 12 öykü (A Scandal in Bohemia → The Adventure of the Copper Beeches), 74 DB section'ı (her öykü chunker tarafından 5-7 parçaya bölündü)
- **Tahmini okuma süresi:** 522 dakika

---

## Doğrulama notu (2026-08-06)

Bu katalog, aşağıdaki Supabase doğrulamalarından sonra yazıldı:

- `book_sections.title`: 182/182 dolu (`NULL` yok).
- Yetim veri: `book_sections`/`book_paragraphs`/`book_lemmas`/`collection_books`'ta
  silinen eski kayıtlara ait 0 yetim satır; `books` tablosunda tam 5 kayıt.
- `lemma_canonical` view'ı: 9,921 benzersiz lemma, her biri tam 1 satır
  (belirsizlik yok — bkz. `supabase/migrations/20260806071732_013_lemma_canonical_pos_view.sql`).
- Her kitaptan rastgele 1 paragraf okundu, HTML/encoding artığı veya
  bozuk metin bulunmadı.
