-- 029_ai_tier_limits.sql
-- AI cümle çevirisinin günlük kotasını katmana bağlar.
--
-- NEDEN (denetim bulgusu, 2026-09-07):
--   Paywall "AI destekli kelime ve cümle açıklamaları"nı premium faydası
--   olarak satıyordu ama `translate-sentence` Edge Function'ında kota
--   herkes için sabit 30/gün'dü — ücretsiz kullanıcı da aynı şeyi
--   alıyordu. Yani satılan fayda gerçekte var, sadece KATMANA BAĞLI
--   DEĞİLDİ. Apple'ın 2.3.1 (yanıltıcı metadata) açısından sorun,
--   üründe ise "premium neden alayım" sorusunun cevapsız kalması.
--
-- KARAR: özelliği premium'un arkasına tamamen kilitlemek yerine kotayı
-- katmana bağla.
--   Ücretsiz: 10/gün  — okuma akışını kesmez, ürün ilkesi #2 korunur.
--                        Bir oturumda takılınan cümle sayısı tipik olarak
--                        bunun altında; sınır ancak yoğun kullanımda
--                        hissedilir.
--   Premium:  200/gün — pratikte sınırsız, ama sağlayıcı maliyetine karşı
--                        bir tavan bırakır (kötüye kullanım/otomasyon).
--
-- Sayılar tek bir yerde: migration 024'teki `free_tier_saved_word_limit()`
-- ile aynı desen. Telemetri bu sınırların doğru olup olmadığını ölçtükçe
-- burada değişecek, kodun hiçbir yerinde kopyası olmayacak.

create or replace function public.ai_sentence_daily_limit(p_tier text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_tier = 'premium' then 200 else 10 end;
$$;

grant execute on function public.ai_sentence_daily_limit(text) to anon, authenticated, service_role;

comment on function public.ai_sentence_daily_limit(text) is
  'Katmana göre günlük AI cümle çevirisi kotası. Bkz. migration 029.';

-- ---------------------------------------------------------------------------
-- Kullanıcının kendi kotası
--
-- NEDEN AYRI BİR FONKSİYON: istemcinin "bugün 7 çeviri hakkın kaldı"
-- diyebilmesi için kullanım sayısını okuması gerekiyor. `ai_usage`'ta
-- kullanıcının kendi satırlarını okuma izni zaten var (migration 004) ama
-- sayımı ve sınır hesabını istemcide tekrar yazmak, sınırın iki yerde
-- tanımlanması demek olurdu. Tek çağrı, tek doğruluk kaynağı.
-- ---------------------------------------------------------------------------
create or replace function public.my_ai_sentence_quota()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tier text;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    return jsonb_build_object('isPremium', false, 'limit', 0, 'used', 0, 'remaining', 0);
  end if;

  -- Süresi dolmuş abonelik ücretsiz sayılır — migration 024'teki
  -- enforce_saved_word_limit ile aynı kural.
  select case
           when e.tier = 'premium' and (e.expires_at is null or e.expires_at > now())
             then 'premium'
           else 'free'
         end
    into v_tier
  from public.user_entitlements e
  where e.user_id = v_user_id;

  v_tier := coalesce(v_tier, 'free');
  v_limit := public.ai_sentence_daily_limit(v_tier);

  select count(*)::integer
    into v_used
  from public.ai_usage u
  where u.user_id = v_user_id
    and u.feature = 'sentence_translation'
    and u.created_at >= now() - interval '24 hours';

  -- `freeLimit` ve `premiumLimit` de dönüyor: paywall "ücretsizde 10,
  -- premium'da 200" diyebilmek için bu iki sayıya ihtiyaç duyuyor ve
  -- onları arayüz metnine gömmek sınırı ikinci bir yerde tanımlamak
  -- olurdu. Sayıların tek sahibi `ai_sentence_daily_limit()`.
  return jsonb_build_object(
    'isPremium', v_tier = 'premium',
    'limit', v_limit,
    'used', v_used,
    'remaining', greatest(v_limit - v_used, 0),
    'freeLimit', public.ai_sentence_daily_limit('free'),
    'premiumLimit', public.ai_sentence_daily_limit('premium')
  );
end;
$$;

grant execute on function public.my_ai_sentence_quota() to authenticated;

comment on function public.my_ai_sentence_quota() is
  'Çağıranın son 24 saatteki AI cümle çevirisi kotası ve kullanımı.';
