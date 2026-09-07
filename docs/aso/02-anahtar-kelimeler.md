# Anahtar Kelime Araştırması — App Store Türkiye

**Araştırma tarihi:** 7 Eylül 2026
**Sorgu:** `https://itunes.apple.com/search?term=<terim>&country=tr&lang=tr_tr&entity=software&limit=25`

---

## 0. Metodoloji ve dürüstlük notu — arama hacmi hakkında

**Gerçek arama hacmi verisine ulaşamadım ve uyduramam.** Apple, arama hacmini yalnızca Apple Search Ads hesabı içindeki "popülerlik skoru" (5–100 arası) olarak verir; bu, açık API'den erişilebilir değildir. Üçüncü taraf araçların (Sensor Tower, AppTweak, Appfigures) verdiği hacimler de Apple'ın gerçek verisi değil, kendi modellemeleridir ve ücretlidir.

Bunun yerine **iTunes Search API'den gerçekten ölçtüğüm iki metrik** kullanıyorum:

| Metrik | Nasıl ölçüldü | Neyi gösterir |
|---|---|---|
| **Sonuç sayısı** | O terim için Apple'ın döndürdüğü uygulama adedi (max 25) | Terimin "dolu" olup olmadığı. Az sonuç = az rakip. |
| **Ağır rakip sayısı** | Sonuçlar içinde ≥1.000 yorumu olan uygulama adedi | Gerçek rekabet baskısı. Yeni bir uygulamanın geçmesi gereken duvar. |

**Arama hacmi sütunu bu iki ölçümden ve terimin dilsel doğallığından türetilmiş bir TAHMİNDİR** ve aşağıda her satırda açıkça `tahmin` olarak işaretlidir. Gerçek hacim için Apple Search Ads hesabı açıp Search Match popülerlik skorlarına bakılmalıdır — bu, lansmandan önce yapılması gereken **1 numaralı iş**tir (bkz. bölüm 6).

**Alaka düzeyi** sütunu ise tahmin değil, bir karardır: ürünün gerçekten yaptığı işle terimin örtüşme derecesi (0–1 arası, benim değerlendirmem).

---

## 1. Türkçe terimler — ana hedef (28 terim)

### 1a. Çekirdek terimler (yüksek alaka, ölçülmüş rekabet)

| # | Terim | Sonuç | ≥1000 yorumlu rakip | Hacim (tahmin) | Rekabet (ölçüm) | Alaka | İlk 3'te kim var |
|---|---|---|---|---|---|---|---|
| 1 | `ingilizce hikaye` | 24 | **16** | Orta-yüksek | Çok yüksek | **1,00** | Readable (1.774) · Reading Power (2.137) · İng. Okuma ve Sesli Kitap (506) |
| 2 | `ingilizce hikayeler` | 14 | 8 | Orta | Yüksek | **1,00** | Türkçe İngilizce Hikayeler (**2**) · Readable (1.774) · EWA (81.739) |
| 3 | `ingilizce okuma` | 24 | 11 | Orta-yüksek | Yüksek | **1,00** | İngilizce Okuma (1.369) · Reading Power (2.137) · EWA (81.739) |
| 4 | `ingilizce kitap` | 24 | 15 | Orta-yüksek | Çok yüksek | 0,95 | Readable · Reading Power · EWA |
| 5 | `ingilizce hikaye kitabı` | **15** | **4** | Orta-düşük | **Düşük** | **1,00** | Readable · Türkçe İng. Hikayeler (2) · dicto (140) |
| 6 | `ingilizce kelime` | 22 | 13 | Yüksek | Çok yüksek | 0,80 | Kolay İng. Kelime (36.929) · İng. Kelime Kartları · İngilizce - Kelimeler |
| 7 | `ingilizce çeviri okuma` | 15 | **2** | Düşük | **Çok düşük** | **1,00** | İngilizce Okuma · dicto · Reading English (51) |
| 8 | `ingilizce metin okuma` | **11** | **2** | Düşük | **Çok düşük** | 0,90 | Google Çeviri · ReadMaster (110) · dicto (140) |
| 9 | `ingilizce sesli kitap` | 15 | 10 | Orta | Yüksek | 0,55 (TTS premium olunca 0,85) | EWA · İng. Okuma ve Sesli Kitap · Apple Books |
| 10 | `okuyarak ingilizce` | **13** | **0** | Düşük | **Sıfıra yakın** | **1,00** | Clew (110) · SUFX (0) · duoBooks (14) |
| 11 | `okuyarak dil öğren` | 14 | **0** | Düşük | **Sıfıra yakın** | 0,90 | Passage (3) · duoBooks (14) · Kalima (0) |
| 12 | `hikaye ile ingilizce` | **11** | **0** | Düşük | **Sıfıra yakın** | **1,00** | ENGO (81) · Memo (3) · kitApp (0) |
| 13 | `seviyeli ingilizce kitap` | **2** | 1 | Çok düşük | **Neredeyse boş** | **1,00** | İngilizce Okuma (1.369) · Booklex (1) |
| 14 | `klasik roman ingilizce` | **3** | **0** | Çok düşük | **Boş** | **1,00** | Litoku (0) · PageWalker (5) · VibeLang (0) |
| 15 | `dokunarak çeviri` | **0** | 0 | Çok düşük | **Tamamen boş** | 0,95 | *hiç sonuç yok* |

