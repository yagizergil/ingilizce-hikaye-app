-- 022_level_test_sample.sql
-- Seviye tespiti testinin kelime örneklemi.
--
-- Test, her CEFR bandından rastgele N kelime gösterip kullanıcının kaçını
-- bildiğini ölçüyor. Rastgele örnekleme PostgREST'ten temiz yapılamıyor
-- (limit + order by random() her bant için ayrı istek demek), o yüzden tek
-- çağrıda tüm bantları döndüren bir fonksiyon.
--
-- Neden SECURITY INVOKER: `lemma_canonical` zaten anon/authenticated
-- rollerine açık sözlük verisi. DEFINER'a gerek yok ve 021'de düzeltilen
-- hatayı tekrarlamamak gerekiyor.
--
-- search_path boşaltılıyor ve tüm referanslar şema-nitelikli (008'in
-- sertleştirme deseni).

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
      -- Çok harfli kısaltmalar ve tek harflik girdiler test için anlamsız.
      and char_length(lc.lemma) between 2 and 20
      -- Çok kelimeli öbekler tanıma testini bulanıklaştırıyor.
      and lc.lemma not like '% %'
      and not lc.is_phrasal
  ) w
  where w.rn <= greatest(1, least(per_band, 20))
  order by w.cefr_level, w.rn;
$$;

comment on function public.sample_level_test_words(integer) is
  'Seviye tespiti testi için her CEFR bandından rastgele kelime örneği.';

grant execute on function public.sample_level_test_words(integer) to anon, authenticated;
