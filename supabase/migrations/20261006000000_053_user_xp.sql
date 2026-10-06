-- 053: Okur seviyesi (XP) -- 2026-10-06.
--
-- NEDEN YENİ TABLO YOK: XP, zaten sunucuda tutulan etkinliklerden TÜRETİLİYOR
-- (okuma dakikası, kaydedilen kelime, tekrar, quiz, bitirilen kitap). İstemci
-- XP yazmıyor; yazabilseydi kendine seviye verebilirdi (ADR-009'daki "tek
-- yazar" ilkesinin aynısı). Seviye eğrisi istemcide (`profile/xp.ts`, testli).
--
-- HERKES 0'DAN BAŞLAR: yalnızca XP_START (sistemin açıldığı gün) ve sonrası
-- sayılır. Eski kullanıcılar da yeni sistemde Seviye 1'den başlıyor.
--
-- SINIRLAR (çiftçiliği önlemek için, gün başına): okuma 60 dk, kelime 30,
-- tekrar 100. Quiz yalnızca her quizin EN İYİ sonucu (tekrar çözmek XP
-- basmıyor). Gün sınırları istemcinin yerel günü değil UTC günü -- yalnızca
-- tavan için kullanılıyor, kullanıcıya gösterilen bir "gün" değil.

create or replace function public.get_user_xp(p_today date default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select auth.uid() as uid,
           date '2026-10-06' as start_day,
           coalesce(p_today, (now() at time zone 'utc')::date) as today
  ),
  reading as (
    select coalesce(sum(least(s.minutes, 60)), 0)::numeric as total,
           coalesce(sum(least(s.minutes, 60)) filter (where s.date = p.today), 0)::numeric as today
    from public.user_reading_stats s, params p
    where s.user_id = p.uid and s.date >= p.start_day
  ),
  words as (
    select coalesce(sum(least(n, 30)), 0) as total,
           coalesce(sum(least(n, 30)) filter (where d = p.today), 0) as today
    from (
      select (w.created_at at time zone 'utc')::date as d, count(*) as n
      from public.user_saved_words w, params p
      where w.user_id = p.uid and w.created_at >= p.start_day
      group by 1
    ) x, params p
  ),
  reviews as (
    select coalesce(sum(least(n, 100)), 0) as total,
           coalesce(sum(least(n, 100)) filter (where d = p.today), 0) as today
    from (
      select d, count(*) as n from (
        select (r.reviewed_at at time zone 'utc')::date as d
        from public.srs_reviews r, params p
        where r.user_id = p.uid and r.reviewed_at >= p.start_day
        union all
        select (c.created_at at time zone 'utc')::date
        from public.custom_deck_reviews c, params p
        where c.user_id = p.uid and c.created_at >= p.start_day
      ) all_reviews
      group by d
    ) x, params p
  ),
  quiz as (
    select coalesce(sum(q.best_correct), 0) as total,
           coalesce(sum(q.best_correct) filter (
             where (q.last_attempt_at at time zone 'utc')::date = p.today), 0) as today
    from public.user_quiz_results q, params p
    where q.user_id = p.uid and q.last_attempt_at >= p.start_day
  ),
  books as (
    select count(*) as total,
           count(*) filter (where (b.finished_at at time zone 'utc')::date = p.today) as today
    from public.user_book_progress b, params p
    where b.user_id = p.uid and b.finished_at >= p.start_day
  )
  select jsonb_build_object(
    'reading', floor(reading.total * 2)::int,
    'words', (words.total * 3)::int,
    'reviews', (reviews.total * 2)::int,
    'quiz', (quiz.total * 5)::int,
    'books', (books.total * 100)::int,
    'today', (floor(reading.today * 2) + words.today * 3 + reviews.today * 2
              + quiz.today * 5 + books.today * 100)::int
  )
  from reading, words, reviews, quiz, books;
$$;

revoke all on function public.get_user_xp(date) from public;
grant execute on function public.get_user_xp(date) to authenticated;
