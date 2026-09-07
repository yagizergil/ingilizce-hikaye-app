-- 023_level_test_content_words.sql
-- 022'deki örnekleyici işlev sözcüklerini de döndürüyordu: A1 bandında
-- "this", "which" gibi kelimeler çıktı. Bunlar tanıma testinde slot israfı —
-- herkes bilir, hiçbir ayırt edicilik taşımaz.
--
-- Bu revizyon örneklemi içerik sözcükleriyle (isim, fiil, sıfat, zarf)
-- sınırlıyor. `lemma_canonical.pos` alanı 013'ten beri mevcut.

create or replace function public.sample_level_test_words(per_band integer default 6)
returns table (lemma text, cefr_level text, tr_gloss text)
language sql
security invoker
set search_path = ''
as $$
  select w.lemma, w.cefr_level, w.tr_gloss
  from (
    select
      lc.lemma,
      lc.cefr_level,
      lc.tr_gloss,
      row_number() over (partition by lc.cefr_level order by random()) as rn
    from public.lemma_canonical lc
    where lc.cefr_level is not null
      and lc.tr_gloss is not null
      and char_length(lc.lemma) between 2 and 20
      and lc.lemma not like '% %'
      and not lc.is_phrasal
      -- Yalnızca içerik sözcükleri: işlev sözcükleri (determiner, pronoun,
      -- preposition, conjunction) her seviyede bilinir, testi bulanıklaştırır.
      and lc.pos in ('noun', 'verb', 'adjective', 'adverb')
  ) w
  where w.rn <= greatest(1, least(per_band, 20))
  order by w.cefr_level, w.rn;
$$;
