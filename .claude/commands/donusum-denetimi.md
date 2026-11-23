---
description: Dönüşüm denetimi — 5 paralel ajanla canlı veri, paywall kodu, rakipler, kod haritası ve iOS simülatör kontrolü; tek Türkçe raporda birleştir
---

# Dönüşüm denetimi (yerel oturum)

Amaç: Uygulamayı günde ~25 aktif kullanıcı kullanıyor ama abone sayısı çok düşük.
Yıllık deneme başlatanlar çoğunlukla aynı gün otomatik yenilemeyi kapatıyor. Nedenini
bul, rakipleri incele ve aboneliğe iten özellikler öner. Uygulamayı iOS simülatöründe
gerçekten açarak kontrol et.

## Tekrar yapma: mevcut çalışmalar

Önce bunları oku. Aynı analizi baştan üretme, bunların üzerine ekle:

- `docs/research/2026-10-12-donusum-huni-analizi.md` (huni, tutunma, kota kaçakları)
- `docs/research/2026-10-12-1.1.0-donusum-denetimi.md`
- `docs/research/2026-10-12-1.1.0-sahip-yapilacaklar.md`
- `docs/research/2026-10-12-rakip-analizi-derin.md`, `docs/aso/01-rakipler.md`, `docs/aso/03-fiyatlandirma.md`
- `docs/plans/2026-09-19-donusum-tasarim.md`

## Bulutta zaten tespit edilenler (2026-11-23, `user_entitlements`, dahili hesaplar hariç)

- Kasım ayında 9 yıllık deneme var. 4'ünde otomatik yenileme satın almayla aynı saatte
  kapatılmış (`hrs_signup_to_cancel = 0`), 2'sinde 23 ve 75 saat içinde. 3'ü hâlâ `will_renew = true`.
- Deneme süresi gerçekte **7 gün**: `expires_at` kayıttan 7 gün sonra. 10-12 planındaki
  "3 gün" uygulanmamış ya da geri alınmış, ASC'de doğrulanmalı.
- Bugüne kadar yıllık denemeden ücretliye geçen yalnızca 1 kullanıcı var
  (2026-09-20, zh). O da `expiration_reason = CUSTOMER_SUPPORT` ile iade almış.
  **Yıllık denemeden net dönüşüm ≈ 0.**
- Gelirin tamamı denemesiz aylık satın alımlardan geliyor (birkaç `RENEWAL`).
  Eylül sonundaki 2 doğrudan yıllık alım dönemi 2027-10'da bitiyor.
- Expo MCP hesabının bu uygulamaya (projectId `2de57729-…`) erişimi yok, bu yüzden bulut
  simülatörü kullanılamadı. Simülatör kontrolünü yerelde Xcode ile yap.

## Paralel ajanlar

Beş ajanı tek mesajda paralel başlat. Her ajan sonucunu
`docs/research/2026-11-23-denetim/0N-*.md` dosyasına Türkçe yazsın ve
150 kelimeyi geçmeyen bir özet dönsün. Kapsamlar çakışmasın: hiçbir ajan bir başkasının işini yapmasın.
npm install, uygulamayı çalıştırma ve simülatör kontrolü YALNIZCA 5. ajanın işi.

1. **Canlı veri** (`01-canli-veri.md`): Supabase MCP ile salt okunur sorgu, proje
   `lzewiwkwcshwxsfwybml`. Dahili hesapları ve `display_name ilike 'elif%'` olanları
   hariç tut. Şunları karşılaştır: 0. saatte iptal edenler, iptal etmeyenler ve 1-3 günde
   iptal edenler deneme süresince ne yaptı? Bak: okuyucu, bölüm bitirme, çeviri, dinleme,
   dil çifti, app_version, paywall kaynağı ve satın almadan iptale kadarki olay dizisi.
   Ayrıca: 10-12'den bu yana dönemlere göre huni, son 30 günün DAU'su ve D1/D7 tutunma,
   hâlâ süren satın alma hataları (`missing_ios_api_key`, RevenueCat yapılandırması,
   `[object Object]`), deneme hatırlatıcısının iptale etkisi, iadeler. Her yüzdenin
   yanında n'yi de yaz.
