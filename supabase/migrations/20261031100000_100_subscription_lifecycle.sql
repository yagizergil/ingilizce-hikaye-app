-- 100_subscription_lifecycle.sql
-- Abonelik yaşam döngüsü alanları: ödeme sorunu, iptal edilmiş ama aktif,
-- süresi dolmuş, deneme/ödeme geçmişi (PAYWALL-KARSILASTIRMA C9-C12).
--
-- NEDEN: `user_entitlements` yalnızca "premium mu, ne zaman bitiyor"
-- sorusunu cevaplıyordu. Webhook BILLING_ISSUE ve CANCELLATION olaylarını
-- alıyor ama yetkiyi kesmediği için (doğru) iz bırakmıyordu; istemci
-- "ödemen alınamadı", "aboneliğin X'te bitiyor", "tekrar hoş geldin"
-- diyemiyordu.
--
-- YETKİ KURALINA DOKUNULMADI (ADR-009):
--   - `tier` / `expires_at` hâlâ YALNIZCA `apply_entitlement_event()` ile
--     yazılıyor; o fonksiyon bu migration'da DEĞİŞMEDİ.
--   - Yeni alanlar yalnızca BİLGİ: hiçbir kapı (has_active_premium,
--     can_play_book_audio, ...) bunlara bakmıyor.
--   - Yazar yine tek: revenuecat-webhook (service_role) yeni
--     `apply_subscription_lifecycle()` fonksiyonunu çağırıyor. İstemciye
--     yazma yolu AÇILMADI; select-only RLS aynen duruyor.
--
-- SIRALAMA: yaşam döngüsü alanlarının kendi sıralama damgası var
-- (`lifecycle_event_ms`). `rc_event_ms`'e bağlamadık çünkü
-- `sync-entitlement` onu `Date.now()` ile yazıyor; yaşam döngüsü sıralaması
-- o onarım yolundan etkilenmemeli.
--
-- İDEMPOTENT: `add column if not exists`, `create or replace`,
-- `create or replace view`; geri doldurma yalnızca false olan bayrakları
-- true yapar, tekrar çalıştırmak sonucu değiştirmez.
--
-- GERİ ALMA:
--   drop view if exists public.subscription_lifecycle_segments;
--   drop function if exists public.apply_subscription_lifecycle(uuid, text, bigint, text, jsonb);
--   alter table public.user_entitlements
--     drop column if exists will_renew,
--     drop column if exists billing_issue_at,
--     drop column if exists grace_expires_at,
--     drop column if exists cancelled_at,
--     drop column if exists cancel_reason,
--     drop column if exists expired_at,
--     drop column if exists expiration_reason,
--     drop column if exists period_type,
--     drop column if exists trial_used,
--     drop column if exists had_paid,
--     drop column if exists lifecycle_event_type,
--     drop column if exists lifecycle_event_id,
--     drop column if exists lifecycle_event_ms;
--   (Webhook'un önceki sürümü bu alanları hiç okumadığı için geri alma
--   sırası serbest; webhook'un yeni sürümü fonksiyon yoksa yalnızca log
--   basıp devam ediyor.)

-- ---------------------------------------------------------------------------
-- Alanlar
-- ---------------------------------------------------------------------------

-- Otomatik yenileme açık mı. null = bilinmiyor (bu migration'dan önceki
-- satırlar). CANCELLATION -> false, UNCANCELLATION/RENEWAL -> true.
alter table public.user_entitlements add column if not exists will_renew boolean;

-- Ödeme sorunu (BILLING_ISSUE) ilk görüldüğü an; sorun çözülünce (RENEWAL,
-- yeni satın alma) null. EXPIRATION nedeni BILLING_ERROR ise KORUNUR:
-- Apple 60 güne kadar tahsilatı yeniden dener, istemci "ödemeyi düzelt"
-- demeye devam eder.
alter table public.user_entitlements add column if not exists billing_issue_at timestamptz;

-- App Store Billing Grace Period bitişi (RevenueCat
-- `grace_period_expiration_at_ms`). Grace kapalıysa null.
alter table public.user_entitlements add column if not exists grace_expires_at timestamptz;

