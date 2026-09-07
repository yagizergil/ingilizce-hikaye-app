-- 024_free_tier_saved_word_limit.sql
-- Ücretsiz katmanın kayıtlı kelime sınırı.
--
-- NEDEN BU SINIR, BAŞKASI DEĞİL (bkz.
-- docs/plans/2026-09-07-eksik-katmanlar-design.md):
--   Ürün ilkesi #1 okuma ekranında paywall yasaklıyor, ilke #2 ücretsiz
--   katmanın gerçekten kullanılabilir olmasını istiyor. İkisini birden
--   sağlayan tek sınır türü okuma akışını KESMEYEN bir sınır. Okuma,
--   bölümler, offline önbellek, kelimeye dokunup Türkçe karşılığı görme —
--   hepsi sınırsız ve ücretsiz kalıyor. Sınırlanan tek şey defterin boyutu.
--
--   Tekrar sayısı da sınırlanmıyor: kaydettiğin 100 kelimeyi sınırsız
--   tekrar edebilirsin. Çekirdek öğrenme döngüsünü sakatlamak ücretsiz
--   katmanı "kullanılamaz" yapardı.
--
-- NEDEN SUNUCUDA: istemci sayımına güvenilemez. İstemci bu hatayı yakalayıp
-- nötr bir mesaj gösteriyor (yükseltme çağrısı DEĞİL — kelime kaydetme
-- okuma ekranının içinde gerçekleşiyor, ilke #1).

create or replace function public.enforce_saved_word_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_count integer;
begin
  -- Yetki satırı hiç yoksa kullanıcı ücretsiz katmandadır.
  select coalesce(e.tier, 'free')
    into v_tier
  from public.user_entitlements e
  where e.user_id = new.user_id;

  if v_tier is null then
    v_tier := 'free';
  end if;

  -- Süresi dolmuş bir abonelik ücretsiz sayılır.
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
              hint = 'Ücretsiz katmanda en fazla 100 kelime kaydedilebilir.';
    end if;
  end if;

  return new;
end;
$$;

-- Sınır tek bir yerde tanımlı: telemetri (migration 020) bu sayının doğru
-- olup olmadığını ölçtükçe burada değiştirilecek, kodun hiçbir yerinde
-- kopyası olmayacak.
create or replace function public.free_tier_saved_word_limit()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 100;
$$;

grant execute on function public.free_tier_saved_word_limit() to anon, authenticated;

drop trigger if exists enforce_saved_word_limit on public.user_saved_words;

create trigger enforce_saved_word_limit
  before insert on public.user_saved_words
  for each row
  execute function public.enforce_saved_word_limit();

comment on function public.enforce_saved_word_limit() is
  'Ücretsiz katmanda kayıtlı kelime sayısını sınırlar. Bkz. migration 024.';
