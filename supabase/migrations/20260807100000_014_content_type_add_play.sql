-- content_type CHECK kısıtlamasına 'play' değeri ekler.
--
-- Standard Ebooks'ta bazı kitaplar (ör. Oscar Wilde'ın "A Woman of No
-- Importance", "The Importance of Being Earnest", "Lady Windermere's
-- Fan" ve Ring Lardner/George S. Kaufman'ın "June Moon"u) sahne
-- oyunlarıdır — diyalog <p> yerine <table><tr><td> yapısıyla işaretlenir
-- (bkz. pipeline/src/epub/cleaner.py extract_drama_paragraph_texts).
-- Pipeline artık bu kitapları content_type='novel'/'collection' yerine
-- 'play' olarak sınıflandırıyor (bkz. pipeline/src/epub/parser.py
-- _detect_content_type'dan önce çalışan drama tespiti); bu değer
-- CHECK kısıtlamasında yoktu, insert/update reddedilirdi.
alter table public.books
  drop constraint if exists books_content_type_check;

alter table public.books
  add constraint books_content_type_check
    check (content_type in ('novel', 'collection', 'short_story', 'article', 'play'));