2. **Paywall kodu** (`02-paywall-kod.md`): `app/paywall.tsx`, `offer.tsx`,
   `winback.tsx`, `cancel-subscription.tsx`, `subscription.tsx`, `billing-fix.tsx`,
   onboarding ve `src/features/paywall`. İncele: deneme nasıl anlatılıyor, iptale iten
   metin var mı (tr i18n metinlerini birebir alıntıla), hatırlatıcı akışı, satın alma
   sonrası "aha" anı, ücretsiz ve premium sınırı, kota kaçakları, tetik noktaları,
   RevenueCat entegrasyonu, App Store yönerge riskleri (3.1.2, 2.3.1, 5.6). Her bulgu
   için dosya:satır, önem ve düzeltme önerisi ver. Sonda "aynı gün iptalin kod kaynaklı
   nedenleri" diye sıralı bir liste olsun.
3. **Rakip ve pazar** (`03-rakip-pazar.md`): WebSearch kullan. Rakipler: Beelinguapp,
   LingQ, Readlang, Lingopie, Bookbot, Readle, Duolingo, Babbel, Speak, Praktika, ELSA
   ve TR'deki "İngilizce hikaye" uygulamaları. Her biri için fiyat (TR ve ABD), deneme
   süresi, paywall modeli, ücretsiz katmanın sınırı ve premium'u satan özellik. Ayrıca
   RevenueCat 2025/2026 Education ölçütleri (deneme→ücretli oranı, 0. gün iptal oranı,
   3 gün mü 7 gün mü) ve TR fiyat hassasiyeti (haftalık, ömür boyu ve öğrenci planları).
   Sonda en çok 10 somut öneri olsun. Proje skill'leri işine yarar:
   `competitor-analysis`, `paywall-optimization`, `pricing`, `churn-prevention`.
4. **Kod haritası** (`04-kod-haritasi.md`): Mermaid diyagramlarıyla (a) route ve
   navigasyon akışı, (b) feature bağımlılık grafiği (gerçek import'lardan), (c) istemci →
   edge function → tablo ve RevenueCat webhook veri akışı. Sağlık taraması: repo kökündeki
   bozuk adlı dosyalar (`13`, `DAILY_LIMIT)`, `[...subscriptionQueryKeys.all`,
   `state.speechVoiceId)`, `─░ngilizce'den`) ne, nereden gelmiş, silinmeleri güvenli mi?
   Ayrıca bağımlılık yönü ihlalleri, boş catch blokları, `any`, i18n dışı metinler,
   300 satırı aşan dosyalar, placeholder veya yarım ekranlar ve `[object Object]`
   üreten hata serileştirmeleri. Belgeler (ROADMAP ve CLAUDE.md) ile kod
   çelişiyor mu? Sadece raporla, hiçbir şeyi silme.
5. **Çalışma zamanı ve simülatör** (`05-calisma-zamani.md`): `npm ci`, `npm run typecheck`,
   `npm run lint`, `npm test`. Ardından `npx expo run:ios` ile development build'i iOS
   simülatöründe aç (yeni kullanıcı için gerekirse önce
   `xcrun simctl erase` ile temiz bir cihaz kullan). Akışı yeni kullanıcı gözüyle gez:
   açılış → onboarding → paywall'da dur. **Satın alma butonuna basma.** Ardından paywall'ı
   kapat → ana sayfa → kitap detayı → okuyucu → kelimeye dokun → kota ve paywall tetikleri.
   Her adımda `xcrun simctl io booted screenshot docs/research/2026-11-23-denetim/screens/NN-adim.png`
   ile ekran görüntüsü al ve görüntüyü Read ile incele. Şunları kaydet: kayan veya taşan
   metin, yanlış fiyat ya da para birimi, görünen çeviri anahtarı, boş ekran, takılma.
   Paywall'daki fiyat, deneme ve metin sunumuna özellikle dikkat et.

## Birleştirme

Ajanlar bitince sonuçları `docs/research/2026-11-23-donusum-denetimi.md` dosyasında
birleştir:

1. Yönetici özeti: neden abone olmuyorlar, kanıta dayalı ilk 5 neden.
2. Aynı gün iptal: normal olan kısım (sektör ölçütü) ve bize özgü kısım.
3. Hemen düzeltilecek hatalar ve kaçaklar (kod, önem sırasına göre).
4. App Store Connect ve RevenueCat'te sahibin yapacakları.
5. Yeni özellik ve teklif önerileri: etki × zorluk tablosu, 30/60/90 günlük plan.
6. Kod haritası (Mermaid) ve sağlık özeti.
7. Ekler: ajan raporlarına bağlantılar ve ekran görüntüleri.

Commit veya push yapmadan önce kullanıcıya sor.
