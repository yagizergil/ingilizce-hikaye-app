# Rakip Analizi — Türkiye App Store

**Araştırma tarihi:** 7 Eylül 2026
**Pazar:** App Store Türkiye (`country=tr`, `lang=tr_tr`)

## Veri kaynakları ve yöntem

| Veri | Kaynak | Notu |
|---|---|---|
| Uygulama adı, puan, yorum sayısı, açıklama, sürüm tarihi | iTunes Search API — `https://itunes.apple.com/search?term=<terim>&country=tr&lang=tr_tr&entity=software&limit=25` | 44 farklı arama terimi çalıştırıldı |
| Uygulama içi satın alım (IAP) adları ve TL fiyatları | `https://apps.apple.com/tr/app/id<ID>?l=tr` sayfasının gömülü JSON'u (`Uygulama İçi Satın Alımlar` → `textPairs`) | Apple bu listede **en fazla 10 IAP** gösterir; 10'dan fazla ürünü olan uygulamalarda liste eksiktir |
| 30 karakterlik altyazı (subtitle) | Aynı sayfalardaki "Beğenebilirsiniz / Benzer uygulamalar" raf lockup'ları | 253 uygulamanın Türkçe altyazısı bu yolla toplandı |

### Yöntemin bilinen sınırları (önemli)

1. **Apple, bir uygulamanın kendi altyazısını kendi ürün sayfasında YAYINLAMIYOR.** Ürün sayfasındaki `<h1>` altındaki metin altyazı değil, kategori adıdır (ör. "Eğitim"). Altyazıyı yalnızca arama sonuçlarında ve "benzer uygulamalar" raflarında gösteriyor. Bu yüzden altyazıları başka uygulamaların raflarından topladım. Bir uygulama hiçbir rafta görünmediyse altyazısı **"veri yok"** olarak işaretlendi.
2. **Rafta altyazı yerine "Eğitim" görünüyorsa**, bu uygulamanın o dil (tr) için altyazı tanımlamamış olduğunun güçlü göstergesidir — Apple altyazı yoksa kategoriyi gösterir. Bu durumu ayrıca not ettim çünkü kendi başına bir rekabet bulgusudur.
3. **iTunes API indirme sayısı, gelir veya arama hacmi vermez.** Bu dosyada hiçbir indirme/hacim rakamı yoktur. Yorum sayısı (`userRatingCount`) tek somut ölçek göstergesidir.
4. IAP listesindeki fiyatlar **liste fiyatlarıdır**; kullanıcının paywall'da gördüğü fiyat A/B testine göre değişir. Aynı üründen birden çok fiyat görünmesi (ör. Beelinguapp'te 6 farklı yıllık) aktif fiyat testinin kanıtıdır.
5. Ücretsiz katman sınırları App Store metadatasında yayınlanmaz. Aşağıda yalnızca uygulama açıklamasında **açıkça yazan** sınırlar aktarılmıştır; yazmıyorsa "veri yok".

---

## A. Doğrudan rakipler — "okurken kelimeye dokun, çevirisini gör"

Bunlar birebir aynı çekirdek etkileşimi sunanlar. Asıl rekabet burada.

### A1. İngilizce Okuma (ERA) — **en yakın rakip**

