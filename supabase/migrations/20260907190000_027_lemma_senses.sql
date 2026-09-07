-- 027_lemma_senses.sql
-- `lemma_canonical` view'ine kelimenin TÜM anlamlarını taşıyan bir sütun
-- ekler.
--
-- ÇÖZÜLEN HATA: view `distinct on (lemma)` ile her kelimeden tek satır
-- seçiyor ve sıralaması ismi fiilden önce koyuyordu. Ölçüm: `lemmas`
-- tablosunda 30.615 satır, 26.100 farklı kelime var; 4.079 kelimenin
-- birden fazla anlamı, bunların 2.345'inin hem isim hem fiil anlamı var.
-- View bu 2.345 kelimenin tamamında FİİL anlamını atıyordu.
--
-- Kullanıcı bunu şöyle görüyordu: hikâyede "He watched the door" cümlesinde
-- "watched" kelimesine dokunuyor, karşılık olarak "kol saati" yazıyor.
-- Çeviri "yok" değil, YANLIŞ anlamdı — ve veri zaten veritabanında duruyordu.
--
-- NEDEN SATIR ÇOĞALTMAK YERİNE SÜTUN: istemci tarafı bu view'i kelime
-- başına TEK satır olarak okuyor ve sonucu `Map<lemma, entry>` olarak
-- SQLite'a önbellekliyor (bkz. useBookLemmaDictionary.ts). Satır başına
-- birden çok kayıt döndürmek o önbelleğin şeklini, serileştirmesini ve
-- bütün tüketicilerini değiştirmek demekti. Anlamları tek bir jsonb
-- sütununda taşımak aynı bilgiyi sıfır kırılmayla veriyor; mevcut
-- sorgular sütunu seçmedikleri sürece etkilenmiyor.
--
-- Birincil satırın seçimi ve sırası BİLEREK değiştirilmedi: 26.100
-- kelimenin gösterilen ana karşılığını topluca değiştirmek ayrı bir karar.
-- İstemci, çekim ekinden çıkardığı ipucuyla (bkz. tokenizer.js
-- `inflectionHint`) doğru anlamı bu listeden kendisi seçiyor.

create or replace view public.lemma_canonical
with (security_invoker = true)
as
with ranked as (
  select
    l.*,
    row_number() over (
      partition by l.lemma
      order by
        (l.cefr_level is null),
        case l.pos
          when 'noun' then 1
          when 'verb' then 2
          when 'adjective' then 3
          when 'adverb' then 4
          when 'preposition' then 5
          when 'determiner' then 6
          when 'pronoun' then 7
          else 8
        end,
        l.pos
    ) as sense_rank
  from public.lemmas l
),
grouped as (
  select
    lemma,
    jsonb_agg(
      jsonb_build_object('pos', pos, 'tr_gloss', tr_gloss)
      order by sense_rank
    ) as senses
  from ranked
  group by lemma
)
select
  r.lemma,
  r.pos,
  r.cefr_level,
  r.frequency_rank,
  r.tr_gloss,
  r.ipa,
  r.audio_url,
  r.is_phrasal,
  r.false_friend_note_tr,
  g.senses
from ranked r
join grouped g on g.lemma = r.lemma
where r.sense_rank = 1;

comment on view public.lemma_canonical is
  'Kelime basina tek satir sozluk. `senses` sutunu o kelimenin TUM anlamlarini (pos + tr_gloss) oncelik sirasiyla tasir — bkz. migration 027.';
