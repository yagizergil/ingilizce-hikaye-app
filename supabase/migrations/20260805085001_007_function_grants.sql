revoke execute on function public.mark_coverage_cache_stale() from public;

revoke execute on function public.get_book_coverage(uuid, uuid) from public;
revoke execute on function public.get_book_coverage(uuid, uuid) from anon;
grant execute on function public.get_book_coverage(uuid, uuid) to authenticated;

revoke execute on function public.get_library_coverage(uuid) from public;
revoke execute on function public.get_library_coverage(uuid) from anon;
grant execute on function public.get_library_coverage(uuid) to authenticated;

revoke execute on function public.get_user_streak(uuid) from public;
revoke execute on function public.get_user_streak(uuid) from anon;
grant execute on function public.get_user_streak(uuid) to authenticated;

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
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

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

create or replace function public.get_library_coverage(p_user_id uuid)
returns setof public.user_book_coverage_cache
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  return query
    select *
    from public.user_book_coverage_cache
    where user_id = p_user_id;
end;
$$;

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
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

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
