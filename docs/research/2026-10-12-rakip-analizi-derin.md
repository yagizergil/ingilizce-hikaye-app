# Rakip analizi ve kanıt taraması: dönüşüm (2026-10-12)

Kapsam: rakiplerin onboarding/paywall/deneme/fiyat yapısı + nicel benchmark'lar, bizim huniye
(`2026-10-12-donusum-huni-analizi.md`, `2026-10-12-1.1.0-donusum-denetimi.md`) eşlenmiş öneriler.
Kod değiştirilmedi.

**Güven etiketleri:** Y = birincil kaynak (App Store sayfası, şirket blogu); O = üçüncü taraf teardown
(screensdesign, Adapty paywall kütüphanesi, newsletter); D = tek ikincil kaynak / doğrulanamadı.
**Bulunamayan bilgi "bulunamadı" diye yazıldı; tahmin eklenmedi.**

**Sınırlama (dürüst not):** Bu tur ~11 arama/getirme ile yapıldı. Lingokids, Mimo, Kwiziq, Lingvist,
Readlang, Cambly (paywall), Speak, Beelinguapp (onboarding) için güvenilir teardown bulunamadı.
TR App Store Eğitim top listesi web üzerinden çekilemedi (Apple top chart'ı yalnızca cihazda/RSS'te);
yerel rakip analizi bu yüzden zayıf. Bir sonraki adım: telefonda TR mağazasında Eğitim > En Çok Hasılat
listesinin ilk 20'sini ekran görüntüsüyle kaydetmek ve 5 rakibi taze kurulumla kayda almak.

---

## 1. Bizim huni (özet, 30 gün, n=205)

- Profil -> onboarding bitti %64 -> onboarding paywall'u gördü %59 -> plan seçti %9,8 -> satın alma
  (deneme dahil) %7,8 -> deneme %5,4.
- Paywall 2. dakikada; StoreKit sayfasında iptal ~%48.
- Aylık plan seçimi 18 / yıllık 10 (yıllık ön seçili olmasına rağmen).
- Tutunma D1 %11,9, D7 %1,5. Okuyucu açan %40, bölüm bitiren %9,8.
- Ücretli aktif 7, aktif deneme 3, sona ermiş deneme 6.

Kıyas: RevenueCat 2026 hard paywall medyan D35 indirme->ödeme %10,7, freemium %2,1 [Y, RevenueCat 2026
benchmark]. Bizim "install" verimiz yok (huni profil oluşumundan başlıyor), ama profil->ücretli/deneme
%7,8 ve bunun çoğu deneme; sonuçlanmış deneme->ücretli oranı küçük örneklemde belirsiz (6 sona ermiş,
yıllık ücretlinin bir kısmı denemeden). **Örneklem çok küçük: hiçbir A/B testi bu hacimde 4-6 haftada
anlamlı sonuç vermez** (Adapty: 20k görüntüleme %2 dönüşümde bile yavaş) [O, Adapty].

---

## 2. Rakip tablosu

