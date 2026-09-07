-- 009_simplify_content_schema.sql
-- book_tokens (0 satır) ve book_sentences (544 satır, sadece ilk
-- bölümlerden, pipeline yeniden üretecek) kaldırılıyor. Tokenizasyon ve
-- cümle bölme deterministik ve ucuz (~5ms) — cihazda render anında
-- yapılacak, veritabanında ayrı tablo olarak tutulmasına gerek yok.
-- book_paragraphs artık tek içerik tablosu.

-- user_saved_words: sentence_id -> paragraph_id + context_text (denormalize,
-- cümle tablosu olmadığı için kaydedilen kelimenin bağlam cümlesini/parçasını
-- doğrudan saklıyoruz).
alter table public.user_saved_words
  drop constraint if exists user_saved_words_sentence_id_fkey;
drop index if exists public.user_saved_words_sentence_id_idx;
alter table public.user_saved_words
  drop column if exists sentence_id;
alter table public.user_saved_words
  add column paragraph_id uuid references public.book_paragraphs (id) on delete set null;
alter table public.user_saved_words
  add column context_text text;

-- srs_cards.sentence_id de book_sentences'a bağımlıydı; srs feature'ı henüz
-- hiç kullanılmıyor (0 satır), kolon kaldırılıyor. R6'da (SRS motoru
-- yazılırken) yeni bağlam alanı gerekirse eklenir.
alter table public.srs_cards
  drop constraint if exists srs_cards_sentence_id_fkey;
drop index if exists public.srs_cards_sentence_id_idx;
alter table public.srs_cards
  drop column if exists sentence_id;

drop table public.book_tokens;
drop table public.book_sentences;

-- book_paragraphs: sentence_count/is_dialogue cümle tablosuna bağımlı
-- alanlardı (cihazda hesaplanacak), kaldırılıyor.
alter table public.book_paragraphs drop column if exists sentence_count;
alter table public.book_paragraphs drop column if exists is_dialogue;

-- book_lemmas(book_id) index'i eksikti (sadece lemma index'i vardı).
create index if not exists book_lemmas_book_id_idx on public.book_lemmas (book_id);

-- book_paragraphs(section_id, order_index) zaten 001'de oluşturulmuştu,
-- burada tekrar oluşturulmuyor.

-- get_book_coverage / get_library_coverage book_tokens/book_sentences'a hiç
-- bağımlı değildi (sadece book_lemmas + lemmas + user_lemma_state okuyor),
-- bu yüzden mantıkları değişmiyor — yeniden yazmaya gerek yok.
