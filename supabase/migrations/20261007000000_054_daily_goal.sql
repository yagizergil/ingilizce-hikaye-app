-- 054: Günlük hedef ve meydan okuma -- 2026-10-07.
--
-- ÜRÜN: kullanıcının onboarding'de seçtiği günlük okuma hedefi
-- (`profiles.daily_goal_minutes`) artık ana sayfada bir halka olarak
-- izleniyor. Meydan okuma "okunan gün" değil "HEDEFİN TUTTURULDUĞU gün"
-- sayıyor; basamaklar 7 -> 30 -> 120.
--
-- XP: hedefin tutturulduğu her gün +20, basamaklar +100 / +300 / +1000.
-- Hepsi `user_reading_stats.minutes`ten TÜRETİLİYOR, istemci yazmıyor
-- (migration 053 ile aynı ilke). Hedef en az 5 dk sayılır: kullanıcı kendi
-- hedefini 1 dk yapıp her gün bonus toplayamasın.
--
-- BİLİNEN SADELEŞTİRME: geçmiş günler de BUGÜNKÜ hedefe göre sayılıyor
-- (hedef geçmişi tutulmuyor). Hedefi yükselten kullanıcının eski günleri
-- yeniden değerlendirilir; bu adil ve anlaşılır, ayrı bir tablo
-- gerektirmiyor.

create or replace function public.get_goal_progress(p_today date default null)
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
  goal as (
    select greatest(coalesce(pr.daily_goal_minutes, 10), 5) as minutes
    from params p left join public.profiles pr on pr.id = p.uid
  ),
  days as (
    select s.date, s.minutes
    from public.user_reading_stats s, params p
    where s.user_id = p.uid and s.date >= p.start_day
  ),
  met as (
    select d.date from days d, goal g where d.minutes >= g.minutes
  ),
  streak as (
    -- Ardışık hedef günleri (gün - sıra no aynı grup). Bugün henüz
    -- tutmadıysa seri dünden sayılır, kırılmış sayılmaz.
    select coalesce(max(n), 0) as n from (
      select count(*) as n, max(date) as last_day
      from (select m.date, m.date - (row_number() over (order by m.date))::int as grp from met m) a
      group by grp
    ) b, params p
    where b.last_day = p.today
       or (b.last_day = p.today - 1 and not exists (select 1 from met where date = p.today))
  )
  select jsonb_build_object(
    'goal', (select minutes from goal),
    'today', coalesce((select floor(minutes)::int from days d, params p where d.date = p.today), 0),
    'goal_days', (select count(*) from met),
    'streak', (select n from streak)
  );
$$;

revoke all on function public.get_goal_progress(date) from public;
grant execute on function public.get_goal_progress(date) to authenticated;

-- XP'ye hedef bonusu ekleniyor (053'teki fonksiyonun yeni sürümü).
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
  ),
  goal as (
    select greatest(coalesce(pr.daily_goal_minutes, 10), 5) as minutes
    from params p left join public.profiles pr on pr.id = p.uid
  ),
  goals as (
    select count(*) as days,
           count(*) filter (where s.date = p.today) as today
    from public.user_reading_stats s, params p, goal g
    where s.user_id = p.uid and s.date >= p.start_day and s.minutes >= g.minutes
  )
  select jsonb_build_object(
    'reading', floor(reading.total * 2)::int,
    'words', (words.total * 3)::int,
    'reviews', (reviews.total * 2)::int,
    'quiz', (quiz.total * 5)::int,
    'books', (books.total * 100)::int,
    'goals', (goals.days * 20
              + case when goals.days >= 7 then 100 else 0 end
              + case when goals.days >= 30 then 300 else 0 end
              + case when goals.days >= 120 then 1000 else 0 end)::int,
    'today', (floor(reading.today * 2) + words.today * 3 + reviews.today * 2
              + quiz.today * 5 + books.today * 100 + goals.today * 20)::int
  )
  from reading, words, reviews, quiz, books, goals;
$$;