| Uygulama                                                      | Onboarding                                                                                                                    | Paywall yeri                     | Paywall düzeni                                                                                                                                                       | Deneme                                                                                                                | TR fiyat                                                                                        | Kaynak / güven                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Duolingo (Super)**                                          | Uzun, oyunlaştırılmış; 192 ekranlık akış kayıtlı                                                                              | Onboarding sonu + ders içi       | Yıllık ön seçili varyant kazandı (efekt büyüklüğü yayınlanmamış)                                                                                                     | **TR mağazasında 14 gün ücretsiz** ("Süper Duolingo'yu 14 günlüğüne ücretsiz dene"); CEO 7 gün -> 1 ay testi açıkladı | IAP listesi ₺139,99 - ₺1.209,99; Aile ₺1.199,99 (hangi fiyatın hangi plan olduğu sayfada yok)   | [Y App Store TR](https://apps.apple.com/tr/app/duolingo-dil-dersleri/id570060128?l=tr), [O screensdesign](https://screensdesign.com/apps/duolingo-language-lessons/), [D adplist](https://adplist.substack.com/p/duolingo-little-known-experiment), [D itiger](https://www.itiger.com/news/1109911487) |
| **Babbel**                                                    | Ayrıntılı quiz -> **zorunlu kayıt (1:03)** -> soft paywall (1:37)                                                             | Onboarding sonu                  | 3 plan, 12 ay öne çıkarılmış, "SAVE 50%" rozeti                                                                                                                      | 7 gün                                                                                                                 | bulunamadı                                                                                      | [O screensdesign](https://screensdesign.com/apps/babbel-language-learning/); Ocak 2026'da 6 aylık plan kaldırıldı, yıllık $107,99 -> $86,99 [D lazyweb](https://www.lazyweb.com/research/babbel-pricing-paywall-experiments)                                                                           |
| **Busuu**                                                     | Uzun: kayıt + çok adımlı quiz ilk dersten önce                                                                                | Onboarding'de erken soft paywall | bulunamadı                                                                                                                                                           | 7 gün -> yıllık                                                                                                       | bulunamadı                                                                                      | [O screensdesign](https://screensdesign.com/showcase/busuu-language-learning)                                                                                                                                                                                                                          |
| **ELSA Speak**                                                | 12-16 adımlı quiz, kayıt, değer gösterilmeden                                                                                 | Onboarding hemen sonu            | **10 dk geri sayım**, kullanıcı yorumları, özellik karşılaştırma tablosu, **7 günlük deneme zaman çizelgesi**                                                        | 7 gün                                                                                                                 | bulunamadı (global "$6,99'dan")                                                                 | [O screensdesign](https://screensdesign.com/showcase/elsa-speak-english-learning), [O Adapty kütüphane](https://adapty.io/paywall-library/elsa/)                                                                                                                                                       |
| **Praktika**                                                  | **31 onboarding adımı**                                                                                                       | bulunamadı                       | bulunamadı                                                                                                                                                           | bulunamadı                                                                                                            | bulunamadı                                                                                      | [O screensdesign](https://screensdesign.com/showcase/praktika-ai-language-tutor)                                                                                                                                                                                                                       |
| **Headway** (okuma aboneliği)                                 | Kişiselleştirme quiz'i + kayıt + **taahhüt sözleşmesi (biyometrik onayla)**; paywall'dan önce deneme teklif ekranı            | Onboarding sonu                  | 7 gün deneme -> yıllık; denemeyi başlatana **ödül + süreli indirimli yıllık yükseltme**                                                                              | 7 gün                                                                                                                 | bulunamadı                                                                                      | [O screensdesign](https://screensdesign.com/apps/headway-daily-micro-learning/)                                                                                                                                                                                                                        |
| **Blinkist** (okuma aboneliği)                                | —                                                                                                                             | —                                | **Zaman çizelgesi paywall'u**: "Bugün başlar / X tarihinde hatırlatma (tahsilattan 2 gün önce) / Y tarihinde ilk ücret", başlık "Şüpheli misin? 7 gün ücretsiz dene" | 7 gün                                                                                                                 | bulunamadı                                                                                      | Sonuç: bildirim izni %6 -> %74, **deneme başlangıcı +%23**, şikâyet -%55, deneme tutunması +%4 [D newsletter](https://b2bpricinginsights.substack.com/p/4-min-read-how-blinkists-new-paywall), [O Adapty #23](https://adapty.io/blog/paywall-newsletter-23/)                                           |
| **LingQ**                                                     | bulunamadı                                                                                                                    | bulunamadı                       | 3 süre (1/6/12 ay)                                                                                                                                                   | 7 gün (inceleme sitesi)                                                                                               | US: $14,99/ay, $80,99/6 ay, $119,99/yıl; bölgeye göre "%45'e kadar" yıllık indirim kampanyaları | [O Adapty kütüphane](https://adapty.io/paywall-library/lingq-learn-42-languages/), [D milled](https://milled.com/the-linguist-institute/get-up-to-45-off-and-unlock-every-premium-feature-z8xFRhmfEPSIQxj2)                                                                                            |
| **Beelinguapp** (en yakın ürün: paralel metin + sesli hikâye) | bulunamadı                                                                                                                    | bulunamadı                       | aylık + "Yearly Trial" ürünü (CN mağazası)                                                                                                                           | yıllıkta deneme (ürün adından)                                                                                        | bulunamadı; global ~$25-30/yıl (çelişkili)                                                      | [D actualfluency](https://actualfluency.com/beelinguapp-review), [Y App Store CN](https://apps.apple.com/cn/app/beelinguapp-%E8%AF%AD%E8%A8%80%E5%AD%A6%E4%B9%A0/id1225056371)                                                                                                                         |
| **Cambly**                                                    | —                                                                                                                             | —                                | —                                                                                                                                                                    | —                                                                                                                     | 12 ay, haftada 2 ders: ₺29.330-42.879 (tarih belirsiz)                                          | [D habergazetesi](https://www.habergazetesi.com.tr/gercek-cambly-ucret-ne-kadar-reklamlardaki-300-tllik-dersler-ne-kadar-gercekci)                                                                                                                                                                     |
| Speak, Readlang, Kwiziq, Lingvist, Lingokids, Mimo            | **bulunamadı**                                                                                                                |                                  |                                                                                                                                                                      |                                                                                                                       |                                                                                                 | —                                                                                                                                                                                                                                                                                                      |
| TR yerel (Cake, Voscreen, "İngilizce - Kelimeler Öğren")      | Listelerde adı geçiyor; paywall verisi bulunamadı; **"hikâye okuyarak İngilizce" konumunda belirgin bir TR rakip bulunamadı** |                                  |                                                                                                                                                                      |                                                                                                                       |                                                                                                 | [D tamindir](https://www.tamindir.com/indir/cake-bedava-ingilizce-ogren/amp/), [Y App Store TR](https://apps.apple.com/tr/app/i-ngilizce-kelimeler-%C3%B6%C4%9Fren/id1492827466?l=tr)                                                                                                                  |

**Kategori deseni** (screensdesign dil uygulamaları kategorisi [O](https://screensdesign.com/categories/language-learning-apps/)):
en yaygın model "free trial + soft paywall", en yaygın deneme 7 gün, paywall onboarding'in hemen
sonunda. Büyük oyuncuların neredeyse hepsi bizden **daha uzun** onboarding (12-31 adım) kullanıyor
ve çoğu değer göstermeden satıyor; bizim "önce ilk okuma, sonra paywall" sıralamamız avantaj.

---

## 3. Nicel kanıt

| Bulgu                                                | Değer                                                                                                                                                                                             | Kaynak / güven                                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hard vs freemium D35 indirme->ödeme                  | %10,7 vs %2,1 (2026); 2025'te %12,1 vs %2,2                                                                                                                                                       | [Y RevenueCat 2026](https://www-docs.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026), [O SaaStr](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)        |
| Install başına gelir D60                             | $3,09 vs $0,38                                                                                                                                                                                    | Y RevenueCat 2026                                                                                                                                                                                                     |
| Yıllık abonelerin 1. yıl tutunması                   | hard %27, freemium %28 (fark yok)                                                                                                                                                                 | Y RevenueCat 2026                                                                                                                                                                                                     |
| Deneme uzunluğu -> deneme->ücretli                   | 17-32 gün %42,5; ≤4 gün %25,5                                                                                                                                                                     | Y RevenueCat 2026                                                                                                                                                                                                     |
| 3 günlük deneme iptalleri                            | %55,4'ü 0. gün, %84'ü 0-1. gün                                                                                                                                                                    | Y RevenueCat 2026                                                                                                                                                                                                     |
| Yıllık iptallerin 1. ayda oranı                      | %35                                                                                                                                                                                               | Y RevenueCat 2026                                                                                                                                                                                                     |
| Denemelerin 0. günde başlaması                       | ~%82                                                                                                                                                                                              | O (SOSA 2025 özetleri) [Airbridge](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026)                                                                                                                    |
| Hard paywall iade oranı                              | %5,8 vs %3,4                                                                                                                                                                                      | O SOSA 2025 özeti                                                                                                                                                                                                     |
| Yıllık ön seçili -> yıllık seçim payı                | %69 vs %28 (aylık ön seçili)                                                                                                                                                                      | D (Adapty 2025'e atfen, doğrulanamadı) [tessl özet](https://tessl.io/registry/skills/github/Eronred/aso-skills/paywall-optimization)                                                                                  |
| Deneme 7 -> 3 gün                                    | deneme->ücretli +%12-18 (ama deneme başlangıcı genelde düşer)                                                                                                                                     | O [Adapty playbook](https://adapty.io/blog/markdown/paywall-experiments-playbook.md)                                                                                                                                  |
| Fiyat artışı $7,99 -> $9,99 (haftalık)               | dönüşüm -%5-8, ARPU +%18-22                                                                                                                                                                       | O Adapty                                                                                                                                                                                                              |
| Orta fiyatlı 3. plan eklemek (Prosto)                | gelir +%30 (çoklu değişiklik)                                                                                                                                                                     | O [Adapty case](https://wp-prod-new.adapty.io/case-study/prosto)                                                                                                                                                      |
| Zaman çizelgesi paywall'u (Blinkist)                 | deneme +%23, bildirim izni %6->%74                                                                                                                                                                | D newsletter                                                                                                                                                                                                          |
| A/B testlerinin kazanansız biten payı                | %70-90                                                                                                                                                                                            | O Adapty                                                                                                                                                                                                              |
| Apple win-back teklifleri                            | ücretsiz süre veya indirimli dönem; uygunluğu Apple belirler; mağazada, uygulamada, abonelik yönetiminde görünür; giriş teklifi kullanılmış olsa da alınabilir. **Performans verisi bulunamadı.** | [O RevenueCat rehberi](https://www.revenuecat.com/blog/growth/guide-to-apple-win-back-offers), [Y RevenueCat docs](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/ios-subscription-offers) |
| Eğitim kategorisi / Türkiye / gelişen pazar kırılımı | **bulunamadı** (birincil SOSA PDF'i açılamadı)                                                                                                                                                    | —                                                                                                                                                                                                                     |

---

## 4. 1.1.0'da yapılanların doğrulanması

| 1.1.0 maddesi                                 | Kanıt                                                                               | Hüküm                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deneme zaman çizelgesi paywall'u**          | Blinkist +%23 deneme (D), ELSA ve Headway aynı deseni kullanıyor (O)                | **Doğru, tut.** Hatırlatma günü tahsilattan 2 gün önce olmalı (Blinkist deseni). Beklenen etki: deneme başlangıcı +%10-25 (tek kaynak, iyimser uç).                                                                                                                          |
| **Deneme hatırlatma bildirimi**               | Blinkist'te şikâyet -%55, deneme tutunması +%4; Apple incelemesi açısından da güven | **Doğru**, ama yerel bildirim izni gerektiriyor: zaman çizelgesindeki "hatırlatacağız" vaadi izin İSTENMEDEN verilmemeli. İzni deneme başlatıldıktan hemen sonra, "sana tahsilattan 2 gün önce haber verelim mi?" gerekçesiyle iste (Blinkist izin oranı artışı tam bundan). |
| **Okuma hatırlatıcısı opt-in**                | Doğrudan dönüşüm verisi yok; D1 %12 / D7 %1,5 bizim en büyük sızıntımız             | **Doğru yön.** ADR-010 "açılışta sorma" kuralı korunarak, onboarding'deki günlük hedef adımına bağlı opt-in en uygun an (kullanıcı hedefi kendisi seçti).                                                                                                                    |
| **Onboarding sonrası ilk kitaba yönlendirme** | RevenueCat: değer önce gelince dönüşüm yüksek; okuyucu açan %40, bölüm bitiren %9,8 | **Doğru, öncelikli.** Paywall'u reddeden 94 kişiyi değere sokan tek yol bu.                                                                                                                                                                                                  |
| **Ana sayfa ikinci şans kartı**               | Denemelerin ~%82'si 0. günde; ikinci teklif şansı D1'e dönenlerle sınırlı           | **Doğru ama tavanı düşük** (D1 %12). Kartı 1. bölüm bitince göster, açılışta değil. Sıklık sınırı koy.                                                                                                                                                                       |
| **Kaynağa göre başlıklar**                    | Genel deneyim; doğrudan veri yok                                                    | **Doğru, düşük maliyet.** `onboarding` başlığı onboarding cevaplarını taşımalı (bkz. öneri B3).                                                                                                                                                                              |

---

## 5. Eksik, yüksek etkili öneriler (sıralı)

Etki aralıkları yalnızca yukarıdaki kaynaklara dayanıyor; bizim hacmimizde ölçülemez, bu yüzden
"tek seferde uygula + kohort karşılaştır" önerilir, A/B değil.

**B1. Yıllık planda denemeyi 7 -> 14 güne çıkar (veya en az test et).** Duolingo TR'de 14 gün veriyor
(Y); RevenueCat uzun denemelerde deneme->ücretli %42,5 vs kısa %25,5 (Y). Okuma ürünü değerini birkaç
oturumda gösterir; 7 günde çoğu kullanıcı D7'ye bile gelmiyor. Risk: tahsilat geç gelir, kısa denemeyle
Adapty +%12-18 deneme->ücretli diyor (karşıt kanıt). Önerim: 14 gün, Duolingo ile eşit algı.
Metin: **"14 gün ücretsiz oku. 12. günde hatırlatırız, istersen tek dokunuşla iptal edersin."**

**B2. Aylık planda deneme YOK, kalsın; ama aylığı ikincil göster.** Aylık 18 seçime karşı yıllık 10:
kullanıcı aylığı aktif olarak tıklıyor. Yıllık ön seçim zaten var. Yıllığı "aylık ₺33,33" olarak
göster, aylığı küçük metin bağlantısına indir ("Aylık plan: ₺79,99/ay"). Kanıt: annual default
%69 vs %28 (D). Not: ₺399,99/₺79,99 = %58 tasarruf zaten güçlü bir çapa; Babbel "SAVE 50%" kullanıyor (O).

**B3. Onboarding paywall'unu onboarding'e özgü yap.** Başlık + kullanıcının seçtiği hedef:
**"{{dakika}} dakikalık günlük hedefinle {{ay}} ayda {{seviye}} seviyesine"** (projeksiyon ekranının
devamı). Babbel ve ELSA kişiselleştirmeyi paywall'a taşıyor (O). Ölü `OnboardingTrialTimeline`
ile birleştir.

**B4. Kapatma sonrası tek seferlik indirimli teklif (exit offer) — dikkatli.** Headway denemeyi
başlatana süreli indirimli yıllık sunuyor; ELSA 10 dk geri sayım kullanıyor (O). Adapty kapanış yerine
down-sell öneriyor (O, uplift verisi yok). Bizde 94 ret var. Öneri: onboarding paywall'u kapatılınca
DEĞİL, **ilk bölüm bitince** tek seferlik "ilk yıl %40 indirim" (App Store promosyon teklifi / ayrı
ürün). Sahte geri sayım koyma (Guideline 2.3.1/5.6 riski + CLAUDE.md "yanıltıcı metadata" ilkesi);
gerçek süre sınırı (ör. 48 saat sunucuda) varsa göster. Metin: **"İlk bölümü bitirdin. Bu hafta
Premium'un ilk yılı ₺239,99 (normalde ₺399,99)."** Etki: kaynakta sayı yok; düşük-orta beklenti.

**B5. Apple win-back teklifi tanımla.** Sona ermiş 6 deneme + 1 iptal yıllık zaten havuz. App Store
Connect'te 1 ay ücretsiz veya ilk 3 ay indirimli win-back; Apple uygunluğu kendisi belirliyor, kod
gerektirmeden mağazada görünüyor (O). Maliyet ~sıfır, performans verisi bulunamadı.

**B6. Taahhüt adımını güçlendir.** Headway "taahhüt sözleşmesi" kullanıyor (O). Bizde günlük hedef
var; ona tek dokunuşluk onay ekle: **"Söz: her gün {{dakika}} dakika okuyacağım."** + aynı ekranda
okuma hatırlatıcısı opt-in. Onboarding'i uzatma: bizimki zaten kısa ve değerli; Praktika 31 adım
ama veri yok, uzunluk kendi başına kanıtlanmış bir kaldıraç değil.

**B7. Sosyal kanıt: yalnızca gerçek olanı.** ELSA yorum + karşılaştırma tablosu kullanıyor (O).
Bizde sahte sayı yasak (doğru). App Store puanı yeterli sayıya gelince "App Store'da 4,x" ekle;
o zamana kadar "ücretsiz vs Premium" iki sütunlu tablo (yalnızca CLAUDE.md'deki gerçek faydalar).

**B8. Ücretsiz kullanıcıya stüdyo sesinden 1 dakikalık örnek.** Denetim: ücretsiz kullanıcı sesi
hiç duymuyor, audio kaynağında 5 iptal / 1 satın alma. Bu ADR-012 ürün kararını değiştirir
(ürün sahibi kararı gerekir); kitap detayında 60 sn önizleme okuma ekranına dokunmaz.

**B9. TR fiyatlandırması.** Duolingo TR IAP'leri ₺139,99'dan ₺1.209,99'a uzanıyor (Y; plan eşlemesi
bilinmiyor). Bizim ₺399,99/yıl muhtemelen pazarın alt bandında; düşürmek için kanıt yok, artırmak
için de hacim yok. **Fiyata dokunma**; önce B1-B4.

**B10. Teknik engeller (rakip analizinden önce gelir):** `missing_ios_api_key` 10 kullanıcı,
RevenueCat yapılandırma hatası 4 kullanıcı, StoreKit sayfasında %48 iptal. Bunlar herhangi bir paywall
tasarımından büyük olabilir; önce kapat.

---

## 6. Kaynaklar

- RevenueCat 2026 benchmark: https://www-docs.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- SaaStr SOSA özeti: https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/
- Airbridge: https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026
- Duolingo App Store TR: https://apps.apple.com/tr/app/duolingo-dil-dersleri/id570060128?l=tr
- Duolingo screensdesign: https://screensdesign.com/apps/duolingo-language-lessons/
- Duolingo deneyi: https://adplist.substack.com/p/duolingo-little-known-experiment ; https://www.itiger.com/news/1109911487
- Babbel: https://screensdesign.com/apps/babbel-language-learning/ ; https://www.lazyweb.com/research/babbel-pricing-paywall-experiments
- Busuu: https://screensdesign.com/showcase/busuu-language-learning
- ELSA: https://screensdesign.com/showcase/elsa-speak-english-learning ; https://adapty.io/paywall-library/elsa/
- Praktika: https://screensdesign.com/showcase/praktika-ai-language-tutor
- Headway: https://screensdesign.com/apps/headway-daily-micro-learning/
- Blinkist: https://b2bpricinginsights.substack.com/p/4-min-read-how-blinkists-new-paywall ; https://adapty.io/blog/paywall-newsletter-23/
- LingQ: https://adapty.io/paywall-library/lingq-learn-42-languages/
- Beelinguapp: https://actualfluency.com/beelinguapp-review
- Cambly TR: https://www.habergazetesi.com.tr/gercek-cambly-ucret-ne-kadar-reklamlardaki-300-tllik-dersler-ne-kadar-gercekci
- Adapty playbook: https://adapty.io/blog/markdown/paywall-experiments-playbook.md ; Prosto: https://wp-prod-new.adapty.io/case-study/prosto
- Win-back: https://www.revenuecat.com/blog/growth/guide-to-apple-win-back-offers
