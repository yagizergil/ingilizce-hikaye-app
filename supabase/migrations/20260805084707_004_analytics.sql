-- 004_analytics.sql
-- Analitik: reading sessions/stats, AI usage/cache, coverage cache + fonksiyonlar,
-- streak fonksiyonu.

-- ---------------------------------------------------------------------------
-- user_reading_sessions
-- ---------------------------------------------------------------------------
create table public.user_reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  words_read integer not null default 0,
  wpm numeric
);

create index user_reading_sessions_user_id_idx on public.user_reading_sessions (user_id, started_at desc);

alter table public.user_reading_sessions enable row level security;

create policy "user_reading_sessions_all_own"
  on public.user_reading_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_reading_stats (günlük rollup — streak ve grafikler bunu okur)
-- ---------------------------------------------------------------------------
create table public.user_reading_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  words_read integer not null default 0,
  minutes numeric not null default 0,
  wpm numeric,
  new_lemmas integer not null default 0,
  streak_day integer not null default 0,
  primary key (user_id, date)
);

create index user_reading_stats_user_id_idx on public.user_reading_stats (user_id, date desc);

alter table public.user_reading_stats enable row level security;

create policy "user_reading_stats_all_own"
  on public.user_reading_stats for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_usage
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_user_id_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own"
  on public.ai_usage for select
  to authenticated
  using (auth.uid() = user_id);

-- Yazma sadece service_role (Edge Function) üzerinden yapılır; kullanıcı insert policy'si yok.

