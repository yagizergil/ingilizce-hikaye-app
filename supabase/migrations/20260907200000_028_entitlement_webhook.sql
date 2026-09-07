-- 028_entitlement_webhook.sql
-- Yetki satırının tek yazarı: RevenueCat webhook'u.
--
-- NEDEN BU MIGRATION VAR (denetim bulgusu, 2026-09-07):
--   `user_entitlements` migration 002'den beri YALNIZCA bir select
--   politikasına sahip. Yani istemcinin `syncEntitlementToServer()`
--   içindeki upsert'i RLS tarafından sessizce reddediliyordu; hata
--   trackError'a yazılıp yutuluyor, `purchasePackage` yine "success"
--   dönüyordu. Sonuç: kullanıcı ödüyor, tier 'free' kalıyor, premium
--   hiç açılmıyordu.
--
--   CLAUDE.md ve docs/RELEASE.md bunun tersini söylüyordu ("istemci
--   yazıyor, kararlı bir kullanıcı premium'u kendine açabilir"). Bu
--   yanlıştı: RLS zaten yazmayı engelliyordu. Gerçek risk güvenlik değil,
--   GELİR kaybıydı.
--
-- KARAR: select-only RLS aynen kalıyor (doğru olan buydu). Eksik olan
-- yazar tarafı ekleniyor — `revenuecat-webhook` Edge Function'ı
-- service_role ile yazar; service_role RLS'yi bypass ettiği için yeni bir
-- insert/update policy'sine GEREK YOK ve bilerek eklenmiyor. Bir policy
-- eklemek, istemciye yazma yolu açma riskini geri getirirdi.
--
-- Bu migration yalnızca webhook'un idempotent ve sıralamaya dayanıklı
-- çalışması için gereken denetim alanlarını ekliyor.

-- ---------------------------------------------------------------------------
-- Denetim ve idempotans alanları
-- ---------------------------------------------------------------------------

-- Hangi ürün satın alındı (App Store product id). Fiyat/plan analizi ve
-- destek taleplerini çözmek için; kod bu alana bakarak karar VERMEZ.
alter table public.user_entitlements
  add column if not exists product_id text;

-- 'app_store' | 'play_store' | 'promotional' | 'stripe' ... RevenueCat'in
-- gönderdiği store alanı. Android'e çıkarken ayrıştırma gerekirse hazır.
alter table public.user_entitlements
  add column if not exists store text;

-- RevenueCat olayının kimliği. Aynı olay iki kez teslim edilirse (webhook
-- teslimi "at least once" garantisi verir) ikinci yazma atlanır.
alter table public.user_entitlements
  add column if not exists rc_event_id text;

-- Olayın RevenueCat'teki zaman damgası (ms). Webhook teslimleri SIRASIZ
-- gelebilir: bir CANCELLATION, kendisinden sonra üretilmiş bir RENEWAL'dan
-- önce ulaşabilir. Bu alan olmadan eski bir olay yeni durumu ezerdi.
alter table public.user_entitlements
  add column if not exists rc_event_ms bigint;

-- Kullanıcı şu an ücretsiz deneme süresinde mi. Paywall'da "denemen X
-- günde bitiyor" demek ve deneme→ücretli dönüşümünü ölçmek için.
alter table public.user_entitlements
  add column if not exists is_trial boolean not null default false;

create unique index if not exists user_entitlements_rc_event_id_idx
  on public.user_entitlements (rc_event_id)
  where rc_event_id is not null;

comment on table public.user_entitlements is
  'Abonelik yetkisi. TEK YAZAR: revenuecat-webhook Edge Function (service_role). '
  'İstemcinin yazma yolu YOKTUR ve açılmamalıdır — bkz. migration 028.';

comment on column public.user_entitlements.rc_event_ms is
  'RevenueCat olay zamanı (ms). Webhook sırasız teslim edebildiği için, '
  'bundan eski bir olay mevcut satırı ezmez.';

-- ---------------------------------------------------------------------------
-- Yetki yazma fonksiyonu
--
-- NEDEN FONKSİYON: sıralama ve idempotans kuralı tek bir yerde, SQL
-- tarafında dursun. Edge Function'ın içine yazılsaydı, ileride ikinci bir
-- yazar (örn. Android webhook'u, destek aracı) eklendiğinde kural
-- kopyalanmak zorunda kalırdı.
--
-- security definer + service_role grant: yalnızca Edge Function çağırabilir.
-- ---------------------------------------------------------------------------
create or replace function public.apply_entitlement_event(
  p_user_id uuid,
  p_tier text,
  p_expires_at timestamptz,
  p_product_id text,
  p_store text,
  p_event_id text,
  p_event_ms bigint,
  p_is_trial boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_ms bigint;
  v_existing_event text;
begin
  if p_tier not in ('free', 'premium') then
    raise exception 'invalid_tier: %', p_tier;
  end if;

  select e.rc_event_ms, e.rc_event_id
    into v_existing_ms, v_existing_event
  from public.user_entitlements e
  where e.user_id = p_user_id;

  -- Aynı olay ikinci kez geldi.
  if v_existing_event is not null and v_existing_event = p_event_id then
    return 'duplicate';
  end if;

  -- Sırası geçmiş olay: mevcut satır daha yeni bir olaydan geliyor.
  if v_existing_ms is not null and p_event_ms is not null and p_event_ms < v_existing_ms then
    return 'stale';
  end if;

  insert into public.user_entitlements as e (
    user_id, tier, expires_at, source, product_id, store,
    rc_event_id, rc_event_ms, is_trial, updated_at
  )
  values (
    p_user_id, p_tier, p_expires_at, 'revenuecat', p_product_id, p_store,
    p_event_id, p_event_ms, coalesce(p_is_trial, false), now()
  )
  on conflict (user_id) do update set
    tier         = excluded.tier,
    expires_at   = excluded.expires_at,
    source       = excluded.source,
    product_id   = excluded.product_id,
    store        = excluded.store,
    rc_event_id  = excluded.rc_event_id,
    rc_event_ms  = excluded.rc_event_ms,
    is_trial     = excluded.is_trial,
    updated_at   = now();

  return 'applied';
end;
$$;

revoke execute on function public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean
) from public, anon, authenticated;

grant execute on function public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean
) to service_role;

comment on function public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean
) is
  'RevenueCat olayını yetki satırına uygular. Idempotent (rc_event_id) ve '
  'sıralamaya dayanıklı (rc_event_ms). Yalnızca service_role çağırabilir.';
