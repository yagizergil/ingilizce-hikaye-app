-- 042: `lemma_canonical` reader'ın sıcak yolunda ve çağrı başına ~450 ms
-- sürüyordu. Aynı çıktı, ~350 kat daha hızlı.
--
-- DENETİM BULGUSU (2026-09-19). Görünüm `ranked` adlı bir CTE'yi İKİ KEZ
-- referans veriyordu (bir kez kendisi, bir kez `grouped` içinden).
-- PostgreSQL iki kez referans verilen bir CTE'yi MATERYALİZE ediyor, yani
-- dışarıdaki `where lemma in (...)` koşulu İÇERİ İTİLEMİYOR: her çağrı,
-- yalnızca 5 kelime istense bile, `lemmas` tablosunun 30.697 satırının
-- TAMAMINI sıralayıp pencereliyor, 25.302 grubu topluyor ve sonunda
-- 30.692 satırı filtreyle atıyordu.
--
-- Üç çağıranın üçü de sıcak yolda:
--   * `useBookLemmaDictionary` -- bölüm ilk açılışında, 200'lük parçalar
--     hâlinde ve paralel (büyük kitapta onlarca çağrı);
--   * `useGlobalLemmaLookup` -- kitap sözlüğünde bulunamayan her kelime
--     dokunuşunda bir çağrı;
--   * `sample_level_test_words()` -- onboarding seviye testi.
--
-- CANLI ÖLÇÜM (aynı 5 kelimelik sorgu, üretim veritabanı):
--
--   ÖNCE : Execution Time 453,660 ms   Buffers: shared hit=28756
--          -> CTE Scan on ranked, "Rows Removed by Filter: 30692"
--   SONRA: Execution Time   1,300 ms   Buffers: shared hit=45
--          -> Index Cond: (lemma = ANY ('{...}'))  (lemmas_pkey)
--
-- ÇÖZÜM: CTE'yi çıkarıp kanonik satırı `distinct on (lemma)` ile seçmek ve
-- anlam listesini LATERAL bir alt sorguyla üretmek. Artık `lemma` koşulu
-- hem dış alt sorguya hem de LATERAL'in içine itilebiliyor, ikisi de
-- `lemmas_pkey`i kullanıyor. Sıralama kuralları (önce CEFR'i olan, sonra
-- sözcük türü önceliği, sonra alfabetik `pos`) BİREBİR korundu.
--
-- EŞDEĞERLİK KANITI (üretimde çalıştırıldı, uygulamadan önce):
--   eski satır sayısı 26.155, yeni 26.155,
--   `eski EXCEPT yeni` = 0 satır, `yeni EXCEPT eski` = 0 satır.
--
-- Geri alma: migration 027'deki tanım aynen yeniden çalıştırılabilir;
-- görünümün sütun listesi ve tipleri değişmedi.

create or replace view public.lemma_canonical as
select
  c.lemma,
  c.pos,
  c.cefr_level,
  c.frequency_rank,
  c.tr_gloss,
  c.ipa,
  c.audio_url,
  c.is_phrasal,
  c.false_friend_note_tr,
  s.senses
from (
  -- Kanonik anlam: CEFR'i olan önce, sonra sözcük türü önceliği, sonra
  -- alfabetik -- migration 027'deki `row_number()` sıralamasının aynısı.
  select distinct on (l.lemma)
    l.lemma,
    l.pos,
    l.cefr_level,
    l.frequency_rank,
    l.tr_gloss,
    l.ipa,
    l.audio_url,
    l.is_phrasal,
    l.false_friend_note_tr
  from public.lemmas l
  order by
    l.lemma,
    (l.cefr_level is null),
    (case l.pos
       when 'noun' then 1
       when 'verb' then 2
       when 'adjective' then 3
       when 'adverb' then 4
       when 'preposition' then 5
       when 'determiner' then 6
       when 'pronoun' then 7
       else 8
     end),
    l.pos
) c
cross join lateral (
  select jsonb_agg(
           jsonb_build_object('pos', l2.pos, 'tr_gloss', l2.tr_gloss)
           order by
             (l2.cefr_level is null),
             (case l2.pos
                when 'noun' then 1
                when 'verb' then 2
                when 'adjective' then 3
                when 'adverb' then 4
                when 'preposition' then 5
                when 'determiner' then 6
                when 'pronoun' then 7
                else 8
              end),
             l2.pos
         ) as senses
  from public.lemmas l2
  where l2.lemma = c.lemma
) s;
