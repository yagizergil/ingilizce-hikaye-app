-- 092: Kural motoru bağlamı -- paywall_context()
--
-- NE YAPIYOR: istemcideki kural değerlendiricisinin ihtiyaç duyduğu ve
-- YALNIZCA SUNUCUNUN güvenilir bildiği alanları tek çağrıda döndürür:
--
--   install_at          profiles.created_at (profil satırı yoksa null -> istemci
--                       gün bazlı kuralları seçmez).
--                       Uygulama silinip kurulunca SIFIRLANMAZ (anonim hesap
--                       Keychain'de kalıcı); "kaçıncı gün" buradan.
--   ever_subscribed     RevenueCat webhook'u bu kullanıcı için en az bir olay
--                       yazmış mı (deneme dahil). "Deneme hiç başlatılmamış"
--                       koşulu (sale_d2) buna bakar.
--   read_sessions_24h   Son 24 saatte kaydedilen okuma oturumu sayısı.
--                       Lingo kuralı: değer görmemiş kullanıcıya indirim yok.
--   user_bucket         0..99, sha256(user_id)'den sabit kova. Deney kolu
--                       (C8 onboarding çıkış teklifi: bucket < 50) ve kademeli
--                       açılış için; yeniden kurulumda değişmez.
--   holdout_bucket      0..99, sha256('holdout:' || user_id)'den AYRI bir kova.
--                       holdout_bucket < 10 olan kullanıcılar (%10) kalıcı
--                       holdout: kural motorunun zamanlanmış tekliflerini
--                       (indirim, çıkış teklifi) HİÇ görmez; bağlamsal
--                       paywall'lar (kota, ses, quiz...) onlarda da açık.
--                       Motorun toplam gelir etkisi bu grupla ölçülür
--                       (IZLENECEK-YOL U4). Deney kovasından bağımsız olsun
--                       diye ayrı tuzla hesaplanıyor.
--   impressions         [{rule_id, shows, last_shown_at}] -- sıklık sınırı.
--   last_fullscreen_at  Son tam ekran kural gösterimi (global 20 saat).
--   last_sale_at        Son indirim (action_kind = 'sale') gösterimi.
--
-- security invoker: her şey auth.uid() satırlarından ve RLS altında okunuyor
-- (profiles, user_entitlements, user_reading_sessions, paywall_impressions'ın
-- hepsinde "kendi satırın" select policy'si var). auth.users'a bilerek
-- dokunulmuyor: authenticated rolünün orada okuma yetkisi yok.
-- sha256() Postgres 11+ yerleşik; pgcrypto gerekmiyor.
--
-- İDEMPOTENT: create or replace.
--
-- GERİ ALMA:
--   drop function if exists public.paywall_context();

create or replace function public.paywall_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select auth.uid() as uid
  ),
  imp as (
    select i.rule_id, count(*)::integer as shows, max(i.shown_at) as last_shown_at
    from public.paywall_impressions i, me
    where i.user_id = me.uid and i.app = 'lingo'
    group by i.rule_id
  )
  select jsonb_build_object(
    'install_at', (select p.created_at from public.profiles p, me where p.id = me.uid),
    'ever_subscribed', exists (
      select 1 from public.user_entitlements e, me
      where e.user_id = me.uid and e.rc_event_id is not null
    ),
    'read_sessions_24h', (
      select count(*)::integer from public.user_reading_sessions s, me
      where s.user_id = me.uid and s.started_at > now() - interval '24 hours'
    ),
    'user_bucket', (
      select (('x' || substr(encode(sha256(convert_to(me.uid::text, 'UTF8')), 'hex'), 1, 7))::bit(28)::integer % 100)
      from me
    ),
    'holdout_bucket', (
      select (('x' || substr(encode(sha256(convert_to('holdout:' || me.uid::text, 'UTF8')), 'hex'), 1, 7))::bit(28)::integer % 100)
      from me
    ),
    'impressions', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'rule_id', imp.rule_id, 'shows', imp.shows, 'last_shown_at', imp.last_shown_at))
       from imp),
      '[]'::jsonb
    ),
    'last_fullscreen_at', (
      select max(i.shown_at) from public.paywall_impressions i, me
      where i.user_id = me.uid and i.app = 'lingo' and i.presentation = 'fullscreen'
    ),
    'last_sale_at', (
      select max(i.shown_at) from public.paywall_impressions i, me
      where i.user_id = me.uid and i.app = 'lingo' and i.action_kind = 'sale'
    )
  )
  from me
  where me.uid is not null;
$$;

revoke execute on function public.paywall_context() from public, anon;
grant execute on function public.paywall_context() to authenticated;

comment on function public.paywall_context() is
  'Kural motorunun sunucu bağlamı (C6): kurulum anı, abonelik geçmişi, son 24 sa okuma, '
  'deney kovası ve gösterim geçmişi. Değerlendirme istemcide.';