### 1b. Geniş/kategori terimleri (yüksek hacim, savaşılamaz rekabet)

| # | Terim | Sonuç | ≥1000 yorumlu | Hacim (tahmin) | Rekabet | Alaka | İlk 3 |
|---|---|---|---|---|---|---|---|
| 16 | `ingilizce öğren` | 15 | 12 | **Çok yüksek** | **Aşırı** | 0,70 | Simpler (14.442) · Duolingo (481.105) · Kolay İng. Kelime |
| 17 | `ingilizce ogren` (şapkasız) | 24 | **21** | Çok yüksek | **Aşırı** | 0,70 | Learna (29.895) · LetMeSpeak (14.004) · Duolingo |
| 18 | `dil öğrenme` | 23 | 16 | Çok yüksek | **Aşırı** | 0,60 | Duolingo · Busuu (87.248) · Airlearn |
| 19 | `ingilizce pratik` | 25 | **20** | Yüksek | **Aşırı** | 0,45 | Praktika (51.776) · Duolingo · MomoLingo |
| 20 | `ingilizce seviye` | 25 | **21** | Yüksek | **Aşırı** | 0,70 | Duolingo · 2Shine (1.186) · İng. kelime seviyeni ölç (0) |
| 21 | `ücretsiz ingilizce` | 15 | 12 | Orta-yüksek | Çok yüksek | **0,95** | Kolay ve Ücretsiz (731) · Duolingo · Kolay İng. Kelime |
| 22 | `yabancı dil` | 24 | **1** | Orta | **Çok düşük** | 0,60 | Dil Öğren ve Konuş (683) · LENGO (78) · Smart Book (7) |

### 1c. Yan/destek terimler

| # | Terim | Sonuç | ≥1000 yorumlu | Hacim (tahmin) | Rekabet | Alaka | Not |
|---|---|---|---|---|---|---|---|
| 23 | `kelime ezberleme` | 25 | 13 | Yüksek | Çok yüksek | 0,65 | SRS özelliği için (premium) |
| 24 | `ingilizce kelime ezberleme` | 13 | 8 | Orta | Yüksek | 0,65 | Kolay İng. Kelime domine ediyor |
| 25 | `kelime defteri` | 14 | 6 | Orta-düşük | Orta | **0,90** | Tureng 1. sırada; SRS/kelime kaydı özelliğimizle birebir |
| 26 | `ingilizce kelime kartları` | 14 | 10 | Orta | Yüksek | 0,70 | Flashcard rakipleri |
| 27 | `ingilizce sözlük` | 22 | 11 | **Yüksek** | Yüksek | **0,85** | 26.071 kelimelik sözlüğümüzle doğrudan alakalı. Sesli Sözlük (74.107), Tureng güçlü. |
| 28 | `ingilizce roman` | 24 | **20** | Orta | Aşırı (alakasız doluluk) | **0,95** | Sonuçlar konuşma/dizi uygulamalarıyla dolu — **alaka uyumsuzluğu**. Gerçekten roman sunan tek uygulama biziz. |

