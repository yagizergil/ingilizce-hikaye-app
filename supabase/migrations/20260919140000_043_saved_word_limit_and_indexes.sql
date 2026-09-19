-- 043: (a) tam sınırdaki kullanıcı zaten kayıtlı bir kelimeye dokununca
-- hata alıyordu, (b) dört gereksiz indeks ~100 MB yazma/depolama yükü.
--
-- ---------------------------------------------------------------------
-- (a) `enforce_saved_word_limit` -- idempotent kaydı reddediyordu
-- ---------------------------------------------------------------------
--
-- DENETİM BULGUSU (2026-09-19). Tetikleyici BEFORE INSERT ve kullanıcının
-- 100 satırı varsa koşulsuz hata veriyor. Ama `saveWord`
-- (`src/features/reader/api/useSavedWordsQuery.ts`) kaydı
-- `onConflict: "user_id,lemma", ignoreDuplicates: true` ile yazıyor, yani
-- `ON CONFLICT DO NOTHING`. PostgreSQL'de BEFORE INSERT tetikleyicileri
-- çakışma çözümünden ÖNCE çalışıyor: ifade aslında hiçbir şey yapmayacak
-- olsa bile tetikleyici hata veriyor.
--
-- Görünen sonuç: tam 100 kelimesi olan ücretsiz kullanıcı, ZATEN
-- kaydettiği bir kelimeye yeniden dokunduğunda "sınıra ulaştın" hatası
-- alıyor -- oysa migration 016'nın yorumu bu işlemin sessiz bir no-op
-- olacağını söylüyor. Kullanıcı yeni bir şey eklemeye çalışmıyor bile.
--
-- Düzeltme: satır o kullanıcı+lemma için zaten varsa tetikleyici hiç
-- saymıyor. Sınırın kendisi değişmedi; yalnızca gerçekten YENİ bir satır
-- için uygulanıyor.
--
-- ---------------------------------------------------------------------
-- (b) Gereksiz indeksler
-- ---------------------------------------------------------------------
--
-- Dördü de aynı sütun önekini ikinci kez indeksliyor; hiçbir sorgu
-- onlara ihtiyaç duymuyor, ama her INSERT/UPDATE hepsini güncelliyor.
-- Canlı boyutlar (üretimden ölçüldü):
--
--   book_paragraphs_section_id_idx (section_id, order_index)      88 MB
--     -> book_paragraphs_section_id_order_index_key ile BİREBİR aynı
--   book_lemmas_book_id_idx (book_id)                             11 MB
--     -> book_lemmas_pkey (book_id, lemma) önekinin ta kendisi
--   book_sections_book_id_idx (book_id, order_index)             664 kB
--     -> book_sections_book_id_order_index_key ile aynı
--   user_language_pairs_user_idx (user_id)                        16 kB
--     -> user_language_pairs_user_id_native_language_target_language_key
--        önekinin ta kendisi
--
-- Geri alma: her biri yukarıdaki `indexdef`i ile yeniden yaratılabilir.
-- `if exists` sayesinde migration tekrar çalıştırılabilir.

create or replace function public.enforce_saved_word_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tier text;
  v_count integer;
begin
  -- ZATEN KAYITLI bir kelime yeniden yazılıyorsa sınır hiç sorgulanmıyor.
  -- `ON CONFLICT DO NOTHING` ile gelen bu ifade hiçbir satır eklemeyecek;
  -- sınırı uygulamak, kullanıcıya yapmadığı bir şey için hata vermek olur.
  if exists (
    select 1 from public.user_saved_words w
    where w.user_id = new.user_id and w.lemma = new.lemma
  ) then
    return new;
  end if;

  select coalesce(e.tier, 'free')
    into v_tier
  from public.user_entitlements e
  where e.user_id = new.user_id;

  if v_tier is null then
    v_tier := 'free';
  end if;

  if v_tier <> 'free' then
    perform 1
    from public.user_entitlements e
    where e.user_id = new.user_id
      and (e.expires_at is null or e.expires_at > now());
    if not found then
      v_tier := 'free';
    end if;
  end if;

  if v_tier = 'free' then
    select count(*) into v_count
    from public.user_saved_words w
    where w.user_id = new.user_id;

    if v_count >= public.free_tier_saved_word_limit() then
      raise exception 'saved_word_limit_reached'
        using errcode = 'check_violation',
              hint = 'Ucretsiz katmanda en fazla 100 kelime kaydedilebilir.';
    end if;
  end if;

  return new;
end;
$function$;

drop index if exists public.book_paragraphs_section_id_idx;
drop index if exists public.book_lemmas_book_id_idx;
drop index if exists public.book_sections_book_id_idx;
drop index if exists public.user_language_pairs_user_idx;
