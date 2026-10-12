-- 057: Ücretsiz günlük çeviri kotası 15 -> 10 ve CÜMLE çevirisi aynı kotaya bağlı
--
-- ÜRÜN KARARI (1.1.0): ücretsiz kullanıcı günde TOPLAM 10 çeviri yapabilir;
-- bir kelime çevirisi 1 hak, bir cümle çevirisi 1 hak. Premium'da kelime
-- sınırsız, cümle çevirisi migration 029'daki premium tavanında (200) kalıyor.
--
-- NEDEN CÜMLE = 1 HAK (2 değil): kullanıcıya anlatılabilir tek kural
-- "günde 10 çeviri". Cümle LLM maliyeti daha yüksek ama ücretsiz kullanıcının
-- günlük üst sınırı 10 LLM çağrısında kalıyor -- maliyet zaten sınırlı.
--
-- ÖNCESİ: cümle çevirisi ayrı bir 10'luk kotadaydı (029) ve kelime kotasıyla
-- hiç toplanmıyordu: ücretsiz kullanıcı günde 15 kelime + 10 cümle alıyordu.
--
-- SAYAÇ: ikisi de `ai_usage`'ta, ayrım `feature` sütununda ('word_lookup',
-- 'sentence_translation'). Ücretsiz katmanda kullanım = ikisinin toplamı.
--
-- YARIŞ: iki tüketim fonksiyonu da kullanıcı başına bir transaction advisory
-- lock alıyor; aynı anda gelen kelime + cümle istekleri sınırı aşamaz.

create or replace function public.word_lookup_daily_limit(p_tier text)
returns integer
language sql
immutable
set search_path to ''
as $function$
  -- Premium'da kelime sınırı yok; null "sınırsız" demek. Ücretsiz katmanda
  -- bu sayı kelime + cümle çevirisinin ORTAK günlük hakkı.
  select case when p_tier = 'premium' then null else 10 end;
$function$;

-- Ücretsiz katmanın ortak kullanımı (son 24 saat, kelime + cümle).
create or replace function public.free_translation_used(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path to ''
as $function$
  select count(*)::integer
  from public.ai_usage u
  where u.user_id = p_user_id
    and u.feature in ('word_lookup', 'sentence_translation')
    and u.created_at >= now() - interval '24 hours';
$function$;

revoke all on function public.free_translation_used(uuid) from public, anon, authenticated;
grant execute on function public.free_translation_used(uuid) to service_role;

create or replace function public.my_word_lookup_quota()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_premium boolean;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    return jsonb_build_object('isPremium', false, 'limit', 0, 'used', 0, 'remaining', 0);
  end if;

  v_premium := public.has_active_premium();

  if v_premium then
    select count(*)::integer into v_used
    from public.ai_usage u
    where u.user_id = v_user_id
      and u.feature = 'word_lookup'
      and u.created_at >= now() - interval '24 hours';
    v_limit := null;
  else
    v_used := public.free_translation_used(v_user_id);
    v_limit := public.word_lookup_daily_limit('free');
  end if;

  return jsonb_build_object(
    'isPremium', v_premium,
    'limit', v_limit,
    'used', v_used,
    'remaining', case when v_limit is null then null else greatest(v_limit - v_used, 0) end,
    'freeLimit', public.word_lookup_daily_limit('free')
  );
end;
$function$;

create or replace function public.consume_word_lookup()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_quota jsonb;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext('translation_quota:' || v_user_id::text));

  v_quota := public.my_word_lookup_quota();
  v_limit := nullif(v_quota->>'limit', '')::integer;
  v_used := (v_quota->>'used')::integer;

  if v_limit is null then
    -- Premium: sayaç tutulmuyor (038 ile aynı), her zaman serbest.
    return jsonb_build_object('allowed', true, 'isPremium', true, 'limit', null, 'used', v_used, 'remaining', null);
  end if;

  if v_used >= v_limit then
    return jsonb_build_object('allowed', false, 'isPremium', false, 'limit', v_limit, 'used', v_used, 'remaining', 0);
  end if;

  insert into public.ai_usage (user_id, feature) values (v_user_id, 'word_lookup');

  return jsonb_build_object('allowed', true, 'isPremium', false, 'limit', v_limit, 'used', v_used + 1, 'remaining', greatest(v_limit - (v_used + 1), 0));
end;
$function$;

