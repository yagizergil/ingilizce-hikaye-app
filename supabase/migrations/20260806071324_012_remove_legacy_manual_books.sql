-- Eski, elle yüklenmiş 5 kitabı temizler (frankenstein, pride-and-prejudice,
-- the-count-of-monte-cristo, meditations, the-odyssey). Bunlar pipeline'dan
-- ÖNCEKİ deneme yüklemeleri: seviye placeholder C2, book_lemmas boş,
-- section başına ortalama <1 paragraf (gerçek içerik değil). Doğrulandı:
-- hiçbirinde kullanıcı ilerleme kaydı yok (user_book_progress,
-- user_reading_sessions, user_saved_words, user_lemma_state,
-- user_book_coverage_cache hepsi 0).
--
-- GERİ ALINABİLİR: silmeden önce tüm ilgili satırlar archive şemasına
-- kopyalanır (aşağıdaki DOWN bölümüne bakın).

create schema if not exists archive;

create table archive.legacy_012_books as
select * from public.books
where slug in ('frankenstein', 'pride-and-prejudice', 'the-count-of-monte-cristo', 'meditations', 'the-odyssey');

create table archive.legacy_012_book_sections as
select s.* from public.book_sections s
join archive.legacy_012_books b on b.id = s.book_id;

create table archive.legacy_012_book_paragraphs as
select p.* from public.book_paragraphs p
join archive.legacy_012_book_sections s on s.id = p.section_id;

create table archive.legacy_012_book_lemmas as
select bl.* from public.book_lemmas bl
join archive.legacy_012_books b on b.id = bl.book_id;

create table archive.legacy_012_collection_books as
select cb.* from public.collection_books cb
join archive.legacy_012_books b on b.id = cb.book_id;

-- lemmas tablosuna DOKUNULMADI (paylaşımlı sözlük, kalan 5 kitap kullanıyor).

delete from public.collection_books
where book_id in (select id from archive.legacy_012_books);

delete from public.book_paragraphs
where section_id in (select id from archive.legacy_012_book_sections);

delete from public.book_lemmas
where book_id in (select id from archive.legacy_012_books);

delete from public.book_sections
where book_id in (select id from archive.legacy_012_books);

delete from public.books
where id in (select id from archive.legacy_012_books);

-- DOWN (elle geri almak için, bu migration dosyasında ÇALIŞTIRILMAZ,
-- referans olarak burada tutulur):
--   insert into public.books select * from archive.legacy_012_books;
--   insert into public.book_sections select * from archive.legacy_012_book_sections;
--   insert into public.book_paragraphs select * from archive.legacy_012_book_paragraphs;
--   insert into public.book_lemmas select * from archive.legacy_012_book_lemmas;
--   insert into public.collection_books select * from archive.legacy_012_collection_books;
--   drop schema archive cascade;
