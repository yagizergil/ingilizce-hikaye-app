-- 025_book_section_counts.sql
-- Kitap başına bölüm sayısını sunucuda hesaplayan fonksiyon.
--
-- ÇÖZÜLEN HATA: `fetchChapterCounts` her bölüm satırını çekip istemcide
-- sayıyordu (`select book_id from book_sections where book_id in (...)`).
-- PostgREST varsayılan olarak en fazla 1000 satır döndürüyor; katalog
-- 1.709 bölüme ulaştığında sorgu sessizce kesiliyor ve listenin sonundaki
-- kitaplar "0 bölüm" gösteriyordu. Hata veri değil sayfalama kaynaklıydı,
-- bu yüzden hiçbir yerde hata olarak da görünmüyordu.
--
-- Sayım artık veritabanında yapılıyor: tek satır per kitap, satır sınırı
-- kitap sayısına bağlı (85), bölüm sayısına değil.
--
-- `kind` filtresi BİLEREK yok: `book_sections.kind` değeri 'chapter',
-- 'story' ve 'letter' olabiliyor (Oscar Wilde derlemeleri 'story',
-- Frankenstein'ın mektupları 'letter'). Kullanıcıya gösterilen sayı
-- "okunacak parça sayısı"dır, türü fark etmez.
--
-- security invoker: `book_sections` zaten anon/authenticated rollerine
-- status='published' filtresiyle açık; RLS'i atlamaya gerek yok.

create or replace function public.book_section_counts(book_ids uuid[])
returns table (book_id uuid, section_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.book_id, count(*)::integer as section_count
  from public.book_sections s
  where s.book_id = any(book_ids)
  group by s.book_id;
$$;

comment on function public.book_section_counts(uuid[]) is
  'Kitap başına bölüm sayısı. İstemcide saymak PostgREST satır sınırına takılıyordu — bkz. migration 025.';

grant execute on function public.book_section_counts(uuid[]) to anon, authenticated;
