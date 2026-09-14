-- 038: Ücretsiz katmanda GÜNLÜK KELİME ÇEVİRİSİ kotası
--
-- NE DEĞİŞİYOR: ücretsiz kullanıcı günde 15 kelime çevirisi yapabiliyor;
-- premium sınırsız. Okuma ekranının sağ üstündeki sayaç bu kotanın kalanını
-- gösteriyor, sıfırlandığında paywall açılıyor.
--
-- NEDEN SUNUCUDA: kotayı istemcide saymak, uygulamayı kapatıp açmakla ya da
-- saati değiştirmekle sıfırlanabilir bir "sınır" demekti -- yani hiç sınır
-- değil. Aynı sebeple `ai_usage`'a yazma yetkisi istemciye VERİLMİYOR;
-- sayaç yalnızca bu SECURITY DEFINER fonksiyonlar üzerinden artıyor
-- (ADR-009'daki "tek yazar" deseninin aynısı).
--
-- NEDEN `ai_usage` TABLOSU: cümle çevirisi kotası zaten bu tabloyu
-- kullanıyor (migration 029) ve aynı şekli taşıyor -- ikinci bir sayaç
-- tablosu, ikinci bir temizleme işi ve ikinci bir "24 saat" tanımı demekti.
-- Ayrım `feature` sütununda.
--
-- 24 SAAT, TAKVİM GÜNÜ DEĞİL: cümle kotasıyla aynı pencere. Takvim günü,
-- kullanıcının saat dilimine göre değişen bir sıfırlama anı demek; kayan
-- 24 saat her cihazda aynı şekilde davranıyor.

create or replace function public.word_lookup_daily_limit(p_tier text)
returns integer
language sql
immutable
set search_path to ''
as $function$
  -- Premium'da sınır yok; null "sınırsız" demek.
  select case when p_tier = 'premium' then null else 15 end;
$function$;

create or replace function public.my_word_lookup_quota()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_tier text;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    return jsonb_build_object('isPremium', false, 'limit', 0, 'used', 0, 'remaining', 0);
  end if;

  select case
           when e.tier = 'premium' and (e.expires_at is null or e.expires_at > now())
             then 'premium'
           else 'free'
         end
    into v_tier
  from public.user_entitlements e
  where e.user_id = v_user_id;

  v_tier := coalesce(v_tier, 'free');
  v_limit := public.word_lookup_daily_limit(v_tier);

  select count(*)::integer
    into v_used
  from public.ai_usage u
  where u.user_id = v_user_id
    and u.feature = 'word_lookup'
    and u.created_at >= now() - interval '24 hours';

  return jsonb_build_object(
    'isPremium', v_tier = 'premium',
    'limit', v_limit,
    'used', v_used,
    'remaining', case when v_limit is null then null else greatest(v_limit - v_used, 0) end,
    'freeLimit', public.word_lookup_daily_limit('free')
  );
end;
$function$;

-- Kotayı OKUYUP TÜKETEN tek çağrı.
--
-- NEDEN TEK ÇAĞRI: "önce sor, sonra yaz" iki ayrı çağrı olsaydı, hızlı
-- dokunuşlarda iki istek de sınırın altında cevap alıp ikisi birden
-- yazabilirdi. Kontrol ve yazma aynı fonksiyonda.
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

  v_quota := public.my_word_lookup_quota();
  v_limit := nullif(v_quota->>'limit', '')::integer;
  v_used := (v_quota->>'used')::integer;

  -- Premium (limit null): sayaç tutulmuyor, her zaman serbest.
  if v_limit is null then
    return jsonb_build_object(
      'allowed', true,
      'isPremium', true,
      'limit', null,
      'used', v_used,
      'remaining', null
    );
  end if;

  if v_used >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'isPremium', false,
      'limit', v_limit,
      'used', v_used,
      'remaining', 0
    );
  end if;

  insert into public.ai_usage (user_id, feature) values (v_user_id, 'word_lookup');

  return jsonb_build_object(
    'allowed', true,
    'isPremium', false,
    'limit', v_limit,
    'used', v_used + 1,
    'remaining', greatest(v_limit - (v_used + 1), 0)
  );
end;
$function$;

revoke all on function public.word_lookup_daily_limit(text) from public;
grant execute on function public.word_lookup_daily_limit(text) to authenticated, anon, service_role;
revoke all on function public.my_word_lookup_quota() from public;
grant execute on function public.my_word_lookup_quota() to authenticated, anon, service_role;
revoke all on function public.consume_word_lookup() from public;
grant execute on function public.consume_word_lookup() to authenticated, anon, service_role;
