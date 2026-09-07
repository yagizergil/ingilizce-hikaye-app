-- 020_analytics_events.sql
-- Ürün telemetrisi ve istemci hata kaydı.
--
-- NEDEN KENDİ TABLOMUZ, ÜÇÜNCÜ PARTİ DEĞİL:
-- Fiyatlandırma ve ASO kararları için gereken veri (huni adımları, paywall
-- görüntüleme, okuma süresi, nerede bırakıldığı) bu tabloyla ölçülebiliyor.
-- Yeni bir satıcı eklemek App Privacy beyanını genişletir ve veriyi başka
-- bir ülkeye taşır; Supabase zaten eu-central-1'de ve beyanda mevcut.
-- İleride bir analitik SDK'sı eklenirse `trackEvent` arayüzü aynı kalır,
-- sadece bu tablo yerine (ya da onunla birlikte) oraya yazar.
--
-- RLS deseni user_favorites (017) ile aynı: kullanıcı yalnızca kendi
-- satırını yazabilir. OKUMA POLİTİKASI BİLEREK YOK -- istemcinin kendi
-- telemetrisini geri okumasına gerek yok; analiz service_role ile
-- (Supabase panosu / SQL) yapılır.

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Uygulama açılışında üretilen, cihazda kalan oturum kimliği. Aynı
  -- kullanıcının ayrı oturumlarını huni analizinde ayırmak için.
  session_id text not null,
  name text not null,
  -- Serbest biçimli olay parametreleri. İstemci yalnızca string/number/
  -- boolean gönderiyor (bkz. src/lib/analytics.ts), iç içe nesne yok.
  params jsonb not null default '{}'::jsonb,
  -- Olayın cihazda gerçekleştiği an. created_at (sunucu) ile arasındaki
  -- fark, kuyruğun ne kadar bekletildiğini gösterir -- çevrimdışıyken
  -- olaylar birikip sonra topluca gönderiliyor.
  occurred_at timestamptz not null,
  app_version text not null,
  platform text not null,
  created_at timestamptz not null default now(),

  constraint analytics_events_name_len check (char_length(name) between 1 and 64),
  constraint analytics_events_platform_valid check (platform in ('ios', 'android', 'web')),
  -- jsonb payload'unu sınırla: kötü niyetli ya da hatalı bir istemci
  -- tabloyu şişirmesin.
  constraint analytics_events_params_size check (pg_column_size(params) <= 4096)
);

-- Huni sorguları hep "olay adı + zaman" ekseninde çalışıyor.
create index analytics_events_name_time_idx
  on public.analytics_events (name, occurred_at desc);

-- Elde tutma / oturum analizi için.
create index analytics_events_user_time_idx
  on public.analytics_events (user_id, occurred_at desc);

alter table public.analytics_events enable row level security;

create policy "analytics_events_insert_own"
  on public.analytics_events for insert
  to authenticated
  with check (auth.uid() = user_id);