-- Cümle çevirisi kotası: ücretsizde ORTAK sayaç, premium'da 029'daki tavan.
create or replace function public.my_ai_sentence_quota()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_premium boolean;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    return jsonb_build_object('isPremium', false, 'limit', 0, 'used', 0, 'remaining', 0);
  end if;

  v_premium := public.has_active_premium();

  if v_premium then
    v_limit := public.ai_sentence_daily_limit('premium');
    select count(*)::integer into v_used
    from public.ai_usage u
    where u.user_id = v_user_id
      and u.feature = 'sentence_translation'
      and u.created_at >= now() - interval '24 hours';
  else
    v_limit := public.word_lookup_daily_limit('free');
    v_used := public.free_translation_used(v_user_id);
  end if;

  return jsonb_build_object(
    'isPremium', v_premium,
    'limit', v_limit,
    'used', v_used,
    'remaining', greatest(v_limit - v_used, 0),
    'freeLimit', public.word_lookup_daily_limit('free'),
    'premiumLimit', public.ai_sentence_daily_limit('premium')
  );
end;
$function$;

-- translate-sentence Edge Function'ının LLM'i çağırmadan ÖNCE çağırdığı tek
-- kontrol+yazma. Çağıranın JWT'siyle çalışır (auth.uid()).
create or replace function public.consume_sentence_translation()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_quota jsonb;
  v_limit integer;
  v_used integer;
  v_premium boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext('translation_quota:' || v_user_id::text));

  v_quota := public.my_ai_sentence_quota();
  v_limit := (v_quota->>'limit')::integer;
  v_used := (v_quota->>'used')::integer;
  v_premium := (v_quota->>'isPremium')::boolean;

  if v_used >= v_limit then
    return jsonb_build_object('allowed', false, 'isPremium', v_premium, 'limit', v_limit, 'used', v_used, 'remaining', 0);
  end if;

  insert into public.ai_usage (user_id, feature) values (v_user_id, 'sentence_translation');

  return jsonb_build_object('allowed', true, 'isPremium', v_premium, 'limit', v_limit, 'used', v_used + 1, 'remaining', greatest(v_limit - (v_used + 1), 0));
end;
$function$;

revoke all on function public.consume_sentence_translation() from public, anon;
grant execute on function public.consume_sentence_translation() to authenticated, service_role;

-- KELİME ANLAMI SUNUCU KAPISI (translate-lemma).
--
-- BULGU (2026-10-12, canlı veri, son 30 gün): `live_word_translation` 89
-- kullanıcı / 585 çağrı, `word_lookup` 54 kullanıcı. translate-lemma kotayı
-- hiç sormuyordu; tek kapı istemcideki `consume_word_lookup()` çağrısıydı.
-- Okuyucuda her dokunuş zaten bir hak tüketiyor, ama onboarding'in ilk okuma
-- adımı tüketmiyordu (word_lookup'u olmayan 47 kullanıcının 43'ü ilk
-- çevirisini hesap açılışından sonraki 10 dk içinde yaptı) ve değiştirilmiş
-- bir istemci translate-lemma'yı doğrudan, önbellek isabetleri dahil
-- sınırsız çağırabiliyordu.
--
-- MODEL (çift sayım yok): istemci dokunuşta `consume_word_lookup()` ile bir
-- hak tüketiyor (değişmedi). Bu fonksiyon bir anlam isteğini (LLM ya da
-- önbellek) ancak son 24 saatte tüketilmiş hak sayısı karşılığında veriyor:
-- verilen anlam sayısı ('word_gloss') <= tüketilen hak ('word_lookup') +
-- küçük pay (istemcinin retry:1'i ve aynı kartın yeniden açılması için).
-- Yani hak tüketilmeden anlam verilmez, ama tüketilen hak ikinci kez düşmez.
create or replace function public.authorize_word_gloss()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_consumed integer;
  v_served integer;
  v_slack constant integer := 3;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if public.has_active_premium() then
    return jsonb_build_object('allowed', true, 'isPremium', true);
  end if;

  perform pg_advisory_xact_lock(hashtext('translation_quota:' || v_user_id::text));

  select count(*) filter (where u.feature = 'word_lookup')::integer,
         count(*) filter (where u.feature = 'word_gloss')::integer
    into v_consumed, v_served
  from public.ai_usage u
  where u.user_id = v_user_id
    and u.feature in ('word_lookup', 'word_gloss')
    and u.created_at >= now() - interval '24 hours';

  if v_served >= v_consumed + v_slack then
    return jsonb_build_object('allowed', false, 'isPremium', false, 'consumed', v_consumed, 'served', v_served);
  end if;

  insert into public.ai_usage (user_id, feature) values (v_user_id, 'word_gloss');
  return jsonb_build_object('allowed', true, 'isPremium', false, 'consumed', v_consumed, 'served', v_served + 1);
end;
$function$;

revoke all on function public.authorize_word_gloss() from public, anon;
grant execute on function public.authorize_word_gloss() to authenticated, service_role;