---

## 2. İngilizce terimler — ikincil hedef (12 terim)

Arayüz Türkçe olduğu için bunlar ikincil; ama Türkiye'de yaşayan yabancılar ve İngilizce arayan Türk kullanıcılar için değer var.

| # | Terim | Sonuç | ≥1000 yorumlu | Hacim (tahmin) | Rekabet | Alaka | İlk 3 |
|---|---|---|---|---|---|---|---|
| 29 | `english story` | 25 | 8 | Orta | Yüksek | 0,95 | İngilizce Okuma · Readable · Learn American English Podcast |
| 30 | `english reading` | 15 | 8 | Orta | Yüksek | 0,95 | İngilizce Okuma · Readable · İng. Okuma ve Sesli Kitap |
| 31 | `learn english stories` | 15 | **4** | Orta-düşük | Orta | 0,95 | BOOKR (1.418) · Learn English Audio Story (83) · Learn English By Stories (8) |
| 32 | `learn english reading` | 25 | 10 | Orta | Yüksek | 0,90 | Learn English Reading (**1**) · EWA · Duolingo ABC |
| 33 | `graded readers` | 13 | **1** | Düşük | **Çok düşük** | **1,00** | ForeignLanguage Graded Readers (0) · İngilizce Okuma · Englisten (37) |
| 34 | `vocabulary builder` | 14 | 6 | Orta | Orta | 0,70 | Magoosh (239) · Atlas (8.541) · IELTS Flashcards |
| 35 | `public domain books` | *ölçülmedi* | — | Düşük (tahmin) | Düşük (tahmin) | **1,00** | Test edilmedi — lansman öncesi ölçülmeli |
| 36 | `classic books english` | *ölçülmedi* | — | Düşük (tahmin) | Düşük (tahmin) | **1,00** | Test edilmedi |
| 37 | `tap to translate` | *ölçülmedi* | — | Düşük (tahmin) | Düşük (tahmin) | 0,95 | Test edilmedi |
| 38 | `reader` | *ölçülmedi* | — | Yüksek (tahmin) | Aşırı (tahmin) | 0,50 | Genel e-okuyucularla çarpışır |
| 39 | `esl reading` | *ölçülmedi* | — | Düşük (tahmin) | Düşük (tahmin) | 0,90 | Test edilmedi |
| 40 | `bilingual reading` | *ölçülmedi* | — | Düşük (tahmin) | Düşük (tahmin) | 0,75 | Bizde yan yana metin YOK, dokunmalı çeviri var — kısmi alaka |

### 2b. Sınav terimleri — bilinçli olarak HEDEFLENMİYOR

| Terim | Sonuç | ≥1000 yorumlu | Karar |
|---|---|---|---|
| `yds kelime` | 14 | 7 | **Hedeflenmiyor.** Ürün A2–B2 genel okuyucuya yönelik; YDS sözü verip vermemek konumlandırmayı bulandırır. Reading Power ve Kelime+ bu alanı tutuyor. |
| `ingilizce gramer` | 25 | 11 | **Hedeflenmiyor.** Gramer dersi vermiyoruz. |
| `ingilizce dinleme` | 25 | 15 | **Şimdilik hayır.** TTS premium olarak gelene kadar yanlış vaat olur. |
| `ingilizce çocuk hikaye` | 22 | 2 | **Hedeflenmiyor.** Gutenberg klasikleri A2–B2 yetişkin içeriği; çocuk vaadi yanlış kullanıcı çeker, kötü yorum getirir. |

---

## 3. Türkçe karakterlerin arama davranışına etkisi — ÖLÇÜLDÜ

Bunu tahmin etmedim, **iTunes API üzerinde A/B karşılaştırması yaparak ölçtüm.** Aynı terimin iki yazımı için ilk 10 sonucun örtüşmesi:

