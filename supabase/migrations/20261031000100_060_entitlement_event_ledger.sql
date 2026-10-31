-- 060: RevenueCat olay defteri, sandbox/production ayrımı ve yazmada kilit.
--
-- KAYNAK: paywall Faz 1, C5 (PAYWALL-KARSILASTIRMA-VE-COZUM.md) ve mevcut
-- durum raporunun G2/G3 bulguları. ADR-009'un tek yazarlı zinciri
-- DEĞİŞMİYOR: yazar yine yalnızca service_role (revenuecat-webhook,
-- sync-entitlement) ve yine yalnızca bu fonksiyon üzerinden.
--
-- 028'DE NE EKSİKTİ:
--
-- 1) İDEMPOTANS YALNIZCA "SON OLAY"A BAKIYORDU. `rc_event_id` satırda tek
--    bir değer; aynı olay, arada başka bir olay işlenmişse ve zaman damgası
--    eşitse (ya da `event_timestamp_ms` gelmemişse) ikinci kez uygulanıyordu.
--    Artık her olay kimliği `revenuecat_events` defterine bir kez yazılıyor;
--    defterde olan kimlik ne zaman gelirse gelsin 'duplicate'.
--
-- 2) SANDBOX AYRIMI YOKTU (G2). TestFlight/sandbox olayları üretim satırını
--    ezebiliyordu: üretimde aktif premium'u olan bir hesapta sandbox'ta
--    denenen ve 5 dakikada biten bir abonelik EXPIRATION'ı satırı 'free'
--    yapardı. Artık satırın son olayı PRODUCTION ise ve o premium hâlâ
--    geçerliyse sandbox olayı uygulanmıyor ('sandbox_ignored').
--
--    SANDBOX TAMAMEN YOK SAYILMIYOR (bilinçli): App Review satın almayı
--    üretimdeki uygulamada SANDBOX ortamında yapar. Sandbox olaylarını
--    düşürmek, inceleyicinin ödemesinin premium açmaması demek -- Guideline
--    2.1 reddi. Sandbox satırı `rc_environment = 'SANDBOX'` ile işaretli
--    kalıyor; analiz ve dönüşüm sorguları bunu süzebilir.
--
-- 3) EŞZAMANLI İKİ OLAY SIRAYI BOZABİLİYORDU. Okuma (sıra kontrolü) ile
--    yazma arasında kilit yoktu; satırı henüz olmayan kullanıcı için aynı
--    anda gelen iki olaydan eski olanı sonra yazabilirdi. Kullanıcı başına
--    transaction advisory lock (057'deki kota deseniyle aynı).
--
-- İMZA: iki yeni parametre (`p_environment`, `p_event_type`) VARSAYILANLI.
-- Eski 8 parametreli sürüm DÜŞÜRÜLÜYOR: aynı adla iki aşırı yükleme kalsaydı
-- PostgREST'in adlandırılmış argümanlı RPC çağrısı belirsiz olurdu. Canlıdaki
-- webhook v6 ve sync-entitlement 8 argümanla çağırıyor; varsayılanlar
-- sayesinde yeni fonksiyonu da sorunsuz çağırır. Yani sıra: önce bu
-- migration, sonra edge function'lar -- ama ters sıra da bir şey bozmaz
-- (yeni edge function eski fonksiyonu 10 argümanla çağırırsa 'function does
-- not exist' alır ve 500 döner; RevenueCat yeniden dener). ÖNERİLEN SIRA:
-- migration -> webhook -> sync-entitlement.
--
-- İdempotent: tablo/indeks/sütun `if not exists`, politika drop+create,
-- fonksiyon drop-if-exists + create or replace.
--
-- GERİ ALMA (önce edge function'lar eski sürüme alınmalı):
--   drop function if exists public.apply_entitlement_event(
--     uuid, text, timestamptz, text, text, text, bigint, boolean, text, text);
--   -- 028'deki 8 parametreli tanım aynen yeniden çalıştırılır (grant'leriyle).
--   drop table if exists public.revenuecat_events;
--   alter table public.user_entitlements drop column if exists rc_environment;

-- ---------------------------------------------------------------------------
-- Satırın son olayının ortamı
-- ---------------------------------------------------------------------------
alter table public.user_entitlements
  add column if not exists rc_environment text;

comment on column public.user_entitlements.rc_environment is
  'Satırı son yazan olayın RevenueCat ortamı: PRODUCTION | SANDBOX | null '
  '(060 öncesi ya da ortamı bilinmeyen). Sandbox, üretimde aktif premium''u ezemez.';

-- ---------------------------------------------------------------------------
-- Olay defteri
-- ---------------------------------------------------------------------------
create table if not exists public.revenuecat_events (
  -- RevenueCat olay kimliği. TRANSFER'de alıcı/verici için `:to`/`:from`
  -- ekli, sync-entitlement'ta `sync:` önekli durum kimliği.
  event_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text,
  environment text,
  event_ms bigint,
  tier text not null,
  -- applied | stale | sandbox_ignored | duplicate_last (satırın son olayı)
  outcome text not null,
  received_at timestamptz not null default now(),

  constraint revenuecat_events_environment_valid
    check (environment is null or environment in ('PRODUCTION', 'SANDBOX')),
  constraint revenuecat_events_tier_valid check (tier in ('free', 'premium'))
);

create index if not exists revenuecat_events_user_time_idx
  on public.revenuecat_events (user_id, received_at desc);

comment on table public.revenuecat_events is
  'Yetkiye uygulanan her RevenueCat olayının kaydı (idempotans + abonelik yaşam '
  'döngüsü analizi). TEK YAZAR: apply_entitlement_event() (service_role). '
  'Satın alma jetonu, işlem kimliği ya da fiyat TUTULMAZ.';

alter table public.revenuecat_events enable row level security;

-- Yazma politikası YOK (ADR-009). Kullanıcı yalnızca kendi olaylarını
-- okuyabilir -- user_entitlements'ın select-own deseniyle aynı.
drop policy if exists revenuecat_events_select_own on public.revenuecat_events;
create policy revenuecat_events_select_own
  on public.revenuecat_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.revenuecat_events from anon, authenticated;
grant select on table public.revenuecat_events to authenticated;
grant all on table public.revenuecat_events to service_role;

-- ---------------------------------------------------------------------------
-- Yetki yazma fonksiyonu (028'in yerine)
-- ---------------------------------------------------------------------------
drop function if exists public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean
);

create or replace function public.apply_entitlement_event(
  p_user_id uuid,
  p_tier text,
  p_expires_at timestamptz,
  p_product_id text,
  p_store text,
  p_event_id text,
  p_event_ms bigint,
  p_is_trial boolean,
  p_environment text default null,
  p_event_type text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_env text := upper(nullif(btrim(p_environment), ''));
  v_existing_ms bigint;
  v_existing_event text;
  v_existing_env text;
  v_existing_tier text;
  v_existing_expires timestamptz;
  v_outcome text;
begin
  if p_tier not in ('free', 'premium') then
    raise exception 'invalid_tier: %', p_tier;
  end if;
  if v_env is not null and v_env not in ('PRODUCTION', 'SANDBOX') then
    raise exception 'invalid_environment: %', p_environment;
  end if;

  -- Aynı kullanıcıya eşzamanlı gelen olaylar sırayla işlenir.
  perform pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  -- Defter: bu olay daha önce (hangi sonuçla olursa olsun) işlendiyse dur.
  -- Kullanıcı yoksa FK burada 23503 fırlatır; edge function'lar bunu
  -- "unknown_user" olarak 200 ile kapatıyor (028 ile aynı sözleşme).
  if p_event_id is not null then
    insert into public.revenuecat_events (
      event_id, user_id, event_type, environment, event_ms, tier, outcome
    )
    values (p_event_id, p_user_id, p_event_type, v_env, p_event_ms, p_tier, 'pending')
    on conflict (event_id) do nothing;

    if not found then
      return 'duplicate';
    end if;
  end if;

  select e.rc_event_ms, e.rc_event_id, e.rc_environment, e.tier, e.expires_at
    into v_existing_ms, v_existing_event, v_existing_env, v_existing_tier, v_existing_expires
  from public.user_entitlements e
  where e.user_id = p_user_id;

  if v_existing_event is not null and v_existing_event = p_event_id then
    -- Defter 060'tan önceki olayları bilmiyor; satırdaki son olay hâlâ korur.
    v_outcome := 'duplicate';
  elsif v_existing_ms is not null and p_event_ms is not null and p_event_ms < v_existing_ms then
    -- Sırası geçmiş olay: mevcut satır daha yeni bir olaydan geliyor.
    v_outcome := 'stale';
  elsif v_env = 'SANDBOX'
        and v_existing_env = 'PRODUCTION'
        and v_existing_tier = 'premium'
        and (v_existing_expires is null or v_existing_expires > now()) then
    -- Üretimde aktif ödeme sandbox denemesiyle ezilmez.
    v_outcome := 'sandbox_ignored';
  else
    insert into public.user_entitlements as e (
      user_id, tier, expires_at, source, product_id, store,
      rc_event_id, rc_event_ms, is_trial, rc_environment, updated_at
    )
    values (
      p_user_id, p_tier, p_expires_at, 'revenuecat', p_product_id, p_store,
      p_event_id, p_event_ms, coalesce(p_is_trial, false), v_env, now()
    )
    on conflict (user_id) do update set
      tier           = excluded.tier,
      expires_at     = excluded.expires_at,
      source         = excluded.source,
      product_id     = excluded.product_id,
      store          = excluded.store,
      rc_event_id    = excluded.rc_event_id,
      rc_event_ms    = excluded.rc_event_ms,
      is_trial       = excluded.is_trial,
      rc_environment = excluded.rc_environment,
      updated_at     = now();
    v_outcome := 'applied';
  end if;

  if p_event_id is not null then
    update public.revenuecat_events
       set outcome = case when v_outcome = 'duplicate' then 'duplicate_last' else v_outcome end
     where event_id = p_event_id;
  end if;

  return v_outcome;
end;
$$;

revoke execute on function public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean, text, text
) from public, anon, authenticated;

grant execute on function public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean, text, text
) to service_role;

comment on function public.apply_entitlement_event(
  uuid, text, timestamptz, text, text, text, bigint, boolean, text, text
) is
  'RevenueCat olayını yetki satırına uygular. Idempotent (revenuecat_events + '
  'rc_event_id), sıralamaya dayanıklı (rc_event_ms), kullanıcı başına kilitli, '
  'sandbox üretimdeki aktif premium''u ezemez. Yalnızca service_role çağırabilir.';
