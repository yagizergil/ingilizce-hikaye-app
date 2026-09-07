-- `lemmas` bugüne kadar sadece pipeline (spaCy + Anthropic tr_gloss
-- üretimi) tarafından yazıldı. Task 4 ile birlikte bir Supabase Edge
-- Function, cihazda hem `book_lemmas` (bkz. useBookLemmaDictionary.ts)
-- hem `lemma_canonical` global sözlüğünde (bkz. useGlobalLemmaLookup.ts)
-- karşılığı bulunamayan nadir bir lemma için çalışma zamanında (runtime)
-- LLM çevirisi alıp bu tabloya yazacak. `source` kolonu bu iki kaynağı
-- ayırt eder -- ileride veri kalitesi denetimi (örn. "runtime kaynaklı
-- satırların oranı ne kadar arttı") veya pipeline'ın bir sonraki
-- çalışmasında runtime satırlarını gözden geçirip resmi hale getirmesi
-- için gereklidir. Mevcut satırların hepsi pipeline'dan geldiği için
-- default 'pipeline' doğru ve güvenli bir backfill değeridir.
alter table public.lemmas
  add column source text not null default 'pipeline'
    check (source in ('pipeline', 'runtime'));