-- İptal (otomatik yenilemeyi kapatma) anı ve RevenueCat nedeni
-- (UNSUBSCRIBE, BILLING_ERROR, CUSTOMER_SUPPORT, ...).
alter table public.user_entitlements add column if not exists cancelled_at timestamptz;
alter table public.user_entitlements add column if not exists cancel_reason text;

-- Abonelik gerçekten bittiğinde (EXPIRATION) bitiş anı ve nedeni.
alter table public.user_entitlements add column if not exists expired_at timestamptz;
alter table public.user_entitlements add column if not exists expiration_reason text;

-- RevenueCat period_type (TRIAL, INTRO, NORMAL, PROMOTIONAL).
alter table public.user_entitlements add column if not exists period_type text;

-- Tek yönlü bayraklar (bir kez true olunca false olmaz). Winback segmenti
-- (lapsed_trial / lapsed_paid) bunlardan türetiliyor.
alter table public.user_entitlements
  add column if not exists trial_used boolean not null default false;
alter table public.user_entitlements
  add column if not exists had_paid boolean not null default false;

-- Yaşam döngüsü alanlarını son değiştiren olay (idempotans + sıralama).
alter table public.user_entitlements add column if not exists lifecycle_event_type text;
alter table public.user_entitlements add column if not exists lifecycle_event_id text;
alter table public.user_entitlements add column if not exists lifecycle_event_ms bigint;

comment on column public.user_entitlements.billing_issue_at is
  'Ödeme sorunu görüldüğü an (BILLING_ISSUE). Bilgi alanı: yetki kararı VERMEZ. '
  'Yazar: apply_subscription_lifecycle() (migration 100).';
comment on column public.user_entitlements.will_renew is
  'Otomatik yenileme açık mı; null = bilinmiyor. Bilgi alanı (migration 100).';

-- ---------------------------------------------------------------------------
-- Geri doldurma (yaklaşık, yalnızca bayraklar)
--
-- Eski satırlarda olay geçmişi yok. Bildiğimiz tek şey son olayın deneme
-- olup olmadığı ve bir ürünün yazılmış olması:
--   - is_trial = true            -> deneme kullanılmış.
--   - product_id var, deneme değil -> en az bir dönem ödenmiş.
-- Yanlış pozitif riski: deneme sırasında yazılmış ve sonra hiç olay almamış
-- satır yok (deneme hep EXPIRATION ya da RENEWAL ile kapanır), yani kabul
-- edilebilir.
-- ---------------------------------------------------------------------------
update public.user_entitlements
   set trial_used = true
 where is_trial = true and trial_used = false;

update public.user_entitlements
   set had_paid = true
 where product_id is not null and is_trial = false and had_paid = false;

