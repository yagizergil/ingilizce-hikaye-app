-- 051: kelime paketinden dilin en sık 150 kelimesi de çıkarılıyor.
-- Bazı kitapların book_lemmas'ında "the" gibi dil bilgisi kelimeleri kalmış;
-- df eşiği (%50) onları yakalamıyordu ve İngilizce A2 paketinin 1. kelimesi
-- "the" çıkıyordu (canlı veriyle doğrulandı).

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
    select bl.lemma, count(distinct bl.book_id) as df, sum(bl.count) as total
    from public.book_lemmas bl
    join lang_books lb on lb.id = bl.book_id
    group by bl.lemma
  ),
  top_frequent as (
    select d.lemma from df_all d order by d.total desc limit 150
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
      and l.lemma not in (select t.lemma from top_frequent t)
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