| Alan | Değer |
|---|---|
| Geliştirici | Furkan Torun (bireysel, TR) |
| App Store ID | [1448864234](https://apps.apple.com/tr/app/id1448864234) |
| Başlık | `İngilizce Okuma` — **15 karakter** (30'un yarısı boş!) |
| Altyazı | `Dokun, Çevir, İngilizce Öğren` — **29 karakter** |
| Puan / yorum | 4,58 / 1.369 |
| Son güncelleme | 18 Nisan 2026 |
| Fiyatlandırma | Aylık ₺199,99 · 6 aylık ₺999,99 · Yıllık ₺1.499,99 · **Reklamları Kaldır ₺399,99** (tek seferlik) |
| Ücretsiz katman sınırı | Açıklamada yazmıyor → veri yok. Ancak "Reklamları Kaldır" IAP'ının varlığı **ücretsiz katmanın reklamlı olduğunu kanıtlıyor.** |
| Konumlandırma cümlesi | "İngilizce kitap okurken öğrenen tek uygulama — bir kelimeye dokun, anında çevirisini gör, flash karta dönüştür." |

**Değerlendirme:** Bizim ürün tanımımızla neredeyse birebir aynı. "Dokun, Çevir" altyazısı bizim planladığımız mesajın aynısı. **Bu uygulamanın iki büyük açığı var:** (a) başlığın 15 karakteri boş duruyor, (b) reklam gösteriyor. Bizim "okuma ekranında asla reklam yok" ilkemiz doğrudan bu rakibe karşı bir silah.

### A2. Readable: İngilizce Hikayeler

| Alan | Değer |
|---|---|
| Geliştirici | Playlingo Ltd |
| ID | [1556644199](https://apps.apple.com/tr/app/id1556644199) |
| Başlık | `Readable: İngilizce Hikayeler` — **29 karakter** |
| Altyazı | **veri yok** — 3 farklı rafta "Eğitim" görünüyor → tr altyazısı tanımlı değil (fırsat) |
| Puan / yorum | 4,76 / 1.774 |
| Son güncelleme | 13 Temmuz 2025 (14 aydır güncellenmemiş) |
| Fiyatlandırma | Readable Plus aylık **₺39,99** · yıllık **₺329,00** (%31 indirim) — kategorinin en ucuzu |
| Ücretsiz katman | Açıklamada "her İngilizce öğrenen için ücretsiz" iddiası var, kesin sınır yazmıyor → veri yok |
| Konumlandırma | "Readable, harika hikayeleri okuması kolay ve her İngilizce öğrenen için ücretsiz hale getirir" |

**Değerlendirme:** `ingilizce hikaye`, `ingilizce hikayeler`, `ingilizce hikaye kitabı`, `english story` aramalarının hepsinde **1. sırada**. Başlıktaki "İngilizce Hikayeler" bunu tek başına sağlıyor. Ama içeriği korku/gerilim kısa öyküler ve **her gün güncellenen haberler** — klasik roman değil. Ayrıca 14 aydır güncellenmemiş ve tr altyazısı yok. Sıralamada geçilebilir bir hedef.

### A3. Reading Power: Okuma - Kelime

| Alan | Değer |
|---|---|
| Geliştirici | Mustafa Dayanır (bireysel, TR) |
| ID | [1565562490](https://apps.apple.com/tr/app/id1565562490) |
| Başlık | `Reading Power: Okuma - Kelime` — **29 karakter** |
| Altyazı | **veri yok** (raflarda "Eğitim") |
| Puan / yorum | 4,77 / 2.137 |
| Son güncelleme | **30 Eylül 2022** — 4 yıldır güncellenmemiş |
| Fiyatlandırma | Aylık ₺164,99 · 3 aylık ₺329,99 · 6 aylık ₺549,99 · Yıllık ₺749,99 · **Yıllık %25 İndirim ₺549,99** · **Ömür Boyu ₺1.499,99** (%20 indirimli varyantı da ₺1.499,99) |
| Ücretsiz katman | veri yok |
| Konumlandırma | "YDS, YÖKDİL, YDT ve TOEFL gibi İngilizce akademik dil sınavlarında başarılı olmak için..." |

**Değerlendirme:** **Sınav odaklı** — bizim hedef kullanıcımız değil. Ama `ingilizce hikaye`, `ingilizce okuma`, `ingilizce kitap` aramalarının hepsinde ilk 3'te. 4 yıldır güncellenmemesine rağmen sıralamayı tutuyor; bu, bu kategoride **yorum sayısının sıralamada güncellikten daha ağır bastığını** gösteriyor.

### A4. Diğer doğrudan rakipler (özet tablo)

| Uygulama | ID | Başlık (kar.) | Altyazı (kar.) | Puan/Yorum | Aylık | Yıllık | Ömür boyu |
|---|---|---|---|---|---|---|---|
| İngilizce Kitap Oku ve Dinle (dicto) | 6475873100 | `İngilizce Kitap Oku ve Dinle` (28) | `Sesli Hikayeler ve Çeviri` (25) | 4,74 / 140 | ₺149,99 (test: ₺249,99) | ₺599,99 (test: ₺699,99 / ₺999,99) | — |
| Bookvo: İngilizce Kitaplar | 1594438558 | `Bookvo: İngilizce Kitaplar` (26) | `Oku, dinle ve kelime öğren` (26) | 4,36 / 414 | ₺499,99 (haftalık ₺299,99) | ₺1.299,99 (test: ₺2.999,99) | — |
| İngilizce Okuma ve Sesli Kitap | 1010281779 | `İngilizce Okuma ve Sesli Kitap` (30) | `Yeni başlayanlar için` (21) | 4,59 / 506 | ₺499,99 (haftalık ₺249,99) | ₺1.299,99 | **₺1.999,99** |
| Litoo: İngilizce Kitap Oku | 6742233378 | `Litoo: İngilizce Kitap Oku` (26) | `Hikaye, Roman ve Kelime Ezberi` (30) | 4,38 / 16 | ₺49,99 | ₺399,99 / ₺499,99 | — |
| Clew: okuyarak İngilizce öğren | 6746718692 | `Clew: okuyarak İngilizce öğren` (30) | `Hızlı ve kolay kelime öğrenme` (29) | 4,82 / 110 | ₺399,00 | ₺1.199,00 (kampanya ₺949,00) | **Clew Forever ₺1.799,00** (indirimli ₺1.399,00) |
| Lizard - Kolay İngilizce Öğren | 1666846390 | `Lizard - Kolay İngilizce Öğren` (30) | `Kitap Oku & Kelime Ezberle` (26) | 4,52 / 61 | ₺49,90 | ₺359,00 | **₺599,90** (eski ₺300,00) |
| Mina - Hikayelerle İngilizce | 6758695637 | `Mina - Hikayelerle İngilizce` (28) | veri yok | 4,67 / **6** | ₺149,99 | ₺799,99 | — |
| Storish - İngilizce Öğren | 6755447332 | `Storish - İngilizce Öğren` (25) | `Hikaye Oku ve Kelime Öğren` (26) | 5,00 / **9** | ₺249,99 | ₺999,99 | — |
| Reading English, İngilizce Oku | 1585494954 | `Reading English, İngilizce Oku` (30) | `İngilizce Kitap Oku&Çevir&Çöz` (29) | 4,69 / 51 | ₺29,99 | ₺129,99 | — |
| Englisten: İngilizce kitap oku | 6736916125 | `Englisten: İngilizce kitap oku` (30) | `İngilizce hikayeler ile öğren` (29) | 4,73 / 37 | **IAP yok** | — | — |
| Türkçe İngilizce Hikayeler | 6759211828 | `Türkçe İngilizce Hikayeler` (26) | `Oku, Dinle ve Kelime Öğren` (26) | 5,00 / **2** | IAP yok | — | — |
| Kolay İngilizce Öğren- iStoria | 1527544903 | `Kolay İngilizce Öğren- iStoria` (30) | `Oxford Hikayeleri Dünyası` (25) | 4,62 / 532 | ₺104,99–₺249,99 | ₺629,99–₺1.499,99 | — |
| BOOKR Class İngilizce Öğren | 1478717573 | `BOOKR Class İngilizce Öğren` (27) | veri yok (raflarda "Eğitim") | 4,30 / 1.418 | ₺389,99 | **₺3.849,99** | — |

---

## B. Küresel oyuncular (TR mağazasındaki gerçek TL fiyatlarıyla)

| Uygulama | ID | Başlık (kar.) | Altyazı (kar.) | Puan/Yorum | Aylık | Yıllık | Ömür boyu |
|---|---|---|---|---|---|---|---|
| **Duolingo: Dil ve Satranç** | 570060128 | `Duolingo: Dil ve Satranç` (24) | veri yok | 4,73 / **481.105** | ₺139,99 (ayrıca ₺52,99 tespit edildi) | ₺839,99 / ₺969,99 / ₺1.209,99 (aktif test) · Aile ₺1.199,99 | — |
| **Busuu: İngilizce +13 dil öğren** | 379968583 | `Busuu: İngilizce +13 dil öğren` (30) | `Almanca, Fransızca - Öğrenme` (28) | 4,67 / 87.248 | ₺34,99 / ₺84,90 | ₺99,99 / ₺250,00 / ₺300,00 / ₺509,00 / ₺1.099,00 · Premium Plus ₺1.529,99 | — |
| **EWA: Dilleri Öğren** | 1200778841 | `EWA: Dilleri Öğren` (18) | `Educational language courses`* | 4,68 / 81.739 | ₺199,99 / ₺204,99 / ₺499,99 | ₺144,99 (%70 indirim) / ₺254,99 / ₺699,99 / ₺799,99 / ₺849,99 | — |
| **Memrise: Yeni bir dil konuş** | 635966718 | `Memrise: Yeni bir dil konuş` (27) | `Orada yaşıyormuş gibi öğren` (27) | 4,76 / 64.195 | ₺439,99 (haftalık ₺11,99) | ₺1.869,99 / ₺1.919,99 / ₺2.499,99 | **₺2.549,99** |
| **Cake: İngilizce & Korece Öğren** | 1350420987 | `Cake: İngilizce & Korece Öğren` (30) | veri yok (raflarda "Eğitim") | 4,90 / 14.092 | ₺79,99 | ₺529,99 / ₺709,99 · Aile ₺2.999,99 | — |
| **Falou - En iyi dil uygulaması** | 1460579936 | `Falou - En iyi dil uygulaması` (29) | `İngilizce, İspanyolca öğrenin` (29) | 4,79 / 21.504 | ₺99,99 / ₺129,99 (AI) / ₺174,99 | ₺349,99 / ₺529,99 | ₺1.999,99 (muhtemel) |
| **LingQ \| Dil Öğrenme** | 379385811 | `LingQ \| Dil Öğrenme` (19) | `Akıcılığa giden yol` (19) | 4,69 / 1.168 | ₺699,99 · Plus ₺1.299,99 | **₺5.499,00** · Plus ₺11.999,99 · 6 ay ₺2.699,99 | ₺5.000,00 |
| **Beelinguapp: ingilizce öğren** | 1225056371 | `Beelinguapp: ingilizce öğren` (28) | `Almanca öğrenin, Fransızca` (26) | 4,50 / 1.361 | ₺199,99 | **6 farklı aktif yıllık fiyat:** ₺199,99 / ₺399,99 / ₺599,99 / ₺650,00 / ₺719,00 / ₺799,99 / ₺999,99 / ₺1.199,99 | — |
| **Blinkist: Book Summaries** | 568839295 | `Blinkist: Book Summaries Daily` (30) | veri yok | 4,66 / 2.223 | ₺43,99 / ₺99,99 | ₺209,99 / ₺459,99 / ₺599,99 · Pro ₺839,99 | — |
| **Readle: Her Gün Dil Öğrenin** | 1574889455 | `Readle: Her Gün Dil Öğrenin` (27) | `Yabancı dili hikayelerle öğren` (30) | 4,61 / 532 | ₺142,99 / ₺249,99 | ₺799,00 / ₺1.499,99 | **₺3.499,00** |
| **Readlang** | — | — | — | — | — | — | **iOS uygulaması yok.** Readlang bir web/Chrome eklentisidir; TR App Store'da bulunamadı. `readlang` araması yalnızca ilgisiz üçüncü taraf "ReadLang WatchLang" (id1602114377, 4,82/60, IAP yok) sonucunu döndürüyor. |

\* EWA'nın altyazısı `?l=tr` yerine varsayılan dilde yakalandı; Türkçe altyazısı raflarda görünmedi → tr altyazısı doğrulanmadı.

---

## C. Yerel kelime/ezber uygulamaları (dolaylı rakip, kelime alanında)

| Uygulama | ID | Başlık (kar.) | Altyazı (kar.) | Puan/Yorum | Fiyat |
|---|---|---|---|---|---|
| Kolay İngilizce Kelime Öğren | 1195424864 | `Kolay İngilizce Kelime Öğren` (28) | `5 Dakikada İngilizce Ezberle` (28) | 4,80 / **36.929** | Aylık ₺49,99 · Yıllık ₺299,99 · **Pro Lifetime ₺299,99–₺499,99** · Reklam kaldır ₺999,99 |
| Atlas - İngilizce Kelime Öğren | 1438344260 | `Atlas - İngilizce Kelime Öğren` (30) | `TOEFL, YÖKDİL, IELTS hazırlık` (29) | 4,75 / 8.541 | Aylık ₺29,99–₺99,99 · Yıllık ₺74,99–₺899,99 · Premium ₺1.999,99 |
| WordUp: İngilizce Kelime Öğren | 1365078730 | `WordUp: İngilizce Kelime Öğren` (30) | `Dil Kartlarıyla Kelime Ezberle` (30) | 4,68 / 3.579 | Aylık ₺69,99–₺144,99 · Yıllık ₺284,99–₺1.499,99 |
| Wordismo - İngilizce Kelime | 1585704905 | `Wordismo - İngilizce Kelime` (27) | `İngilizce Kelime Öğrenme` (24) | 4,69 / 1.638 | Aylık ₺99,99 · Yıllık ₺599,99 · + elmas/altın tüketilebilir IAP'lar |
| İngilizce - Kelimeler Öğren | 1492827466 | `İngilizce - Kelimeler Öğren` (27) | `Kelime Öğrenme & Ezberleme` (26) | **4,86** / 5.196 | veri yok |
| Tureng Kelime Defteri | 1484547428 | `Tureng Kelime Defteri` (21) | veri yok | 4,51 / 436 | Aylık **₺3,99** · Yıllık **₺29,99** |
| İngilizce Kelime Öğren :Wordly | 1143554665 | `İngilizce Kelime Öğren :Wordly` (30) | `Vocabulary, Verbs, Idioms` (25) | 3,97 / 622 | Aylık ₺4,99–₺7,99 · Yıllık ₺39,99–₺69,99 (fiyatlar yıllardır güncellenmemiş) |
| Diziyle Öğren-İngilizce Kelime | 6444682457 | `Diziyle Öğren-İngilizce Kelime` (30) | `Quiz ve test ile ezber, pratik` (30) | 4,55 / 172 | Aylık ₺149,99 · Yıllık ₺699,99 · **Ömür Boyu ₺1.299,99** |
| Idiom: Yerli olmak | 1133735231 | `Idiom: Yerli olmak` (18) | `Bağlamda dil öğrenmek` (21) | 4,84 / 1.853 | Pro ₺229,99 · **Student ₺129,99** · Patron ₺299,99 |

---

## D. Rakiplerden çıkan somut örüntüler

**1. Türkçe altyazı boş bırakılıyor — ciddi bir açık.**
Topladığım 253 altyazının **74'ü (%29)** "Eğitim" (yani altyazı tanımsız). Bunlar arasında Readable (kategori lideri), Reading Power, BOOKR, Cake, Duolingo, Bright, Open English, Babbel gibi büyük isimler var. Altyazı Apple'da başlıkla **eşit ağırlıkta** indekslenir. Doldurulmuş 30 karakter, bu rakiplere karşı bedava avantajdır.

**2. Başlıkta 30 karakterin tamamı kullanılıyor.**
Doğrudan rakiplerin çoğu 26–30 karakter aralığında. İstisna: "İngilizce Okuma" (15) ve "EWA: Dilleri Öğren" (18) — bunlar marka gücüne güveniyor. Yeni bir uygulama için 30 karakterin tamamını kullanmak zorunlu.

**3. "İngilizce" kelimesi başlıkta neredeyse evrensel.**
Doğrudan rakiplerin 13'ünden 12'sinde başlıkta "İngilizce" geçiyor. İstisna: Readable (altyazıya taşımış değil, başlıkta "İngilizce Hikayeler" var — yani o da geçiyor). Gerçek istisna yok. Bu kelime pazarlık konusu değil.

**4. Agresif fiyat A/B testi standart.**
Beelinguapp'te 8, Duolingo'da 4, Busuu'da 6, iStoria'da 6 farklı fiyat noktası aynı anda aktif. Tek fiyatla çıkmak kategori normuna aykırı; en baştan 2–3 fiyat noktası test edilmeli.

**5. Ücretsiz katman sınırları hiçbir yerde ilan edilmiyor.**
İncelediğim 30+ uygulamanın hiçbiri App Store açıklamasında "ücretsiz katmanda X kitap / Y kelime" gibi net sınır yazmıyor. Kullanıcı sınırı ancak indirdikten sonra öğreniyor. Bu, **açıkça sınır ilan etmenin bir farklılaşma aracı olduğu** anlamına geliyor (bkz. `04-konumlandirma.md`).

**6. Reklam, doğrudan rakiplerde yaygın.**
"Reklamları Kaldır" IAP'ı olanlar: İngilizce Okuma (₺399,99), Kolay İngilizce Kelime Öğren (₺999,99). Yani en yakın rakibimiz okuma deneyimine reklam koyuyor.

**7. Halka açık/public domain içerik hiçbir rakip tarafından pazarlanmıyor.**
İncelediğim hiçbir açıklamada "public domain", "Project Gutenberg", "telifsiz klasikler" ifadesi geçmiyor. Readable "korku ve gerilim öyküleri + günlük haberler", iStoria "Oxford içeriği", BOOKR lisanslı çocuk kitapları sunuyor. Klasik edebiyat kütüphanesi konumlandırması **boş.**

**8. Ömür boyu (lifetime) seçeneği azınlıkta ama var.**
Ömür boyu sunanlar: Reading Power ₺1.499,99 · Clew ₺1.799,00 · Lizard ₺599,90 · Readle ₺3.499,00 · İngilizce Okuma ve Sesli Kitap ₺1.999,99 · Diziyle Öğren ₺1.299,99 · Memrise ₺2.549,99 · Kolay İngilizce Kelime ₺299,99–499,99. İncelenen 30 uygulamadan 8'i (~%27).

---

## Ulaşılamayan veriler (dürüst liste)

- **İndirme sayıları** — Apple hiçbir açık API'den vermiyor. Ücretli araç (Sensor Tower / data.ai / Appfigures) gerekir.
- **Gerçek arama hacimleri** — yalnızca Apple Search Ads hesabıyla (Search Match popülerlik skoru) elde edilir. Bkz. `02-anahtar-kelimeler.md`.
- **Anahtar kelime alanının içeriği** — hiçbir rakibin 100 karakterlik gizli alanı okunabilir değil. Sadece başlık + altyazı görünür.
- **Ücretsiz katman sınırları** — App Store metadatasında yok; her uygulamayı kurup denemek gerekir.
- **Deneme (trial) süreleri** — Apple ürün sayfasında yayınlanmıyor. Yalnızca "Beelinguapp Yearly Trial", "Praktika Premium 3 Mon + Trial" gibi **ürün adlarından** trial varlığı çıkarılabiliyor, süresi çıkarılamıyor.
- **Dönüşüm oranları / ARPU** — hiçbir açık kaynakta yok.
- **Linga: Kitap oku & dil öğren** (id1525101819, 4,71/104) ürün sayfası 4 denemede de çekilemedi → IAP verisi yok.