-- ---------------------------------------------------------------------------
-- Yazma fonksiyonu
--
-- `p_patch` yalnızca DEĞİŞEN alanları taşır; anahtarın varlığı "yaz",
-- değerinin null olması "temizle" demektir. Hangi olayın hangi alanı
-- değiştirdiği webhook'taki saf `lifecyclePatchFor()` içinde (testli).
--
-- Tek yönlü bayraklar (trial_used, had_paid) sırası geçmiş olayda da
-- işlenir: geç gelen bir INITIAL_PURCHASE(TRIAL) "deneme kullanıldı"
-- bilgisini yine de taşımalı.
-- ---------------------------------------------------------------------------
create or replace function public.apply_subscription_lifecycle(
  p_user_id uuid,
  p_event_id text,
  p_event_ms bigint,
  p_event_type text,
  p_patch jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.user_entitlements%rowtype;
  v_trial boolean := coalesce((p_patch->>'trial_used')::boolean, false);
  v_paid boolean := coalesce((p_patch->>'had_paid')::boolean, false);
begin
  select * into v_row from public.user_entitlements e where e.user_id = p_user_id for update;
  if not found then
    -- Yetki satırını apply_entitlement_event yazar; o yoksa (silinmiş
    -- kullanıcı) burada oluşturmuyoruz.
    return 'no_row';
  end if;

  if v_row.lifecycle_event_id is not null and v_row.lifecycle_event_id = p_event_id then
    return 'duplicate';
  end if;

  if v_row.lifecycle_event_ms is not null and p_event_ms is not null
     and p_event_ms < v_row.lifecycle_event_ms then
    update public.user_entitlements e
       set trial_used = e.trial_used or v_trial,
           had_paid = e.had_paid or v_paid
     where e.user_id = p_user_id;
    return 'stale';
  end if;

  update public.user_entitlements e set
    will_renew = case when p_patch ? 'will_renew'
                      then (p_patch->>'will_renew')::boolean else e.will_renew end,
    billing_issue_at = case when p_patch ? 'billing_issue_at'
                      then (p_patch->>'billing_issue_at')::timestamptz else e.billing_issue_at end,
    grace_expires_at = case when p_patch ? 'grace_expires_at'
                      then (p_patch->>'grace_expires_at')::timestamptz else e.grace_expires_at end,
    cancelled_at = case when p_patch ? 'cancelled_at'
                      then (p_patch->>'cancelled_at')::timestamptz else e.cancelled_at end,
    cancel_reason = case when p_patch ? 'cancel_reason'
                      then p_patch->>'cancel_reason' else e.cancel_reason end,
    expired_at = case when p_patch ? 'expired_at'
                      then (p_patch->>'expired_at')::timestamptz else e.expired_at end,
    expiration_reason = case when p_patch ? 'expiration_reason'
                      then p_patch->>'expiration_reason' else e.expiration_reason end,
    period_type = case when p_patch ? 'period_type'
                      then p_patch->>'period_type' else e.period_type end,
    trial_used = e.trial_used or v_trial,
    had_paid = e.had_paid or v_paid,
    lifecycle_event_type = p_event_type,
    lifecycle_event_id = p_event_id,
    lifecycle_event_ms = coalesce(p_event_ms, e.lifecycle_event_ms)
  where e.user_id = p_user_id;

  return 'applied';
end;
$$;

revoke execute on function public.apply_subscription_lifecycle(uuid, text, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_subscription_lifecycle(uuid, text, bigint, text, jsonb)
  to service_role;

comment on function public.apply_subscription_lifecycle(uuid, text, bigint, text, jsonb) is
  'RevenueCat olayının yaşam döngüsü (bilgi) alanlarını yazar. Yetkiye (tier/expires_at) '
  'DOKUNMAZ. Idempotent (lifecycle_event_id), sıralamaya dayanıklı (lifecycle_event_ms). '
  'Yalnızca service_role. Migration 100.';

-- ---------------------------------------------------------------------------
-- Winback / kurtarma segmentleri (C9)
--
-- security_invoker: görünüm çağıranın RLS'iyle çalışır; istemci yalnızca
-- kendi satırını görür, service_role (analiz, ileride kampanya) hepsini.
-- Premium kuralı has_active_premium() ile aynı: tier premium ve süresi
-- dolmamış (null süresiz sayılır).
-- ---------------------------------------------------------------------------
create or replace view public.subscription_lifecycle_segments
with (security_invoker = true) as
select
  e.user_id,
  case
    when e.tier = 'premium' and (e.expires_at is null or e.expires_at > now())
         and e.billing_issue_at is not null                        then 'billing_grace'
    when e.tier = 'premium' and (e.expires_at is null or e.expires_at > now())
         and e.will_renew = false                                  then 'cancelled_active'
    when not (e.tier = 'premium' and (e.expires_at is null or e.expires_at > now()))
         and e.billing_issue_at is not null
         and e.expiration_reason = 'BILLING_ERROR'                 then 'billing_retry'
    when not (e.tier = 'premium' and (e.expires_at is null or e.expires_at > now()))
         and e.had_paid                                            then 'lapsed_paid'
    when not (e.tier = 'premium' and (e.expires_at is null or e.expires_at > now()))
         and e.trial_used                                          then 'lapsed_trial'
    else null
  end as segment,
  e.expires_at,
  e.expired_at,
  e.billing_issue_at,
  e.grace_expires_at,
  e.product_id
from public.user_entitlements e;

grant select on public.subscription_lifecycle_segments to authenticated, service_role;

comment on view public.subscription_lifecycle_segments is
  'Abonelik kurtarma segmentleri (billing_grace, cancelled_active, billing_retry, '
  'lapsed_paid, lapsed_trial). security_invoker: RLS çağıranınki. Migration 100.';