| Karşılaştırma | İlk 10 örtüşme | İlk 5 sırası aynı mı? | Sonuç |
|---|---|---|---|
| `ingilizce hikaye` ↔ `İngilizce hikaye` | **9/10** | **Evet** | **Büyük/küçük harf ÖNEMSİZ.** Apple `i`/`İ` farkını normalize ediyor. |
| `ingilizce okuma` ↔ `İNGİLİZCE OKUMA` | **9/10** | **Evet** | Tamamı büyük harf de aynı sonucu veriyor. Doğrulandı. |
| `ingilizce ogren` ↔ `ingilizce öğren` | **5/10** | **Hayır** | **Şapkalı/şapkasız harf ÖNEMLİ.** `ö`/`o` ve `ğ`/`g` farklı sonuç kümesi üretiyor. |
| `ingilizce hikaye` ↔ `ingilizce hikâye` | **5/10** | **Hayır** | **Düzeltme işareti (â) ÖNEMLİ.** Ayrı bir arama uzayı. |
| `kelime ezberleme` ↔ `kelıme ezberleme` | **2/10** | **Hayır** | **`ı`/`i` farkı ÇOK ÖNEMLİ** — sonuçların %80'i değişiyor. |

### Bundan çıkan somut kurallar

1. **Başlık ve altyazıda Türkçe karakterleri DOĞRU yaz.** ("İngilizce", "Öğren", "Çeviri".) Kullanıcı büyük harfle yazsa da bulur, çünkü büyük/küçük normalize ediliyor.
2. **Anahtar kelime alanına şapkasız/yanlış varyantları AYRICA ekle.** `ögren`, `ceviri`, `sözlük` yerine bazı kullanıcıların yazdığı `sozluk`, `hikâye` gibi formlar farklı sonuç kümelerine düşüyor. Bu, 100 karakterin en verimli kullanımlarından biri.
3. **`ı`/`i` karışıklığına özel dikkat.** Türk kullanıcıların bir kısmı iOS klavyesinde İngilizce düzen kullanır ve `ingilzce`, `ogren`, `kelime` gibi formlar yazar. `ingilzce` (yaygın yazım hatası) test edilmeye değer.
4. **Uygulamanın kendi adında `hikâye` değil `hikaye` kullan.** Ölçüm, `hikaye` yazımının 1.774 yorumlu Readable dahil güçlü sonuçlar döndürdüğünü, `hikâye` yazımının ise daha zayıf ve karışık bir küme döndürdüğünü gösteriyor. Yaygın yazım `hikaye`. `hikâye` varyantını anahtar kelime alanına koy.

---

## 4. Önerilen metadata — karakterler tek tek sayıldı

Karakter sayımları Python `len()` ile yapıldı; `İ` (U+0130) ve `Ö` gibi harfler 1 karakter sayılır (Apple da böyle sayar).

### 4a. Başlık — sınır 30 karakter

| Aday | Karakter | Kapsanan terimler | Değerlendirme |
|---|---|---|---|
| **`İngilizce Hikaye: Oku, Öğren`** | **28** ✓ | ingilizce, hikaye, oku(ma), öğren + "ingilizce hikaye" tam eşleşme | **ÖNERİLEN.** En yüksek alakalı terimi (`ingilizce hikaye`, alaka 1,00) tam olarak kapsıyor, üstüne `oku` ve `öğren` kökleri ekliyor. |
| `İngilizce Hikaye Oku & Öğren` | 28 ✓ | Aynı | İkinci seçenek. `&` karakteri Apple'da ayraç sayılır, sorun yok. Ama "Oku, Öğren" daha okunaklı. |
| `İngilizce Hikaye: Kitap Oku` | 27 ✓ | + kitap | `kitap` terimini kazanır, `öğren` kaybeder. `ingilizce kitap` çok yüksek rekabetli (15 ağır rakip) → değmez. |
| `İngilizce Hikaye Kitapları` | 26 ✓ | + kitap | 4 karakter boşa gidiyor. Hayır. |
| `İngilizce Hikaye: Oku Anla` | 26 ✓ | + anla | `anla` aranan bir terim değil. Hayır. |

**Karar: `İngilizce Hikaye: Oku, Öğren` — 28 karakter.**

Neden 30 değil de 28: doğal okunabilirlik, karakter doldurmaktan daha değerli. Boşta kalan 2 karakter için anlamlı bir kelime yok.