-- ---------------------------------------------------------------------------
-- ai_cache (feature+prompt hash'e göre paylaşılan cache)
-- ---------------------------------------------------------------------------
create table public.ai_cache (
  cache_key text primary key,
  feature text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  hit_count integer not null default 0
);

create index ai_cache_feature_idx on public.ai_cache (feature);

alter table public.ai_cache enable row level security;

create policy "ai_cache_select_all"
  on public.ai_cache for select
  to authenticated
  using (true);

-- Yazma sadece service_role (Edge Function) üzerinden yapılır.

-- ---------------------------------------------------------------------------
-- user_book_coverage_cache
-- get_book_coverage / get_library_coverage'ın okuduğu önceden hesaplanmış
-- tablo. Kütüphane ekranı bu tabloyu tek sorguda okur, kitap başına
-- sorgu atmaz. user_lemma_state değiştiğinde ilgili satır stale
-- işaretlenir, bir sonraki get_book_coverage çağrısında yeniden hesaplanır.
-- ---------------------------------------------------------------------------
create table public.user_book_coverage_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  coverage_a1 numeric,
  coverage_a2 numeric,
  coverage_b1 numeric,
  coverage_b2 numeric,
  coverage_c1 numeric,
  coverage_c2 numeric,
  known_lemma_count integer not null default 0,
  is_stale boolean not null default true,
  computed_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- get_library_coverage: tek kullanıcının tüm kitaplarını tek sorguda çeker.
create index user_book_coverage_cache_user_id_idx on public.user_book_coverage_cache (user_id);

alter table public.user_book_coverage_cache enable row level security;

create policy "user_book_coverage_cache_all_own"
  on public.user_book_coverage_cache for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_lemma_state değiştiğinde ilgili cache satırını stale işaretle.
create or replace function public.mark_coverage_cache_stale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  update public.user_book_coverage_cache
  set is_stale = true
  where user_id = target_user_id;

  return coalesce(new, old);
end;
$$;

create trigger user_lemma_state_mark_stale
  after insert or update or delete on public.user_lemma_state
  for each row execute function public.mark_coverage_cache_stale();

-- get_book_coverage(user_id, book_id): cache güncelse direkt döner,
-- stale/yoksa yeniden hesaplayıp cache'i upsert eder.
create or replace function public.get_book_coverage(p_user_id uuid, p_book_id uuid)
returns table (
  coverage_a1 numeric,
  coverage_a2 numeric,
  coverage_b1 numeric,
  coverage_b2 numeric,
  coverage_c1 numeric,
  coverage_c2 numeric,
  known_lemma_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cache record;
begin
  select * into v_cache
  from public.user_book_coverage_cache
  where user_id = p_user_id and book_id = p_book_id;

  if found and not v_cache.is_stale then
    return query
      select v_cache.coverage_a1, v_cache.coverage_a2, v_cache.coverage_b1,
             v_cache.coverage_b2, v_cache.coverage_c1, v_cache.coverage_c2,
             v_cache.known_lemma_count;
    return;
  end if;

  return query
  with book_total as (
    select bl.lemma, bl.count
    from public.book_lemmas bl
    where bl.book_id = p_book_id
  ),
  known as (
    select bt.lemma, bt.count
    from book_total bt
    join public.user_lemma_state uls
      on uls.lemma = bt.lemma and uls.user_id = p_user_id
    where uls.state in ('known', 'learning')
  ),
  by_level as (
    select l.cefr_level, sum(bt.count) as total, sum(coalesce(k.count, 0)) as known_count
    from book_total bt
    join public.lemmas l on l.lemma = bt.lemma
    left join known k on k.lemma = bt.lemma
    group by l.cefr_level
  ),
  agg as (
    select
      max(case when cefr_level = 'A1' then known_count::numeric / nullif(total, 0) end) as a1,
      max(case when cefr_level = 'A2' then known_count::numeric / nullif(total, 0) end) as a2,
      max(case when cefr_level = 'B1' then known_count::numeric / nullif(total, 0) end) as b1,
      max(case when cefr_level = 'B2' then known_count::numeric / nullif(total, 0) end) as b2,
      max(case when cefr_level = 'C1' then known_count::numeric / nullif(total, 0) end) as c1,
      max(case when cefr_level = 'C2' then known_count::numeric / nullif(total, 0) end) as c2
    from by_level
  ),
  total_known as (
    select count(*)::integer as cnt from known
  )
  insert into public.user_book_coverage_cache as c (
    user_id, book_id, coverage_a1, coverage_a2, coverage_b1, coverage_b2,
    coverage_c1, coverage_c2, known_lemma_count, is_stale, computed_at
  )
  select
    p_user_id, p_book_id,
    coalesce(agg.a1, 0), coalesce(agg.a2, 0), coalesce(agg.b1, 0),
    coalesce(agg.b2, 0), coalesce(agg.c1, 0), coalesce(agg.c2, 0),
    total_known.cnt, false, now()
  from agg, total_known
  on conflict (user_id, book_id) do update
    set coverage_a1 = excluded.coverage_a1,
        coverage_a2 = excluded.coverage_a2,
        coverage_b1 = excluded.coverage_b1,
        coverage_b2 = excluded.coverage_b2,
        coverage_c1 = excluded.coverage_c1,
        coverage_c2 = excluded.coverage_c2,
        known_lemma_count = excluded.known_lemma_count,
        is_stale = false,
        computed_at = now()
  returning c.coverage_a1, c.coverage_a2, c.coverage_b1, c.coverage_b2,
            c.coverage_c1, c.coverage_c2, c.known_lemma_count;
end;
$$;

-- get_library_coverage(user_id): kütüphane ekranı için tek sorguda tüm
-- kitapların cache'teki coverage değerlerini döner (N+1 yok). Stale
-- satırlar da döner (son bilinen değer) — kütüphane listesi kritik
-- güncellik gerektirmez, reader ekranı gerektiğinde get_book_coverage
-- tek tek çağrılır.
create or replace function public.get_library_coverage(p_user_id uuid)
returns setof public.user_book_coverage_cache
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.user_book_coverage_cache
  where user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- get_user_streak(user_id)
-- user_reading_stats.date üzerinden, Europe/Istanbul takvim gününe göre
-- bugünden (veya dünden, henüz bugün okunmadıysa) geriye ardışık gün sayar.
-- ---------------------------------------------------------------------------
create or replace function public.get_user_streak(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_today date;
  v_cursor date;
  v_streak integer := 0;
begin
  v_today := (now() at time zone 'Europe/Istanbul')::date;
  v_cursor := v_today;

  if not exists (
    select 1 from public.user_reading_stats
    where user_id = p_user_id and date = v_today and words_read > 0
  ) then
    v_cursor := v_today - 1;
  end if;

  loop
    exit when not exists (
      select 1 from public.user_reading_stats
      where user_id = p_user_id and date = v_cursor and words_read > 0
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return v_streak;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed data: birkaç collection
-- ---------------------------------------------------------------------------
insert into public.collections (slug, title_key, description_key, order_index, is_active)
values
  ('beginner', 'collections.beginner.title', 'collections.beginner.description', 1, true),
  ('classics', 'collections.classics.title', 'collections.classics.description', 2, true),
  ('short-stories', 'collections.shortStories.title', 'collections.shortStories.description', 3, true),
  ('popular', 'collections.popular.title', 'collections.popular.description', 4, true);
