-- 049: "Akıllı Tekrar" (smart practice) oturum kotası.
--
-- Akıllı Tekrar premium bir özellik; ücretsiz kullanıcı 24 saatte BİR deneme
-- oturumu açabiliyor (rakip analizi, 2026-09-24: Quizlet'in Learn modunu
-- ücretsizde sınırlı turla tattırıp Plus'a çevirmesiyle aynı model).
--
-- Karar istemcide DEĞİL burada veriliyor (ADR-009, migration 038 deseni):
-- istemciyi değiştirebilen biri sınırı da kaldırabilirdi. Sayaç yeni bir
-- tablo açmadan `ai_usage`'a `feature = 'smart_practice'` satırı olarak
-- yazılıyor; o tabloda istemci insert policy'si yok, yazan tek yol bu
-- SECURITY DEFINER fonksiyon.

create or replace function public.smart_practice_daily_limit(p_tier text)
returns integer
language sql
immutable
set search_path to ''
as $function$
  -- Premium'da sınır yok; null "sınırsız" demek.
  select case when p_tier = 'premium' then null else 1 end;
$function$;

create or replace function public.my_smart_practice_quota()
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
  v_limit := public.smart_practice_daily_limit(v_tier);

  select count(*)::integer
    into v_used
  from public.ai_usage u
  where u.user_id = v_user_id
    and u.feature = 'smart_practice'
    and u.created_at >= now() - interval '24 hours';

  return jsonb_build_object(
    'isPremium', v_tier = 'premium',
    'limit', v_limit,
    'used', v_used,
    'remaining', case when v_limit is null then null else greatest(v_limit - v_used, 0) end
  );
end;
$function$;

create or replace function public.consume_smart_practice()
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

  v_quota := public.my_smart_practice_quota();
  v_limit := nullif(v_quota->>'limit', '')::integer;
  v_used := (v_quota->>'used')::integer;

  if v_limit is null then
    return jsonb_build_object('allowed', true, 'isPremium', true, 'remaining', null);
  end if;

  if v_used >= v_limit then
    return jsonb_build_object('allowed', false, 'isPremium', false, 'remaining', 0);
  end if;

  insert into public.ai_usage (user_id, feature) values (v_user_id, 'smart_practice');

  return jsonb_build_object(
    'allowed', true,
    'isPremium', false,
    'remaining', greatest(v_limit - v_used - 1, 0)
  );
end;
$function$;

revoke all on function public.smart_practice_daily_limit(text) from public;
grant execute on function public.smart_practice_daily_limit(text) to authenticated, anon, service_role;
revoke all on function public.my_smart_practice_quota() from public;
grant execute on function public.my_smart_practice_quota() to authenticated, anon, service_role;
revoke all on function public.consume_smart_practice() from public;
grant execute on function public.consume_smart_practice() to authenticated, anon, service_role;
