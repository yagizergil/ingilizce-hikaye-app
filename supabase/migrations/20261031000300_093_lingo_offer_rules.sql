-- 093: Lingo'nun başlangıç teklif kuralları (C6 + C7 + C8, rapor §5.3)
--
-- NE YAPIYOR: `paywall_rules`'a Lingo'nun altı kuralını yazar. Aynı satırlar
-- uygulama paketinde gömülü (src/features/offers/rules/defaultRules.json);
-- sunucuya ulaşılamazsa istemci o kopyayla çalışır. İkisinin aynı kalmasını
-- src/features/offers/__tests__/defaultRules.test.ts doğruluyor.
--
--   onboarding_downsell  Onboarding paywall'u satın almadan kapatıldı -> aylık
--                        plan sheet'i ("önce bir ay"). Ömür boyu bir kez.
--                        DENEY: user_bucket < 50 kolu görür, diğer yarı kontrol
--                        (C16 gelene kadar sabit bölme). Oranı değiştirmek için
--                        koşuldaki 50'yi güncelle.
--   sale_cascade         Kilitli özellik paywall'u (ses, quiz, kelime paketi,
--                        akıllı tekrar) kapatıldı -> indirim. 7 günde bir; D2
--                        indirimine 24 saatten az kaldıysa atlanır. Okuyucu
--                        kaynakları (word_quota, sentence_quota, reader_listen)
--                        listede YOK ve istemci onları ayrıca engelliyor.
--   sale_d2              2. gün açılışta indirim; deneme/abonelik hiç başlamamış
--                        ve son 24 saatte okuma var. Bir kez.
--   sale_d3_d30          3-30. gün, son indirimden >= 7 gün.
--   sale_d30_plus        30. günden sonra, son indirimden >= 14 gün.
--   home_offer           Ana sayfa "ikinci şans" deneme kartı (1.1.0); 72 saatlik
--                        sıklığı ve açık/kapalı durumu artık buradan okunuyor.
--
-- Ürün kimliği YOK: indirimler RevenueCat offering adıyla ('sale', 'downsell')
-- anılıyor. Offering tanımlı değilse istemci sessizce normal paywall'a
-- (downsell'de varsayılan teklifin aylık paketine) düşüyor.
--
-- GLOBAL KURALLAR (istemcide, kural satırı değil): oturumda en fazla bir tam
-- ekran, tam ekranlar arası 20 saat, ödeme sorunu varken indirim yok, okuyucu
-- kaynaklı paywall kapanışı hiçbir kuralı tetiklemez.
--
-- İDEMPOTENT: `on conflict (app, id) do update` -- yeniden çalıştırmak
-- satırları bu dosyadaki hâle getirir (kural değişikliği yeni bir migration
-- ile yapılır).
--
-- GERİ ALMA:
--   delete from public.paywall_rules where app = 'lingo' and id in
--     ('onboarding_downsell', 'sale_cascade', 'sale_d2', 'sale_d3_d30',
--      'sale_d30_plus', 'home_offer');
--   Acil kapatma için silmek yerine: update ... set enabled = false.

insert into public.paywall_rules (
  id, app, trigger, presentation, rank,
  conditions,
  action,
  cooldown_hours, max_shows, exempt_global_cooldown, min_app_version
)
values
  ('onboarding_downsell', 'lingo', 'paywall_closed', 'sheet', 20,
   '[{"field": "source", "op": "=", "value": "onboarding"}, {"field": "isPremium", "op": "=", "value": false}, {"field": "userBucket", "op": "<", "value": 50}]'::jsonb,
   '{"kind": "downsell", "offering_id": "downsell", "package_type": "MONTHLY", "placement": "exit", "source": "downsell_onboarding", "experiment": "AB_OnbDownsell_LNG_IOS"}'::jsonb,
   null, 1, true, null),
  ('sale_cascade', 'lingo', 'paywall_closed', 'fullscreen', 12,
   '[{"field": "source", "op": "in", "value": ["audio", "book_quiz", "quiz_level_passed", "word_pack", "smart_practice"]}, {"field": "isPremium", "op": "=", "value": false}, {"field": "daysSinceInstall", "op": ">=", "value": 1}, {"field": "hoursSinceLastSale", "op": ">=", "value": 168}, {"field": "hoursToNextCalendarSale", "op": ">=", "value": 24}]'::jsonb,
   '{"kind": "sale", "offering_id": "sale", "offer_hours": 48, "notify_before_hours": 6, "placement": "exit"}'::jsonb,
   168, null, false, null),
  ('sale_d2', 'lingo', 'app_open', 'fullscreen', 11,
   '[{"field": "isPremium", "op": "=", "value": false}, {"field": "daysSinceInstall", "op": "=", "value": 2}, {"field": "everSubscribed", "op": "=", "value": false}, {"field": "readSessions24h", "op": ">=", "value": 1}]'::jsonb,
   '{"kind": "sale", "offering_id": "sale", "offer_hours": 48, "notify_before_hours": 6, "placement": "app_open"}'::jsonb,
   null, 1, false, null),
  ('sale_d3_d30', 'lingo', 'app_open', 'fullscreen', 10,
   '[{"field": "isPremium", "op": "=", "value": false}, {"field": "daysSinceInstall", "op": ">=", "value": 3}, {"field": "daysSinceInstall", "op": "<=", "value": 30}, {"field": "hoursSinceLastSale", "op": ">=", "value": 168}]'::jsonb,
   '{"kind": "sale", "offering_id": "sale", "offer_hours": 48, "notify_before_hours": 6, "placement": "app_open"}'::jsonb,
   168, null, false, null),
  ('sale_d30_plus', 'lingo', 'app_open', 'fullscreen', 9,
   '[{"field": "isPremium", "op": "=", "value": false}, {"field": "daysSinceInstall", "op": ">", "value": 30}, {"field": "hoursSinceLastSale", "op": ">=", "value": 336}]'::jsonb,
   '{"kind": "sale", "offering_id": "sale", "offer_hours": 48, "notify_before_hours": 6, "placement": "app_open"}'::jsonb,
   336, null, false, null),
  ('home_offer', 'lingo', 'home_focus', 'card', 5,
   '[{"field": "isPremium", "op": "=", "value": false}, {"field": "trialEligible", "op": "=", "value": true}, {"field": "firstChapterFinished", "op": "=", "value": true}]'::jsonb,
   '{"kind": "trial_card", "placement": "home", "source": "home_offer"}'::jsonb,
   72, null, true, null)
on conflict (app, id) do update set
  trigger                = excluded.trigger,
  presentation           = excluded.presentation,
  rank                   = excluded.rank,
  conditions             = excluded.conditions,
  action                 = excluded.action,
  cooldown_hours         = excluded.cooldown_hours,
  max_shows              = excluded.max_shows,
  exempt_global_cooldown = excluded.exempt_global_cooldown,
  min_app_version        = excluded.min_app_version,
  enabled                = true,
  updated_at             = now();
