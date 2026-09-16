# Rakip Araştırması — Galeri Görselleri, Lokalizasyon Derinliği ve Format Gereksinimleri

**Araştırma tarihi:** 15 Eylül 2026
**Kapsam:** 10 pazar (tr, us, de, fr, it, es, ru, sa, cn, jp) × 7 rakip
**Yöntem:** iTunes Lookup API (`https://itunes.apple.com/lookup?id=<ID>&country=<ülke>`)
ile her rakibin her pazardaki `trackName`, `screenshotUrls`,
`ipadScreenshotUrls` ve `description` alanları çekildi; galeri görselleri
tam çözünürlükte indirilip gözle incelendi.

> Bu dosya `01-rakipler.md`'nin (7 Eylül 2026, yalnızca TR pazarı,
> fiyatlandırma odaklı) yerini ALMAZ, onu tamamlar. Orada fiyat ve
> başlık/altyazı verisi var; burada **görsel galeri, lokalizasyon
> derinliği ve dosya formatı** var. Çelişki yok, kesişim yok.

---

## 0. Ölçülen ve ölçülemeyenler (dürüstlük notu)

| Ölçüldü (gerçek veri)                                                                               | Ölçülemedi                                                                        |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Her pazarda kaç ekran görüntüsü yüklendiği                                                          | İndirme sayısı, dönüşüm oranı                                                     |
| Ekran görüntüsünün o pazara özel mi yoksa varsayılan (İngilizce) mı olduğu — kaynak dosya adından   | Gerçek arama hacimleri (Apple Search Ads hesabı gerekir)                          |
| Rakiplerin yüklediği kaynak çözünürlük — kaynak dosya adından (`1242x2208`, `iPhone6.5`, `iOS-5.5`) | Rakiplerin 100 baytlık gizli anahtar kelime alanı (Apple hiçbir zaman yayınlamaz) |
| Başlık kalıpları, açıklama ilk 3 satırı                                                             | A/B testi yapıp yapmadıkları                                                      |

**Kaynak dosya adı yöntemi:** Apple, yüklenen dosyanın orijinal adını CDN
yolunda saklıyor. `..._1242x2208_-_German_1.jpg` gibi bir yol hem
çözünürlüğü hem de o karenin Almanca için ayrıca üretildiğini kanıtlıyor.
Aynı ID iki pazarda görünüyorsa o pazar **varsayılana düşmüş** demektir.

---

## 1. En kritik bulgu: Türkçe ve Arapça galeri lokalizasyonu BOŞ

Yedi rakibin onu pazardaki galeri kaynak dosyaları karşılaştırıldı.
Aynı dosya kimliği = aynı görsel = lokalize edilmemiş.

| Rakip       | tr            | de                         | fr                | it                | es              | ru                | **sa (Arapça)** | zh              | ja                |
| ----------- | ------------- | -------------------------- | ----------------- | ----------------- | --------------- | ----------------- | --------------- | --------------- | ----------------- |
| Duolingo    | ❌ varsayılan | ✅ `de_iphone6.5_screen_1` | ✅ `fr_iphone6.5` | ✅ `it_iphone6.5` | ✅ `ES_-_V2`    | ✅ `ru_iphone6.5` | ❌ varsayılan   | ✅ `1242x2688`  | ✅ `ja_iphone6.5` |
| Busuu       | ❌ varsayılan | ✅ `iOS-5.5-DE`            | ✅ `iOS-5.5-FR`   | ✅ `iOS-5.5-IT`   | ✅ `iOS-5.5-ES` | ✅ `iOS-5.5-RU`   | ❌ varsayılan   | ✅ `iOS-5.5-ZH` | ✅ `iOS-5.5-JA`   |
| Memrise     | ❌ varsayılan | ✅ ayrı ID                 | ✅ ayrı ID        | ✅ ayrı ID        | ✅ ayrı ID      | — uygulama yok    | ❌ varsayılan   | ✅ ayrı ID      | ✅ ayrı ID        |
| LingQ       | ❌ varsayılan | ✅ `appstore-iphone-DE`    | ✅ `-FR`          | ✅ `-it`          | ✅ `-ES`        | ❌ varsayılan     | ❌ varsayılan   | ✅ `-zh`        | ✅ `-JP`          |
| Beelinguapp | ❌ varsayılan | ✅ `German_1`              | ✅ `French`       | ✅ `Italian`      | ✅ `Español`    | ✅ `Russian`      | ❌ varsayılan   | ✅ `Chinese`    | ✅ `Japanese`     |
| Readle      | ❌ varsayılan | ✅ `Screen_1_2025`         | ✅ ayrı           | ✅ ayrı           | ✅ ayrı         | ✅ ayrı           | ❌ varsayılan   | ✅ ayrı         | ✅ ayrı           |
| EWA         | ❌ varsayılan | ✅ ayrı ID                 | ✅ ayrı ID        | ✅ ayrı ID        | ✅ ayrı ID      | ✅ `1_first.png`  | ❌ varsayılan   | — uygulama yok  | ✅ ayrı ID        |

