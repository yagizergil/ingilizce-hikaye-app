# Fiyatlandırma Araştırması — Türkiye

**Araştırma tarihi:** 7 Eylül 2026
**Kaynak:** TR App Store ürün sayfalarından çekilen gerçek IAP fiyatları (`https://apps.apple.com/tr/app/id<ID>?l=tr`) + kamuya açık makro veriler

---

## 1. Türkiye'ye özgü satın alma gücü bağlamı

| Gösterge | Değer | Kaynak |
|---|---|---|
| 2026 net asgari ücret (aylık) | **₺28.075,50** | [EY Türkiye](https://www.ey.com/tr_tr/insights/tax/2026-asgari-ucret), [QNB Invest](https://www.qnbinvest.com.tr/investodak/qnbarastirma/2026-asgari-ucret-aciklandi-net-28075-tl) |
| 2026 brüt asgari ücret | ₺33.030,00 | Aynı |
| Spotify Premium Bireysel (aylık) | **₺135** | [Yeni Birlik](https://www.gazetebirlik.com/teknoloji/spotify-turkiye-2026-abonelik-fiyatlari-ne-kadar-premium-ve-ogrenci-uyelikleri-kac-tl-iste-tum-secenekler-ve-planlar/923676) |
| Spotify Öğrenci | ₺99 | Aynı |
| Netflix Temel (aylık) | **₺189,99** | [Kepyo](https://kepyo.com/blog/2026-dijital-abonelik-maliyetleri-netflix-spotify-rehberi.html) |
| Netflix Standart | ₺289,99 | Aynı |

### Bunun anlamı

**Spotify (₺135) ve Netflix Temel (₺189,99) Türk kullanıcının kafasındaki "aylık dijital abonelik" çıpalarıdır.** Bir eğitim uygulaması bu iki rakamın üzerine çıktığında, kullanıcı bilinçli olarak "Netflix'ten pahalı" karşılaştırması yapar. Bu, kategori normlarından bağımsız, sert bir psikolojik tavandır.

Ayrıca: net asgari ücretin **%1'i ≈ ₺281**. Aylık ₺281 üstü bir eğitim aboneliği, asgari ücretli bir kullanıcı için gelirinin %1'inden fazlası demektir. Bu eşiğin üstündeki rakiplerin (Bookvo ₺499,99, Clew ₺399,00, LingQ ₺699,99) yorum sayıları çok düşük — bu tesadüf değil (bkz. bölüm 4).

---

## 2. App Store Türkiye fiyat basamakları

### Sistem nasıl çalışıyor (kaynaklı)

- Apple 2023'ten beri klasik "Tier 1 / Tier 2" sisteminden **900 fiyat noktasına** geçti; 175 mağaza ve 44 para birimini kapsıyor. ([Mirava](https://www.mirava.io/blog/apple-app-store-price-tiers-how-they-work-2026))
- Geliştirici bir **temel mağaza (base storefront)** seçer; diğer mağazalardaki fiyatlar buna göre otomatik eşitlenir. Türkiye'yi temel mağaza olarak seçersen TR fiyatların kur/vergi değişimiyle **otomatik oynatılmaz.** ([Apple Developer News](https://developer.apple.com/news/?id=nomqoqfm))
- **Türkiye Dijital Hizmet Vergisi 1 Ocak 2026'dan itibaren %7,5 → %5'e düştü.** Apple bu oranı TR geliştiricileri için uyguladı; geliştirici payı vergi hariç fiyat üzerinden hesaplanıyor. ([CNBC-e](https://www.cnbce.com/teknoloji/apple-app-store-gelirlerinde-turkiye-icin-vergi-guncellemesine-gitti-h24067))

**⚠️ Doğrulanamayan nokta:** Apple'ın TR fiyat noktalarının resmi tam listesini açık bir kaynaktan çekemedim — bu liste App Store Connect'in içinde, giriş gerektiriyor. Aşağıdaki basamak listesi **resmi liste değil**, sahadan gözlemlenmiş fiyat noktalarıdır.

### Sahada gerçekten gözlemlenen TL fiyat noktaları

30+ uygulamanın IAP listesinden derlenen **112 farklı fiyat noktası**. Bunlar geçerli fiyat noktalarıdır çünkü hepsi şu anda canlı ürünlerde kullanılıyor:

**Aylık abonelik bölgesi (₺29–₺500):**
`29,99 · 34,99 · 39,99 · 43,99 · 46,99 · 49,90 · 49,99 · 51,99 · 52,99 · 59,99 · 69,99 · 74,99 · 79,99 · 84,90 · 89,99 · 99,99 · 104,99 · 129,99 · 139,99 · 142,99 · 144,99 · 145,00 · 149,00 · 149,99 · 164,99 · 174,99 · 199,00 · 199,99 · 204,99 · 224,99 · 229,99 · 249,99 · 299,99 · 389,99 · 399,00 · 399,99 · 439,99 · 499,99`

**Yıllık abonelik bölgesi (₺129–₺3.850):**
`129,99 · 209,99 · 250,00 · 254,99 · 284,99 · 299,99 · 300,00 · 329,00 · 349,99 · 359,00 · 399,99 · 459,99 · 469,99 · 479,00 · 499,00 · 499,99 · 509,00 · 529,99 · 549,99 · 599,00 · 599,90 · 599,99 · 629,99 · 650,00 · 699,00 · 699,99 · 709,99 · 719,00 · 749,99 · 799,00 · 799,99 · 839,99 · 849,99 · 899,99 · 949,00 · 969,99 · 999,00 · 999,99 · 1.099,00 · 1.199,00 · 1.199,99 · 1.209,99 · 1.299,99 · 1.399,00 · 1.399,99 · 1.499,99 · 1.529,99 · 1.799,00 · 1.849,99 · 1.869,99 · 1.919,99 · 1.999,99 · 2.349,99 · 2.499,99 · 2.549,99 · 2.699,99 · 2.999,99 · 3.099,99 · 3.499,00 · 3.849,99`

**Gözlem:** `,99` ile biten fiyatlar ezici çoğunlukta; `,00` ile bitenler (₺329,00 Readable, ₺359,00 Lizard, ₺650,00 Beelinguapp, ₺5.000,00 LingQ) azınlık. `,90` yalnızca Lizard'da (₺49,90, ₺599,90). Türk kullanıcı için `,99` normdur.

---

## 3. Eğitim/dil kategorisinde gözlemlenen fiyat aralıkları

14 doğrudan okuma/hikaye rakibinin gerçek fiyatları:

| Uygulama | Aylık | Yıllık | Yıllık ÷ 12 ay | Yıllık indirim | Yıllığın aylık eşdeğeri |
|---|---|---|---|---|---|
| Reading English | ₺29,99 | ₺129,99 | 0,36 | **%64** | ₺10,83 |
| Readable | ₺39,99 | ₺329,00 | 0,69 | %31 | ₺27,42 |
| Lizard | ₺49,90 | ₺359,00 | 0,60 | %40 | ₺29,92 |
| Litoo | ₺49,99 | ₺399,99 | 0,67 | %33 | ₺33,33 |
| dicto | ₺149,99 | ₺599,99 | 0,33 | %67 | ₺50,00 |
| Mina | ₺149,99 | ₺799,99 | 0,44 | %56 | ₺66,67 |
| Reading Power | ₺164,99 | ₺749,99 | 0,38 | %62 | ₺62,50 |
| İngilizce Okuma (ERA) | ₺199,99 | ₺1.499,99 | 0,63 | %37 | ₺125,00 |
| Beelinguapp | ₺199,99 | ₺1.199,99 | 0,50 | %50 | ₺100,00 |
| Storish | ₺249,99 | ₺999,99 | 0,33 | %67 | ₺83,33 |
| Readle | ₺249,99 | ₺1.499,99 | 0,50 | %50 | ₺125,00 |
| iStoria | ₺249,99 | ₺1.499,99 | 0,50 | %50 | ₺125,00 |
| Clew | ₺399,00 | ₺1.199,00 | 0,25 | **%75** | ₺99,92 |
| Bookvo | ₺499,99 | ₺1.299,99 | 0,22 | **%78** | ₺108,33 |

**İstatistikler:**
- Aylık: medyan **₺182,49** · ortalama ₺191,70 · aralık ₺29,99–₺499,99
- Yıllık: medyan **₺899,99** · ortalama ₺897,63 · aralık ₺129,99–₺1.499,99
- **Yıllık indirim medyanı: %53**

---

## 4. Kritik bulgu: yüksek fiyat, TR'de kitlesel ölçekle ters orantılı

Aynı 19 uygulamayı aylık fiyatına göre ikiye ayırdığımda:

| Grup | Uygulama sayısı | Yorum medyanı | Toplam yorum |
|---|---|---|---|
| **Aylık ≤ ₺99,99** | 8 | **1.706** | **52.589** |
| **Aylık ≥ ₺149,99** | 11 | **414** | **6.756** |

Ucuz grup: Kolay İng. Kelime (36.929), Readable (1.774), Wordismo (1.638), WordUp (3.579), Atlas (8.541), Litoo (16), Lizard (61), Reading English (51).
Pahalı grup: Reading Power (2.137), İngilizce Okuma/ERA (1.369), Bookvo (414), dicto (140), Clew (110), Storish (9), Mina (6), Diziyle (172), iStoria (532), Beelinguapp (1.361), İng.Okuma+SesliKitap (506).

**Ucuz grup 8 uygulamayla, pahalı grubun 11 uygulamasının toplam yorumunun ~8 katını topluyor.**

⚠️ **Bu bir korelasyondur, nedensellik kanıtı değildir.** Yorum sayısı yaş, pazarlama bütçesi ve ASO'dan da etkilenir; ucuz grupta yaşlı ve iyi konumlanmış uygulamalar var. Ama şu ters yönde bir kanıt **yok**: TR pazarında aylık ₺150+ fiyatlayıp 5.000'i aşan yorum sayısına ulaşmış tek bir yerel okuma/kelime uygulaması bulamadım. Bu fiyat noktasında büyük ölçek gören tek uygulamalar Duolingo, Busuu, EWA gibi küresel oyuncular ve onlar TR fiyatlarını agresif indirimlerle (Busuu yıllık ₺99,99'a kadar, EWA yıllık ₺144,99'a kadar) aşağı çekiyor.

**Kategorinin en çok yorumlanan TR-yerel uygulaması Kolay İngilizce Kelime Öğren (36.929 yorum) ve fiyatı aylık ₺49,99 / yıllık ₺299,99.** Bu, Türkiye pazarında ölçek isteyen bir uygulama için en güçlü tek referans noktası.

---

## 5. ÖNERİ

### Önerilen fiyat yapısı

| Plan | Fiyat | Eşdeğer aylık | Gerekçe |
|---|---|---|---|
| **Aylık** | **₺79,99** | ₺79,99 | Spotify'ın (₺135) ve Netflix Temel'in (₺189,99) belirgin şekilde ALTINDA. Rakip medyanının (₺182,49) %56 altında. Ucuz gruba (≤₺99,99) yerleşiyor. Amaç: aylık planın bir "pahalı çapa" olması, ana ürün olmaması. |
| **Yıllık** | **₺399,99** | ₺33,33 | **Ana ürün.** İndirim: %58 (12×79,99 = ₺959,88 → ₺399,99). Kategori indirim medyanı %53'ün hemen üstünde. Litoo (₺399,99), Lizard (₺359,00), Readable (₺329,00) ile aynı bantta ama premium özellik seti daha zengin. |
| **Deneme (trial)** | **7 gün ücretsiz**, yalnızca yıllık planda | — | Bkz. bölüm 6 |
| **Ömür boyu** | **Şimdilik YOK** | — | Bkz. bölüm 7 |

### Bu önerinin dayandığı rakip verisi

| Karar | Dayanak |
|---|---|
| Aylık ₺79,99 | Ucuz grup üst sınırı ₺99,99; Spotify ₺135 ve Netflix ₺189,99 çıpalarının altı; Cake ₺79,99 ile aynı nokta (4,90 puan, 14.092 yorum — en yüksek puanlı büyük rakip) |
| Yıllık ₺399,99 | Litoo ₺399,99, WordUp ₺399,99, Atlas ₺399,99 ile birebir aynı nokta; Lizard ₺359,00 ve Readable ₺329,00'ın hemen üstü; kategori yıllık medyanı ₺899,99'un çok altı |
| %58 yıllık indirim | Kategori medyanı %53; dicto %67, Storish %67, Reading Power %62 daha agresif. %58 medyanın üstünde ama uç değil. |
| `,99` ile bitirme | Gözlemlenen 112 fiyat noktasının büyük çoğunluğu `,99` |

### İkinci sürüm için hazırda tutulacak A/B fiyat noktaları

Rakipler (Beelinguapp 8, Duolingo 4, Busuu 6 aktif fiyat) sürekli test yapıyor. Lansmanda 3 fiyat noktası hazır olmalı:

| Test | Aylık | Yıllık | Ne öğretir |
|---|---|---|---|
| **A (kontrol)** | ₺79,99 | ₺399,99 | Temel dönüşüm |
| **B (agresif)** | ₺49,99 | ₺299,99 | Kolay İng. Kelime'nin (36.929 yorum) noktası. Hacim mi getiriyor? |
| **C (premium)** | ₺129,99 | ₺599,99 | dicto/Wordismo bandı. Fiyat esnekliği düşük mü? |

**Gelir tarafı notu:** Yıllık ₺399,99 üzerinden Apple komisyonu (%30, ilk yıldan sonra %15) ve TR Dijital Hizmet Vergisi (%5, 2026'dan itibaren) düşüldükten sonra geliştirici payı hesaplanır. Net rakamı burada hesaplamıyorum çünkü Apple'ın TR için vergi hariç matrahı nasıl kurduğunu doğrulayamadım — bu, App Store Connect'te ürün oluşturulurken "Proceeds" sütunundan **kesin olarak görülebilir** ve fiyat kilitlenmeden önce oradan teyit edilmelidir.

---

## 6. Deneme süresi (trial) normları

### Gözlemlenebilen veri

Apple, deneme sürelerini ürün sayfasında **yayınlamıyor.** Elde edebildiğim tek kanıt, IAP ürün **adlarında** geçen "Trial" kelimesi:

| Uygulama | Trial içeren ürün adı | Fiyat |
|---|---|---|
| Beelinguapp | `Beelinguapp Yearly Trial` | ₺799,99 |
| Beelinguapp | `Beelinguapp Yearly Trial Promo` | ₺399,99 |
| Praktika | `Praktika Premium 3 Mon + Trial` | ₺899,99 / ₺599,99 |

**Bu, denemenin YAYGIN olduğunu kanıtlar ama SÜRESİNİ kanıtlamaz.** Süre verisi için her uygulamanın paywall'ını cihazda görmek gerekir — bu araştırmanın kapsamı dışında.

### Öneri (kısmen tahmin)

**7 gün ücretsiz deneme, yalnızca yıllık planda.**

Gerekçe:
- **7 gün ölçülebilir bir davranış üretmeye yeter.** Ürün "okuma" ürünü; bir kullanıcının bir kitaba bağlanıp bağlanmadığı 7 günde belli olur. 3 gün, bir bölümü bile bitirmeye yetmeyebilir.
- **14/30 gün bu üründe risklidir:** ücretsiz katman zaten tam kütüphaneye erişim veriyor (ürün ilkesi #2). Uzun deneme, kullanıcının premium'a hiç ihtiyaç duymadan tüm değeri almasına yol açar.
- **Yalnızca yıllık planda deneme vermek** kullanıcıyı yıllık plana yönlendiren standart ve etkili bir tekniktir; Beelinguapp ve Praktika'nın ürün adları bunu yaptıklarını doğruluyor (`Yearly Trial`, `3 Mon + Trial` — ikisi de aylık değil).

⚠️ Bu bölümdeki "7 gün" önerisi **tahmindir**; Türkiye'ye özgü doğrulanmış trial-süresi/dönüşüm verisi bulamadım. Lansmandan sonra 3 gün vs 7 gün A/B testi yapılmalıdır.

---

## 7. "Ömür boyu" (lifetime) seçeneği — bu kategoride mantıklı mı?

### Kim yapıyor (gerçek veri)

İncelenen 30 uygulamadan 8'i (%27) ömür boyu sunuyor:

| Uygulama | Ömür boyu fiyatı | Yıllık fiyatı | Ömür boyu ÷ yıllık | Yorum sayısı |
|---|---|---|---|---|
| Kolay İngilizce Kelime | ₺299,99–₺499,99 | ₺299,99 | 1,0–1,7× | 36.929 |
| Lizard | ₺599,90 (eski ₺300,00) | ₺359,00 | 1,7× | 61 |
| Diziyle Öğren | ₺1.299,99 | ₺699,99 | 1,9× | 172 |
| Reading Power | ₺1.499,99 | ₺749,99 | 2,0× | 2.137 |
| Clew Forever | ₺1.799,00 (indirimli ₺1.399,00) | ₺1.199,00 | 1,5× | 110 |
| İng. Okuma ve Sesli Kitap | ₺1.999,99 | ₺1.299,99 | 1,5× | 506 |
| Memrise | ₺2.549,99 | ₺1.869,99 | 1,4× | 64.195 |
| Readle | ₺3.499,00 | ₺1.499,99 | 2,3× | 532 |

**Örüntü: ömür boyu fiyatı, yıllık fiyatın 1,4–2,3 katı (medyan ~1,6×).** Yani rakipler ömür boyunu "1,5 yıllık abonelik" olarak fiyatlıyor — bu, LTV açısından oldukça saldırgan bir indirimdir.

### Değerlendirme: **HAYIR, en azından şimdilik yapma.**

**Aleyhine olan gerekçeler (bu ürüne özgü):**

1. **Premium özelliklerin çoğu tekrarlayan maliyet üretiyor.** AI destekli açıklamalar (LLM API çağrısı) ve sesli okuma (TTS) kullanım başına para yakar. Ömür boyu satmak, kullanım maliyeti sınırsız olan bir ürünü tek seferlik ücrete bağlamak demektir. Bu, Duolingo/Busuu gibi sabit içerikli uygulamalarda farklı, AI ağırlıklı bir üründe **doğrudan zarar riskidir.** Ömür boyu sunan 8 rakipten hiçbiri ana vaadi AI değil.
2. **Türkiye'de ömür boyu fiyat, enflasyon nedeniyle özellikle riskli.** Bugünün ₺600'ü 3 yıl sonra çok başka bir şey olur; abonelik fiyatını yükseltebilirsin, ömür boyu satılmış hakkı geri alamazsın.
3. **Ürün henüz yazılmamış.** Premium özellik seti (AI, TTS, SRS, offline, istatistikler) henüz mevcut değil. Var olmayan bir şeyin ömrünü satmak, kullanıcı beklentisini yönetilemez hale getirir.
4. **Ömür boyu sunan rakiplerin performansı ikna edici değil.** Ömür boyu satan 8 uygulamadan yalnızca 3'ü 1.000'in üstünde yoruma sahip ve o üçünden ikisi (Kolay İng. Kelime, Memrise) ömür boyunu ana ürün değil, üst-satış olarak konumlandırıyor.

**Lehine tek argüman:** Türk kullanıcıda abonelik yorgunluğu gerçektir ve "tek seferlik ödeyeyim kurtulayım" talebi vardır. Lizard'ın "Ömür Boyu" ürünü ve Clew'in "Clew Forever" ürününü öne çıkarması bunun kanıtı.

**Uzlaşı önerisi:** Ömür boyu yerine, ürün olgunlaştıktan sonra (premium özellikler canlıya alındıktan ~6 ay sonra) **"2 yıllık plan"** test edilebilir. Tek seferlik ödeme hissini verir, süresiz maliyet taahhüdü yaratmaz, enflasyon riskini sınırlar.

---

## 8. Ulaşılamayan veriler

- **Apple'ın TR fiyat noktalarının resmi tam listesi** — App Store Connect girişi gerektiriyor. Yukarıdaki 112 nokta gözlemdir, resmi liste değil.
- **Rakiplerin deneme süreleri** — App Store metadatasında yok.
- **Dönüşüm oranları (free→trial→paid)** — hiçbir açık kaynakta yok.
- **Rakiplerin ARPU/gelir rakamları** — ücretli araç (Sensor Tower vb.) gerektirir.
- **Türkiye'ye özgü yıllık vs aylık dönüşüm oranı** — güvenilir, TR'ye özgü, kaynaklandırılabilir veri bulamadım. Bölüm 5'teki yıllık odaklılık, rakiplerin **davranışından** (yıllık planlara %53 medyan indirim vermelerinden ve denemeyi yıllığa bağlamalarından) çıkarılmıştır, ölçülmüş dönüşüm verisinden değil.
- **Geliştirici net payı (proceeds)** — App Store Connect'te ürün oluştururken teyit edilmeli.
