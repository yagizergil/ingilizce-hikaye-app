-- book_lemmas (book_id, lemma, count) pos TUTMUYOR — bu tasarım
-- gereği (kitap yayınlarken pos'a göre ayrı satır yazmak gereksiz
-- karmaşıklık olurdu). Ama lemmas tablosunun PK'sı (lemma, pos) ve
-- 631 lemma birden fazla pos ile kayıtlı (farklı kitaplarda farklı
-- spaCy pos tahmini almış aynı kelime) — bu yüzden
-- "book_lemmas.lemma = lemmas.lemma" join'i BELİRSİZ, uygulama
-- hangi tr_gloss'un döneceğini garanti edemiyor.
--
-- Kalıcı çözüm: is_canonical gibi elle bakımı gereken bir flag
-- kolonu yerine, sorgu zamanında TEK kanonik satırı seçen bir view.
-- Pipeline'da hiçbir değişiklik gerekmez — gelecekte yeni pos
-- varyantları eklense bile view otomatik doğru kalır.
--
-- Seçim önceliği (frequency_rank şu an pipeline'da hiç doldurulmuyor,
-- bu yüzden dayanılamıyor — bkz. ayrı not):
--   1. cefr_level dolu olan satır (CEFR-J'de gerçekten var demek)
--   2. dilbilgisel öncelik: noun > verb > adjective > adverb >
--      preposition > determiner > pronoun > diğer
--   3. alfabetik pos (tam determinizm için)
create or replace view public.lemma_canonical as
select distinct on (lemma)
  lemma, pos, cefr_level, frequency_rank, tr_gloss, ipa, audio_url,
  is_phrasal, false_friend_note_tr
from public.lemmas
order by
  lemma,
  (cefr_level is null),
  case pos
    when 'noun' then 1
    when 'verb' then 2
    when 'adjective' then 3
    when 'adverb' then 4
    when 'preposition' then 5
    when 'determiner' then 6
    when 'pronoun' then 7
    else 8
  end,
  pos;

grant select on public.lemma_canonical to anon, authenticated;