**Sonuç: 7 rakibin 7'si de Türkçe galeri görseli üretmemiş. 7'si de Arapça
üretmemiş.** Almanca/Fransızca/İtalyanca/İspanyolca/Çince/Japonca'da ise
neredeyse hepsi lokalize ediyor.

Bunun anlamı net: **tr ve sa pazarlarında lokalize galeri, bize rakiplerin
hiçbirinin sahip olmadığı bir avantaj veriyor** — ve bizim için maliyeti
sıfıra yakın, çünkü uygulama zaten 10 dilde çalışıyor ve arayüz zaten
Türkçe/Arapça (RTL dahil) render ediliyor. Gerçek ekran görüntüsü almak
yeterli.

Diğer altı dilde ise lokalize galeri **avantaj değil, giriş bileti** —
yapmazsak geride kalırız.

> Arapça için ek not: RTL galeri görselinde cihaz mockup'ının da sağdan
> sola akması gerekiyor. Uygulamada RTL zaten gerçek onboarding akışında
> devrede (bkz. CLAUDE.md, 2026-09-14 oturumu), yani gerçek ekran
> görüntüsü doğru çıkacak. Metin overlay'inin hizası da sağa alınmalı.

---

## 2. Galeri görseli sayısı — pazar başına ölçüm

Apple lokalizasyon başına **en fazla 10** ekran görüntüsüne izin veriyor.
Ölçülen gerçek kullanım:

| Rakip       | iPhone kare sayısı (pazar aralığı) | iPad |
| ----------- | ---------------------------------- | ---- |
| LingQ       | **9–10** (sınıra en yakın)         | 9–10 |
| Busuu       | 7–10                               | 8–10 |
| Memrise     | 5–9                                | 5–9  |
| Readle      | 7–9                                | 5–8  |
| Duolingo    | 5–8                                | 5–8  |
| Beelinguapp | 8 (her pazarda tam 8)              | 7–8  |
| EWA         | 6–7                                | 5–6  |

**Medyan 8.** Bizim 8 kare planımız kategori normunun tam ortasında ve
doğru. 10'a çıkmanın kanıtlanmış faydası yok (kullanıcı ilk 2–3 kareden
sonrasını nadiren görüyor); 5'in altı ise Duolingo gibi marka gücü olanlara
özgü bir lüks.

**Kritik sıralama gerçeği:** App Store arama sonucu şeridinde portre
görsellerde **ilk 3 kare**, manzara (landscape) görsellerde **ilk 1 kare**
kaydırmadan görünüyor. Bu, aşağıdaki yönelim kararını doğrudan etkiliyor.

---

## 3. Görsel dil: iki net okul

İki en yakın rakibin (Readle = seviyeli hikâyeyle dil öğrenme,
Beelinguapp = okuma + ses) sekiz karesi de indirilip incelendi.

### Okul A — "Manzara + mockup + büyük vaat" (Readle)

Readle'ın sekiz karesinin tamamı **manzara (landscape)** yönelimde:

- Sol yarı: turkuaz düz zemin, çok büyük beyaz başlık (2 satır), altında
  daha küçük destek cümlesi, bir kelime **altı çizili** ve vurgulu.
- Sağ yarı: gerçek ekran görüntüsü, cihaz çerçevesi içinde, kadrajın
  sağından taşıyor (yarısı görünüyor).
- Alt şerit: "Readle — formerly Langster" logosu + **6 ülke bayrağı**
  (İspanyolca, Fransızca, Almanca, İngilizce, Japonca, Çince).

