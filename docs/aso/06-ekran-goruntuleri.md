# Ekran Görüntüleri — Şablon Seçimi ve Metinler

Tarih: 2026-09-07. Kaynak: `screenshot-optimization` skill'i +
`01-rakipler.md` / `04-konumlandirma.md` bulguları.

Bu dosya App Store ekran görüntülerinin **ne göstereceğini ve ne
yazacağını** tanımlar. Görsel tasarımın kendisi seçilen şablonda yapılır.

---

## 1. Şablon seçimi: Alora

175 şablon içinden üçü bu ürüne yakındı. Seçim tek bir soruya bakıyor:
**ekran görüntüsü uygulamanın kendisine benziyor mu?**

Benzemiyorsa indirme sonrası ilk açılışta beklenti kırılır ve D1
tutundurma düşer. Mağaza dönüşümünü yükseltip kullanıcıyı ertesi gün
kaybetmek net kayıptır — bu yüzden kriter "en dikkat çekici şablon"
değil, "ürüne en sadık şablon".

| Şablon | Karar | Gerekçe |
|---|---|---|
| **Alora** | **Seçildi** | Zaten bir okuma uygulaması şablonu. Sıcak kâğıt zemini, serif tipografisi ve sakin ritmi uygulamanın kendi token'larıyla (`#FAF8F4` zemin, Fraunces + Literata) neredeyse birebir örtüşüyor. Ayrıca TR rakip setinin tamamı parlak ve oyunlaştırılmış görünüyor; kâğıt estetiği arama sonucu şeridinde ayırt ediliyor. |
| Kova | Yedek | Doğrudan dil öğrenme şablonu, kategori sinyali en güçlü olan bu. Ama mor palet ürünü Duolingo benzeri bir ders uygulaması gibi gösteriyor — oysa fark tam olarak *okuma* olması. Paleti değiştirilirse Alora'yı seçmemek için sebep kalmıyor. Yalnızca A/B testi için. |
| Vela | Elendi | Kitap özeti uygulaması için tasarlanmış ("Read a book in 5 minutes"). Vaadi bizimkinin tersi: bizde amaç kitabı kısaltmak değil, okunabilir hâle getirmek. |

### Alora'da değiştirilecek üç şey