**Uyarı:** Bu başlık, kategori lideri `Readable: İngilizce Hikayeler` ile doğrudan çarpışıyor. Bu bilinçli — o uygulama 14 aydır güncellenmemiş ve Türkçe altyazısı yok.

### 4b. Altyazı — sınır 30 karakter

| Aday | Karakter | Kapsanan yeni terimler | Değerlendirme |
|---|---|---|---|
| **`Klasik Kitaplar, Anında Çeviri`** | **30** ✓ (tam) | klasik, kitap, çeviri | **ÖNERİLEN.** Başlıkta olmayan 3 terimi ekliyor. `klasik roman ingilizce` (3 sonuç, 0 ağır rakip) ve `ingilizce çeviri okuma` (2 ağır rakip) boşluklarını hedefliyor. Aynı zamanda public domain kütüphaneyi ima ediyor. |
| `Dokun, Çevir, Kelime Öğren` | 26 ✓ | dokun, çevir, kelime | Güçlü ama **en yakın rakibin altyazısıyla neredeyse aynı** (`Dokun, Çevir, İngilizce Öğren`). Taklit görünür. |
| `Anlık Çeviriyle Kitap Oku` | 25 ✓ | çeviri, kitap | 5 karakter boşa gidiyor, `klasik` kaybediliyor. |
| `Oku, Dokun, Türkçesini Gör` | 26 ✓ | türkçe, dokun | "Türkçesini Gör" mesaj olarak çok iyi ama arama terimi değeri düşük. |
| ~~`Tüm Kitaplar Ücretsiz, Reklamsız`~~ | **32** ✗ | — | **SINIRI AŞIYOR.** |
| ~~`47 Kitap Ücretsiz · Anlık Çeviri`~~ | **32** ✗ | — | **SINIRI AŞIYOR.** |
| ~~`Ücretsiz Klasikler, Anlık Çeviri`~~ | **32** ✗ | — | **SINIRI AŞIYOR.** |

**Karar: `Klasik Kitaplar, Anında Çeviri` — 30 karakter (tam dolu).**

### 4c. Anahtar kelime alanı — sınır 100 karakter

**Kural:** Başlık ve altyazıda geçen kelimeler burada TEKRARLANMAZ (Apple hepsini birleştirip indeksler, tekrar karakter israfıdır). Yani `ingilizce`, `hikaye`, `oku`, `öğren`, `klasik`, `kitap`, `çeviri`, `anında` buraya **yazılmayacak.** Ayrıca uygulama adı, kategori adı ve "app/uygulama" kelimeleri gereksizdir.

| Aday | Karakter | Terim sayısı |
|---|---|---|
| **`kelime,ögren,roman,okuma,ceviri,sözlük,seviye,klasik,defter,cümle,hikâye,ezber,a2,b1,b2,metin`** | **93** ✓ | 16 |
| `kelime,ögren,roman,okuma,ceviri,sözlük,seviye,a2,b1,b2,klasik,defter,cümle,hikâye,ezber` | 87 ✓ | 15 |
| `kelime,ögren,roman,okuma,ceviri,sözlük,seviye,klasik,defter,hikâye,ezber,metin,a2,b1,b2,tekrar` | 94 ✓ | 16 |

**Karar (93 karakter):**

```
kelime,ögren,roman,okuma,ceviri,sözlük,seviye,klasik,defter,cümle,hikâye,ezber,a2,b1,b2,metin
```

Her terimin gerekçesi:

| Terim | Gerekçe |
|---|---|
| `kelime` | `ingilizce kelime` (22 sonuç) + `kelime defteri` (alaka 0,90) |
| `ögren` / `okuma` / `ceviri` | **Şapkasız varyantlar** — bölüm 3'te ölçüldüğü gibi ayrı arama uzayı. Şapkalı halleri başlık/altyazıda zaten var. |
| `roman` | `ingilizce roman` — 24 sonuç ama hiçbiri gerçekten roman sunmuyor (alaka uyumsuzluğu = fırsat) |
| `sözlük` | `ingilizce sözlük`, 26.071 kelimelik sözlüğümüz gerçek bir vaat |
| `seviye` | `seviyeli ingilizce kitap` (yalnızca **2** sonuç), `ingilizce seviye` |
| `klasik` | Altyazıda var ama tekil/çekim varyantı için tekrar; **alternatif olarak çıkarılıp 7 karakter kazanılabilir** |
| `defter` | `kelime defteri` — SRS/kelime kaydı özelliğine karşılık gelir |
| `cümle` | Cümle çevirisi çekirdek özelliğimiz; hiçbir rakip bunu vurgulamıyor |
| `hikâye` | **Düzeltme işaretli varyant** — 5/10 farklı sonuç kümesi (ölçüldü) |
| `ezber` | `kelime ezberleme` (25 sonuç, yüksek hacim) |
| `a2`,`b1`,`b2` | CEFR seviyesi arayan kullanıcı; toplam 9 karakter, ucuz kapsama |
| `metin` | `ingilizce metin okuma` — yalnızca 2 ağır rakip |

**Uyarı — `klasik` tekrarı:** Altyazıda "Klasik" zaten var. Kesinlikle güvenli oynamak istersen `klasik,` çıkarılıp (7 karakter kazanç, 86'ya düşer) yerine `ücretsiz` (8 karakter) veya `story,reader` (12 karakter) konabilir. İlk sürümde mevcut haliyle bırakıp, ikinci sürümde A/B testi öneririm.

### 4d. Uygulama adı ile başlık ilişkisi

Ürün adı **"İngilizce Hikaye"** ile App Store başlığı **"İngilizce Hikaye: Oku, Öğren"** uyumlu. Marka adının doğrudan arama terimi olması nadir bir avantaj — `ingilizce hikaye` araması hem markayı hem kategoriyi getiriyor. Bu avantajı korumak için başlığın ilk 16 karakteri asla değiştirilmemeli.

---

## 5. Öncelik sıralaması

**Kademe 1 — sıralamada 1. olmayı hedefle (rekabet ölçülen en düşük, alaka 1,00):**
`okuyarak ingilizce` · `hikaye ile ingilizce` · `seviyeli ingilizce kitap` · `klasik roman ingilizce` · `ingilizce çeviri okuma` · `graded readers` · `okuyarak dil öğren`
→ Bu 7 terimde 0–2 ağır rakip var. Doğru metadata ile ilk hafta zirveye çıkılabilir.

**Kademe 2 — 6 ay içinde ilk 5'i hedefle:**
`ingilizce hikaye kitabı` (4 ağır rakip) · `ingilizce metin okuma` (2) · `kelime defteri` (6) · `learn english stories` (4) · `ingilizce hikayeler` (8)

**Kademe 3 — uzun vadeli, yorum sayısı biriktikçe:**
`ingilizce hikaye` (16 ağır rakip) · `ingilizce okuma` (11) · `ingilizce kitap` (15) · `ingilizce sözlük` (11)

**Kademe 4 — hedefleme, sadece Search Ads ile satın al:**
`ingilizce öğren` (12) · `ingilizce ogren` (21) · `dil öğrenme` (16) · `ingilizce seviye` (21)
→ Organik olarak Duolingo/Busuu/Simpler'ı geçmek gerçekçi değil.

---

## 6. Lansman öncesi yapılması gerekenler (veri boşluklarını kapatmak için)

1. **Apple Search Ads hesabı aç** (₺0 harcamayla da açılır) → Search Match popülerlik skorlarına eriş. Bu, bu dosyadaki tüm "tahmin" etiketli hacim sütununu gerçek veriyle değiştirir. **En yüksek öncelikli iş.**
2. **Bölüm 2'de "ölçülmedi" işaretli 6 İngilizce terimi ölç** (`public domain books`, `classic books english`, `tap to translate`, `reader`, `esl reading`, `bilingual reading`).
3. **`ingilzce` yazım hatası varyantını test et** — Türk kullanıcılarda yaygın; ölçülmedi.
4. **Lansmandan 4 hafta sonra sıralama ölçümü tekrarla** — bu dosyadaki tüm sorgular tekrar çalıştırılıp kendi konumumuz kaydedilmeli.