Sekiz karenin mesaj sırası (Almanca galeriden birebir):

| #   | Başlık                                    | Destek satırı                       | Ne gösteriyor               |
| --- | ----------------------------------------- | ----------------------------------- | --------------------------- |
| 1   | Lerne Sprachen **mit einfachen Storys**   | Täglicher Fortschritt, A1-C1        | Hikâye keşif listesi        |
| 2   | Die Mega-Bibliothek: +2000 Storys & News  | Für A1 Anfänger bis C1 Profis       | Seviye filtreli kütüphane   |
| 3   | Lerne Wörter **3 mal schneller**          | Ein-Klick-Wörterbuch, Konjugationen | Okuma ekranı + kelime kartı |
| 4   | Spannende Mini-Bücher & fesselnde Dialoge | Kurze A1-C1 Fiktion & Klassiker     | Diyaloglu okuma ekranı      |
| 5   | Karteikarten mit Story-Kontext            | **85% bessere Merkfähigkeit**       | Flashcard ekranı            |
| 6   | Lesen, Hören & Quizzen                    | Verstehe jeden Tag mehr             | Quiz ekranı                 |
| 7   | Mache deine Audio-Playlisten              | Sichere deine Favoriten             | Kaydedilen içerik listesi   |
| 8   | Mini-Grammatik in jeder Story             | Erklärungen mit Story-Beispielen    | Gramer sekmesi              |