1. **Vurgu rengi** → `#A6572E` (uygulamanın accent'i). Her başlıkta
   yalnızca **bir** kelime bu renkte olacak.
2. **Yazı tipi** → başlıklar Fraunces SemiBold, alt satırlar IBM Plex
   Mono. İkisi de uygulamada zaten yüklü.
3. **İlk kare çerçevesiz ve tam kanama** — okuma yüzeyi ne kadar büyük
   görünürse vaat o kadar net.

---

## 2. Sekiz kare

Kullanıcı ürün sayfasında 3–6 saniye geçiriyor ve kaydırmadan ilk üç
kareyi görüyor. Sıralama ona göre: 1–3 ürünün tamamını tek başına
anlatıyor.

### 1 — Kanca

| | |
|---|---|
| **TR** | Anlamadığın kelimeye **dokun**. |
| | `TÜRKÇE KARŞILIĞI ANINDA AÇILIR` |
| **EN** | Tap any word you don't know. |
| | `THE MEANING OPENS INSTANTLY` |
| **Ekran** | Reader, bir kelimeye dokunulmuş, WordSheet açık |
| **Yerleşim** | Çerçevesiz, tam kanama. Metin üstte. |

Ürünün tamamı bu tek karede anlatılıyor. Örnek cümle **gerçek bir
kitaptan** seçilecek.

### 2 — Seviye

| | |
|---|---|
| **TR** | Kendi **seviyenden** başla. |
| | `1 DAKİKALIK TEST SEVİYENİ BULUR` |
| **EN** | Start at your own level. |
| | `A ONE-MINUTE TEST FINDS IT` |
| **Ekran** | Seviye testi sonucu (B1 rozeti + "sana uygun N hikâye") |

"İngilizce kitap okuyamam, seviyem yetmez" bu kategorideki en yaygın
itiraz.

### 3 — Tekrar

| | |
|---|---|
| **TR** | Kaydettiğin kelime **geri gelir**. |
| | `UNUTMAYA BAŞLADIĞIN GÜN, TAM ZAMANINDA` |
| **EN** | Saved words come back to you. |
| | `RIGHT BEFORE YOU FORGET THEM` |
| **Ekran** | Tekrar ekranı, birkaç kelime kartı görünür |

Rakiplerin çoğu "çeviri" satıyor; "öğrenme" satan az.

### 4 — Cümle çevirisi

| | |
|---|---|
| **TR** | Cümlenin **tamamını** çevir. |
| | `CÜMLEYE UZUN BAS, YETER` |
| **EN** | Translate the whole sentence. |
| | `JUST PRESS AND HOLD` |
| **Ekran** | Reader + SentenceSheet, iki dil alt alta |

### 5 — Katalog

| | |
|---|---|
| **TR** | Bütün kitaplar **ücretsiz**. |
| | `A1'DEN C2'YE 100+ HİKÂYE VE KLASİK` |
| **EN** | Every book is free. |
| | `100+ STORIES AND CLASSICS, A1 TO C2` |
| **Ekran** | Kütüphane, seviye rozetleriyle kapak ızgarası |

> **Sayıyı yayınladıktan sonra yaz.** Şu an 85 kitap yayında; B1
> hikâyeleri yayına alınınca ~109 olacak. O güne kadar "85 hikâye ve
> klasik" yaz — doğrulanamayan bir sayı Guideline 2.3.1 kapsamında
> yanıltıcı metadata sayılır.

### 6 — Süre

| | |
|---|---|
| **TR** | Bir hikâye, **6 dakika**. |
| | `YENİ BAŞLAYANLAR İÇİN YAZILDI` |
| **EN** | One story, six minutes. |
| | `WRITTEN FOR BEGINNERS` |
| **Ekran** | Kitap detayı, A2 rozeti + "6 dk" süre etiketi |

Kategorinin ikinci büyük itirazı "vaktim yok". 6 dakika A1/A2
hikâyelerinin gerçek ortalaması.

### 7 — Okuma konforu

| | |
|---|---|
| **TR** | İnternetsiz de **oku**. |
| | `KOYU TEMA, PUNTO VE YAZI TİPİ AYARI` |
| **EN** | Read offline, in any light. |
| | `DARK MODE, TYPE AND SIZE CONTROLS` |
| **Ekran** | Koyu temada reader — bu kare bilerek koyu, şeritte ritmi kırıyor |

### 8 — Alışkanlık

| | |
|---|---|
| **TR** | Her gün biraz. **Seri bozulmasın.** |
| | `OKUMA SÜRESİ, SERİ VE İLERLEME` |
| **EN** | A little every day. |
| | `READING TIME, STREAK AND PROGRESS` |
| **Ekran** | Profil — seri kartı ve haftalık dakika grafiği |

Fiyat ya da "ücretsiz dene" **yazmıyor**: fiyat değişince bu kareyi
yeniden üretmek gerekirdi ve App Store fiyatı zaten sayfanın kendisinde
gösteriyor.

---

## 3. Teknik gereklilikler

| Alan | Değer | Not |
|---|---|---|
| Zorunlu boyut | 1290 × 2796 px | iPhone 6.9". Apple diğer iPhone boyutlarına kendi ölçekliyor |
| iPad | 2064 × 2752 px | Yalnızca `supportsTablet` açılırsa. Şu an **kapalı** |
| Adet | 8 (en az 3) | 10'a kadar izin var |
| Format | PNG, RGB, saydamlık yok | Alfa kanalı olan dosya reddediliyor |
| Diller | tr-TR ve en-US | Her dil için ayrı 8'lik set |
| Yazı boyutu | Başlık ≥ 90 px | Arama sonucundaki küçük önizlemede okunması gereken tek şey başlık |

**Ekranlarda görünen metin gerçek uygulama içeriği olmalı** — boş durum,
"lorem ipsum" ya da uydurma kitap adı kullanılmaz. App Review ekran
görüntülerini derlemedeki uygulamayla karşılaştırıyor.

---

## 4. Yapılmayanlar

- **App Preview videosu.** Bu round'da yok. Değeri içerikte, etkileşimde
  değil — kelime dokunma anını 8 kare zaten anlatıyor. Puan ve indirme
  birikince, gerçek dönüşüm verisiyle değerlendirilmeli.
- **Custom Product Page.** Apple Search Ads hesabı açılana kadar
  anlamsız; farklı kitlelere farklı kare setleri göstermenin ön koşulu
  reklam kampanyası.
- **A/B testi (Product Page Optimization).** Anlamlı sonuç için trafik
  gerekiyor. Lansmandan sonra, ilk 1.000 ürün sayfası görüntülemesinden
  önce başlatmanın istatistiksel değeri yok.
