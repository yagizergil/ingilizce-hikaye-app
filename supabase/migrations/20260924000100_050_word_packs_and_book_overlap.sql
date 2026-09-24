-- 050: Keşfet kelime paketleri (premium) + kitaptaki defter kelimeleri.
--
-- level_word_pack: bir dilin bir seviyesindeki kitaplarda en çok kitapta
-- geçen kelimeler. Neredeyse her kitapta geçenler ("the", "be" gibi dil
-- bilgisi kelimeleri) ve kullanıcının zaten kaydettikleri çıkarılıyor.
-- PREMIUM KAPISI BURADA: ücretsiz kullanıcı 5 kelimelik önizleme alıyor,
-- tam liste yalnızca premium'a dönüyor (ADR-009: karar istemcide değil).
--
-- book_saved_word_overlap: kullanıcının defterindeki kelimelerden kaçı bu
-- kitapta geçiyor. Ücretsiz, SECURITY INVOKER -- RLS kullanıcının yalnızca
-- kendi kelimelerini görmesini zaten sağlıyor.

create or replace function public.level_word_pack(
  p_target_language text,
  p_level text,
  p_limit integer default 40
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_premium boolean;
  v_words jsonb;
  v_total integer;
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 60);
  v_preview constant integer := 5;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1 from public.user_entitlements e
    where e.user_id = v_user_id
      and e.tier = 'premium'
      and (e.expires_at is null or e.expires_at > now())
  ) into v_premium;

  with lang_books as (
    select b.id, b.cefr_level
    from public.books b
    where b.status = 'published' and b.target_language = p_target_language
  ),
  book_count as (
    select count(*)::numeric as n from lang_books
  ),
  df_all as (
    select bl.lemma, count(distinct bl.book_id) as df
    from public.book_lemmas bl
    join lang_books lb on lb.id = bl.book_id
    group by bl.lemma
  ),
  level_lemmas as (
    select bl.lemma, count(distinct bl.book_id) as books, sum(bl.count) as occurrences
    from public.book_lemmas bl
    join lang_books lb on lb.id = bl.book_id
    where lb.cefr_level = p_level
    group by bl.lemma
  ),
  ranked as (
    select l.lemma, l.books, l.occurrences
    from level_lemmas l
    join df_all d on d.lemma = l.lemma
    cross join book_count c
    where d.df <= greatest(2, c.n * 0.5)
      and char_length(l.lemma) >= 3
      and l.lemma !~ '[0-9[:punct:][:space:]]'
      and not exists (
        select 1 from public.user_saved_words s
        where s.user_id = v_user_id and s.lemma = l.lemma
      )
    order by l.books desc, l.occurrences desc, l.lemma
    limit v_limit
  )
  select count(*)::integer,
         coalesce(jsonb_agg(r.lemma order by r.books desc, r.occurrences desc, r.lemma), '[]'::jsonb)
    into v_total, v_words
  from ranked r;

  if not v_premium then
    select coalesce(jsonb_agg(t.value order by t.idx), '[]'::jsonb)
      into v_words
    from jsonb_array_elements_text(v_words) with ordinality as t(value, idx)
    where t.idx <= v_preview;
  end if;

  return jsonb_build_object(
    'isPremium', v_premium,
    'total', v_total,
    'words', v_words,
    'locked', not v_premium and v_total > v_preview
  );
end;
$function$;

create or replace function public.book_saved_word_overlap(p_book_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path to ''
as $function$
  with matched as (
    select w.lemma, w.created_at
    from public.user_saved_words w
    where exists (
      select 1 from public.book_lemmas bl
      where bl.book_id = p_book_id and bl.lemma = w.lemma
    )
  )
  select jsonb_build_object(
    'count', (select count(*)::integer from matched),
    'sample', coalesce(
      (select jsonb_agg(m.lemma)
         from (select lemma from matched order by created_at desc limit 6) m),
      '[]'::jsonb
    )
  );
$function$;

revoke all on function public.level_word_pack(text, text, integer) from public;
grant execute on function public.level_word_pack(text, text, integer) to authenticated, anon, service_role;
revoke all on function public.book_saved_word_overlap(uuid) from public;
grant execute on function public.book_saved_word_overlap(uuid) to authenticated, anon, service_role;
