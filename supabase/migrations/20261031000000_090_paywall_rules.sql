-- 090: Sunucudan yönetilen kesinti/teklif kural motoru -- tablolar
--
-- NE YAPIYOR:
--   1. `paywall_rules`: "hangi tetikleyicide, hangi koşulda, hangi teklif"
--      kuralları. İstemci açılışta okuyor, AsyncStorage'a yazıyor, uygulama
--      paketinde gömülü bir kopyası var (src/features/offers/rules/defaultRules.json).
--      DEĞERLENDİRME İSTEMCİDE (çevrimdışı çalışsın diye); kural burada.
--   2. `paywall_impressions`: kural motorunun gösterdiği her teklifin geçmişi
--      (sıklık sınırı, cooldown ve "kural başına gelir" ölçümü için).
--
-- TASARIM KAYNAĞI: PAYWALL-KARSILASTIRMA-VE-COZUM.md §6 C6, §5.3 (Lingo
-- zaman çizelgesi). Vocabulary'nin `interruptions.json` modelinin Supabase
-- karşılığı.
--
-- YAZMA YOLU: kuralları YALNIZCA migration (service_role) yazar; istemcide
-- insert/update policy'si YOK. Acil durumda bir kural
-- `update public.paywall_rules set enabled = false where app = 'lingo' and id = '...'`
-- ile kapatılır; istemci bir sonraki açılışta bırakır (select policy
-- `enabled` olanları döndürüyor, kapalı kural istemci önbelleğinden de düşer).
--
-- OKUMA EKRANI KURALI (CLAUDE.md Ürün İlkesi #1): `trigger` sütunu bir beyaz
-- listeyle sınırlı ve listede okuyucuya ait bir tetikleyici yok. İstemci
-- ayrıca okuyucu kaynaklarından gelen `paywall_closed`'u hiç değerlendirmiyor.
--
-- İDEMPOTENT: `if not exists` / `drop policy if exists` ile yeniden
-- çalıştırılabilir.
--
-- GERİ ALMA:
--   drop table if exists public.paywall_impressions;
--   drop table if exists public.paywall_rules;
--   (091/092/093 bu tablolara bağlı; önce onları geri al.)

create table if not exists public.paywall_rules (
  id text not null,
  app text not null check (app in ('vokario', 'lingo')),
  -- Lingo beyaz listesi (§5.3): okuyucu ekranı hiçbir kuralın tetikleyicisi olamaz.
  trigger text not null check (
    trigger in ('app_open', 'home_focus', 'book_finished', 'quota_hit', 'notebook_full', 'paywall_closed')
  ),
  presentation text not null check (presentation in ('fullscreen', 'sheet', 'card', 'banner')),
  rank integer not null default 10,
  -- [{"field":"daysSinceInstall","op":">=","value":3}, ...]; bilinmeyen alan -> kural seçilmez.
  conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(conditions) = 'array'),
  -- {"kind":"sale","offering_id":"sale","offer_hours":48,"placement":"app_open"}
  action jsonb not null check (jsonb_typeof(action) = 'object' and action ? 'kind'),
  -- Aynı kuralın iki gösterimi arasındaki en kısa süre (saat).
  cooldown_hours integer check (cooldown_hours is null or cooldown_hours >= 0),
  -- Ömür boyu en fazla gösterim.
  max_shows integer check (max_shows is null or max_shows > 0),
  -- Tam ekranlar arası 20 saat ve "oturumda bir tam ekran" sınırından muaf mı.
  exempt_global_cooldown boolean not null default false,
  min_app_version text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (app, id)
);

comment on table public.paywall_rules is
  'Kesinti/teklif kuralları (C6). Tek yazar: migration/service_role. İstemci yalnızca okur ve '
  'kendisi değerlendirir; gömülü kopya src/features/offers/rules/defaultRules.json.';

alter table public.paywall_rules enable row level security;

drop policy if exists "paywall_rules_select_enabled" on public.paywall_rules;
create policy "paywall_rules_select_enabled"
  on public.paywall_rules for select
  to anon, authenticated
  using (enabled);

-- ---------------------------------------------------------------------------
-- paywall_impressions
-- ---------------------------------------------------------------------------
create table if not exists public.paywall_impressions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app text not null default 'lingo' check (app in ('vokario', 'lingo')),
  rule_id text not null check (char_length(rule_id) between 1 and 64),
  trigger text not null check (char_length(trigger) between 1 and 32),
  presentation text not null check (presentation in ('fullscreen', 'sheet', 'card', 'banner')),
  -- Kuralın eylem türü ('sale', 'downsell', ...). "Son indirim gösterimi"
  -- hesabı kuralın bugünkü hâline değil, gösterildiği andaki türüne bakar.
  action_kind text not null check (char_length(action_kind) between 1 and 32),
  shown_at timestamptz not null default now(),
  outcome text check (outcome in ('purchased', 'dismissed', 'downsell', 'fallback', 'error'))
);

comment on table public.paywall_impressions is
  'Kural motorunun gösterdiği teklifler (C6). Sıklık sınırı ve kural başına dönüşüm ölçümü.';

create index if not exists paywall_impressions_user_rule_idx
  on public.paywall_impressions (user_id, app, rule_id, shown_at desc);

alter table public.paywall_impressions enable row level security;

drop policy if exists "paywall_impressions_select_own" on public.paywall_impressions;
create policy "paywall_impressions_select_own"
  on public.paywall_impressions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "paywall_impressions_insert_own" on public.paywall_impressions;
create policy "paywall_impressions_insert_own"
  on public.paywall_impressions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Yalnızca sonucu (outcome) yazmak için; silme yolu bilerek yok -- geçmişi
-- silmek sıklık sınırını sıfırlamak demek olurdu.
drop policy if exists "paywall_impressions_update_own" on public.paywall_impressions;
create policy "paywall_impressions_update_own"
  on public.paywall_impressions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke update on public.paywall_impressions from authenticated;
grant update (outcome) on public.paywall_impressions to authenticated;
