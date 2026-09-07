-- Orijinal (AI ile üretilmiş) içerik desteği: books tablosuna is_original,
-- target_level, generation_prompt_version eklenir.
--
-- SAPMA NOTU (spec'ten): görev tanımı "license/source üzerindeki CHECK
-- constraint'lerin 'proprietary'/'original' değerlerini de kabul edecek
-- şekilde genişletilmesini" istiyordu. Ancak public.books üzerinde
-- license/source kolonlarında HİÇBİR CHECK constraint yok (bkz.
-- 20260805084543_001_content_tables.sql — ikisi de düz `text`, kısıtlama
-- sadece content_type ve status kolonlarında). Bu yüzden burada
-- değiştirilecek bir constraint yok; license/source zaten serbest metin
-- olduğu için 'proprietary'/'original' değerleri ek bir şema değişikliği
-- olmadan yazılabiliyor. Bu migration sadece gerçekten var olan üç yeni
-- kolonu ekliyor.
begin;

alter table public.books
  add column is_original boolean not null default false,
  add column target_level text,
  add column generation_prompt_version text;

comment on column public.books.is_original is
  'true ise kitap public domain kaynaklı değil, pipeline/prompts altındaki bir LLM üretim promptuyla üretilmiş orijinal içeriktir.';
comment on column public.books.target_level is
  'is_original=true kitaplar için hedef CEFR seviyesi (A1/A2/B1) — markdown frontmatter''ından gelir, validator.py strict eşiklerini bu alana göre uygular.';
comment on column public.books.generation_prompt_version is
  'is_original=true kitaplar için üretimde kullanılan prompt dosyasının versiyonu (ör. "generate_story_a2_v1") — pipeline/prompts/ altındaki dosyayla eşleşir.';

commit;
