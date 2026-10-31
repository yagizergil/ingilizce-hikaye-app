-- 091: Sunucu süreli teklifler (offer_grants) -- C7
--
-- NE YAPIYOR: bir indirim kuralı gösterildiğinde teklifin BİTİŞ ANINI sunucu
-- belirliyor. İstemcideki geri sayım bu satırın `expires_at` değerinden
-- hesaplanır -- cihaz saatini ileri almak teklifi uzatmaz (Beelinguapp'taki
-- "istemci saatli promo" anti-deseni, rapor §3.8).
--
--   * `grant_offer(p_rule_id)`: kuralın `action.offer_hours` kadar süreli bir
--     satır açar. Aynı offering için hâlâ geçerli (süresi dolmamış, satın
--     alınmamış) bir satır varsa YENİSİNİ AÇMAZ, onu döndürür: 2. gün verilen
--     48 saatlik teklif 3. gün tekrar gösterilirse sayaç baştan başlamaz.
--   * `mark_offer_redeemed(p_offering_id)`: satın alma sonrası istemci
--     işaretler. Yalnızca gösterim/ölçüm içindir; yetki zinciri (ADR-009)
--     buna BAKMAZ.
--
-- GÜVENLİK: tabloda istemci için yalnızca select policy'si var; satırları
-- yalnızca bu iki security definer fonksiyon yazar. Fiyat App Store'da;
-- bu tablo bir indirim "yetkisi" değil, bir geri sayım kaynağıdır.
--
-- İDEMPOTENT: `if not exists`, `create or replace`, `drop policy if exists`.
--
-- GERİ ALMA:
--   drop function if exists public.mark_offer_redeemed(text);
--   drop function if exists public.grant_offer(text);
--   drop table if exists public.offer_grants;

create table if not exists public.offer_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  app text not null check (app in ('vokario', 'lingo')),
  offer_id text not null,          -- kural kimliği: 'sale_d2', 'sale_d3_d30', 'sale_cascade'...
  offering_id text not null,       -- RevenueCat offering adı: 'sale'
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  primary key (user_id, app, offer_id, granted_at),
  check (expires_at > granted_at)
);

comment on table public.offer_grants is
  'Sunucu süreli teklifler (C7). İstemcinin geri sayımı expires_at''ten. Yazar: grant_offer().';

create index if not exists offer_grants_active_idx
  on public.offer_grants (user_id, app, offering_id, expires_at desc);

alter table public.offer_grants enable row level security;

drop policy if exists "offer_grants_select_own" on public.offer_grants;
create policy "offer_grants_select_own"
  on public.offer_grants for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- grant_offer
-- ---------------------------------------------------------------------------
create or replace function public.grant_offer(p_rule_id text)
returns table (offer_id text, offering_id text, granted_at timestamptz, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_action jsonb;
  v_offering text;
  v_hours integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select r.action into v_action
  from public.paywall_rules r
  where r.app = 'lingo' and r.id = p_rule_id and r.enabled;

  if v_action is null or v_action ->> 'kind' <> 'sale' then
    raise exception 'offer_rule_not_found: %', p_rule_id;
  end if;

  v_offering := coalesce(v_action ->> 'offering_id', 'sale');
  -- 1..168 saat; kural tablosundaki bir yazım hatası haftalarca süren bir
  -- "son saatler" sayacı üretmesin.
  v_hours := least(greatest(coalesce((v_action ->> 'offer_hours')::integer, 48), 1), 168);

  -- Aynı offering için geçerli teklif varsa onu döndür.
  return query
    select g.offer_id, g.offering_id, g.granted_at, g.expires_at
    from public.offer_grants g
    where g.user_id = v_user
      and g.app = 'lingo'
      and g.offering_id = v_offering
      and g.redeemed_at is null
      and g.expires_at > now()
    order by g.expires_at desc
    limit 1;
  if found then
    return;
  end if;

  return query
    insert into public.offer_grants as g (user_id, app, offer_id, offering_id, expires_at)
    values (v_user, 'lingo', p_rule_id, v_offering, now() + make_interval(hours => v_hours))
    returning g.offer_id, g.offering_id, g.granted_at, g.expires_at;
end;
$$;

revoke execute on function public.grant_offer(text) from public, anon;
grant execute on function public.grant_offer(text) to authenticated;

comment on function public.grant_offer(text) is
  'İndirim kuralı için sunucu süreli teklif açar ya da aynı offering için geçerli olanı döndürür (C7).';

-- ---------------------------------------------------------------------------
-- mark_offer_redeemed
-- ---------------------------------------------------------------------------
create or replace function public.mark_offer_redeemed(p_offering_id text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.offer_grants g
  set redeemed_at = now()
  where g.user_id = auth.uid()
    and g.app = 'lingo'
    and g.offering_id = p_offering_id
    and g.redeemed_at is null
    and g.expires_at > now();
$$;

revoke execute on function public.mark_offer_redeemed(text) from public, anon;
grant execute on function public.mark_offer_redeemed(text) to authenticated;