Öğrenilecek örüntü: **1. kare kategoriyi söylüyor ("hikâyelerle dil
öğren"), 2. kare ölçeği ("+2000"), 3. kare çekirdek etkileşimi
("tek tıkla sözlük").** Yani hook → ölçek → mekanik.

Dikkat: Readle 5. karede **"%85 daha iyi hatırlama"** diye sayısal bir
iddia atıyor ve hiçbir kaynak göstermiyor. **Bunu taklit etmeyeceğiz** —
doğrulanamayan bir etkinlik iddiası Guideline 2.3.1 riski, ve bu projede
o hata bir kez zaten yaşandı.

### Okul B — "Portre + illüstrasyon + kısa vaat" (Beelinguapp)

- Portre yönelim, turuncu petek dokulu zemin.
- Üstte 2 satır büyük başlık, altta **gerçek ekran görüntüsü değil,
  illüstrasyon** (1. kare: müzik/haber/hikâye rozetleri; 2. kare: Pamuk
  Prenses illüstrasyonu + yan yana İngilizce/İspanyolca metin).
- Ürünün kendisi neredeyse hiç görünmüyor.

**Bu okulu izlemeyeceğiz.** Gerekçe `06-ekran-goruntuleri.md`'de zaten
yazılı ve hâlâ geçerli: ekran görüntüsü uygulamaya benzemezse ilk açılışta
beklenti kırılır ve D1 tutundurma düşer. Beelinguapp'in TR puanı (4,50)
ve genel puanı (4,37) incelenen sette **en düşükler**; illüstrasyon ağırlıklı
galerinin kurulum sonrası hayal kırıklığıyla ilişkili olması muhtemel
(kanıtlanmadı, ama risk yönü belli).

### Kararımız: Okul A'nın yapısı, Okul A'nın iddia disiplini olmadan

- **Portre** yönelim (Readle'ın manzarasına rağmen) — çünkü portrede arama
  şeridinde 3 kare birden görünüyor, manzarada 1. Yeni ve markasız bir
  uygulama için üç kare üç şans demek.
- Gerçek ekran görüntüsü + metin overlay (illüstrasyon YOK).
- Kâğıt estetiği (`#FAF8F4`, Fraunces + Literata) — incelenen 7 rakibin
  7'si de parlak/doygun renk kullanıyor (turkuaz, turuncu, yeşil, mor).
  Arama sonucu şeridinde ayrışmanın en ucuz yolu bu.
- Sayısal etkinlik iddiası YOK. Sayı yalnızca doğrulanabilir envanter için
  kullanılacak (kitap sayısı, sözlük boyutu, dil sayısı).

---

## 4. Başlık ve altyazı kalıpları (10 pazar)

Ölçülen `trackName` değerlerinden çıkan kalıplar:

**Kalıp 1 — `Marka: <hedef dil> öğren` (en yaygın).**
`Busuu: Sprachen lernen` · `Beelinguapp: Englisch Lernen` ·
`EWA: Изучение языков` · `Memrise：外国語を話そう`

**Kalıp 2 — Çince ve Japonca'da anahtar kelime yığma açıkça yapılıyor.**

| Pazar | Örnek                                                    | Not                                                          |
| ----- | -------------------------------------------------------- | ------------------------------------------------------------ |
| jp    | `Duolingo-英語/韓国語などのリスニングや英単語の練習`     | 30 karakter sınırına kadar dolu; marka + 4 ayrı arama terimi |
| jp    | `Readle：フランス語、英語、ドイツ語、中国語、日本語学習` | 5 dil adı virgülle sıralanmış                                |
| jp    | `Busuu \| 言語学習 - 英語、中国語、外国語勉強`           |                                                              |
| cn    | `多邻国Duolingo英语日语法语`                             | Çince marka + Latin marka + 3 dil                            |
| cn    | `Readle 外语学习：法语、德语、西班牙语、英语、日语助手`  |                                                              |

**Bu, CJK pazarlarındaki en önemli taktiksel bulgu.** Çince ve Japonca'da
bir "karakter" bir kelimeye yakın bilgi taşıdığı için 30 karakterlik
başlığa Latin alfabesindekinin 2–3 katı terim sığıyor, ve pazar normu bu
alanı sonuna kadar doldurmak. Latin pazarları için yazdığımız "temiz,
okunabilir başlık" kuralı cn/ja'da **rekabet dezavantajı** olur.

**Kalıp 3 — Rusça ve Arapça'da marka Latin, açıklayıcı kısım yerel.**
`Busuu: учи английский и другие` · `Beelinguapp: учи английский`.
Arapça'da hiçbir rakip başlığını lokalize etmemiş (galeri bulgusuyla
tutarlı) — **sa pazarında Arapça başlık kullanan ilk uygulamalardan biri
olacağız.**

---

## 5. Açıklama ilk 3 satırı — ölçülen kalıp

App Store "daha fazla"ya dokunulmadan yaklaşık ilk 3 satırı gösteriyor.
Rakiplerin tamamı bu alana **tek cümlelik konumlandırma + sosyal kanıt**
koyuyor:

| Rakip    | İlk cümle (de)                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duolingo | "Lerne spielend leicht eine neue Sprache mit der **beliebtesten Bildungs-App der Welt**!"                                                          |
| Babbel   | "Sprich eine neue Sprache selbstbewusst – mit Babbel, der **preisgekrönten** Sprachlern-App, die von **200+ Sprachexpert:innen** entwickelt wurde" |

**Bizde sosyal kanıt YOK** (henüz yayınlanmadık, indirme/puan yok). O yüzden
ilk 3 satır **mekanik farkı** anlatmalı — "kelimeye dokun, karşılığı açılsın"
— çünkü elimizdeki tek doğrulanabilir ayrışma bu. Sahte sosyal kanıt
("milyonlarca kullanıcı") yazmak hem yalan hem 2.3.1 ihlali olur.

---

## 6. Ekran görüntüsü boyut ve format gereksinimleri

> **Doğrulama durumu.** Aşağıdaki çözünürlükler iki kaynaktan geliyor:
> (a) rakiplerin CDN'de görünen **gerçek kaynak dosya adları** — bunlar
> ölçülmüş veridir; (b) Apple'ın yayınladığı gereksinim tablosu — bu
> **App Store Connect'te yükleme anında yeniden doğrulanmalıdır**, çünkü
> Apple bu tabloyu yılda birkaç kez değiştiriyor ve benim bilgim kesin
> tarihli değil. Yükleme ekranı kabul etmediği boyutu reddeder, yani
> nihai doğrulayıcı orasıdır.

### 6a. iPhone

| Ekran sınıfı                                     | Portre (px)                      | Manzara (px) | Durum                                                                          |
| ------------------------------------------------ | -------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| **6,9"** (iPhone 16 Pro Max / 15 Pro Max sınıfı) | **1290 × 2796** veya 1320 × 2868 | 2796 × 1290  | **Zorunlu.** Apple bu boyutu diğer tüm iPhone boyutlarına otomatik ölçekliyor. |
| 6,5" (XS Max / 11 Pro Max sınıfı)                | 1242 × 2688 veya 1284 × 2778     | 2688 × 1242  | İsteğe bağlı. Duolingo hâlâ bunu yüklüyor (`iPhone6.5_...`).                   |
| 5,5" (8 Plus sınıfı)                             | 1242 × 2208                      | 2208 × 1242  | Eski. Busuu (`iOS-5.5-...`) ve Beelinguapp (`1242x2208`) hâlâ bunu kullanıyor. |

**Pratik karar:** yalnızca **6,9" (1290 × 2796)** üretilecek. Apple aşağı
ölçekliyor, ve 10 dil × 8 kare = 80 görsel zaten üretilecek; bunu üç boyuta
çıkarmak 240 görsel demek olurdu ve karşılığında hiçbir kazanç yok. Busuu
ve Beelinguapp'in 5.5" kullanması yıllardır güncellenmemiş bir pipeline'ın
kalıntısı, tercih değil.

### 6b. iPad

| Ekran sınıfı                 | Portre (px)                      | Manzara (px)              | Durum                                    |
| ---------------------------- | -------------------------------- | ------------------------- | ---------------------------------------- |
| **13"** (iPad Pro M4 sınıfı) | **2064 × 2752** veya 2048 × 2732 | 2752 × 2064 / 2732 × 2048 | iPad desteği beyan edilirse **zorunlu**. |
| 12,9" (eski iPad Pro)        | 2048 × 2732                      | 2732 × 2048               | 13" ile aynı dosya kabul ediliyor.       |

**Pratik karar:** Uygulama Expo/RN ve iPad'de çalışıyor olsa da, **ilk
sürümde iPad desteği beyan edilmemesi** öneriliyor — aksi hâlde 10 dil ×
8 kare iPad seti daha üretilmesi gerekir ve reader'ın iPad
sayfalama/ölçüm yolunun (ADR-007, `measureChapter.tsx`) geniş ekranda
gözle test edilmediği biliniyor. iPad'i sonraki sürümde, testten sonra
açmak daha az risk. Beyan edilirse 2064 × 2752 üretilir.

### 6c. Format ve adet kuralları

| Kural                             | Değer                                                     |
| --------------------------------- | --------------------------------------------------------- |
| Dosya formatı                     | PNG (alfa kanalı **olmadan**) veya JPEG                   |
| Renk uzayı                        | sRGB veya P3                                              |
| Lokalizasyon başına maksimum kare | **10**                                                    |
| Minimum (uygulama gönderimi için) | En az **1**; pratikte 3'ün altı dönüşümü düşürür          |
| Yönelim                           | Portre ve manzara karıştırılamaz — set içinde tek yönelim |
| Alfa kanalı                       | Yasak (şeffaflık içeren PNG reddedilir)                   |
| App Preview videosu               | İsteğe bağlı, lokalizasyon başına en fazla 3, 15–30 sn    |

**Bizim üreteceğimiz set:** 10 dil × 8 kare × 1 boyut (1290 × 2796,
portre, PNG, alfasız, sRGB) = **80 görsel.**

---

## 7. Somut çıkarımlar (uygulanacaklar)

1. **tr ve sa galerilerini mutlaka lokalize et** — 7 rakibin hiçbiri
   yapmıyor, en ucuz farklılaşma bu.
2. **8 kare, portre, 1290 × 2796** — kategori medyanı ve arama şeridinde
   3 kare görünürlüğü.
3. **cn ve ja başlıklarında terim yığ** — o pazarların normu bu; temiz
   başlık orada dezavantaj.
4. **Sayısal etkinlik iddiası yazma** (Readle'ın "%85"i gibi). Yalnızca
   doğrulanabilir envanter sayısı: 119 kitap, 26.000 kelime, 10 dil.
5. **Sosyal kanıt cümlesi kurma** — henüz kullanıcımız yok; ilk 3 satırı
   mekanik farkına ayır.
6. **Gerçek ekran görüntüsü kullan, illüstrasyon değil** — Beelinguapp
   okulundan kaçın.
7. **Seslendirmeyi galeri ve metinde sınırıyla birlikte anlat** — özellik
   yalnızca özgün hikâyelerde var, klasiklerde yok. Bkz. `screenshot-plani.md` 6. kare ve her metadata dosyasının "dürüstlük sınırı" bölümü.
