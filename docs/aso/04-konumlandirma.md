# Konumlandırma Boşluğu Analizi

**Araştırma tarihi:** 7 Eylül 2026
**Yöntem:** TR App Store'da 44 arama terimiyle bulunan **260 benzersiz uygulamanın Türkçe açıklama metninin tamamı** iTunes Search API'den çekilip anahtar ifade taraması yapıldı. Aşağıdaki sayılar bu 260 uygulamalık kümeye aittir; tahmin değildir.

---

## 1. Rakiplerin YAPMADIĞI — ölçülmüş boşluklar

### Boşluk A: "Public domain" hiç kimsenin sözlüğünde yok

| Aranan ifade | 260 uygulamanın kaçında geçiyor |
|---|---|
| `public domain` | **0** |
| `Gutenberg` | **0** |
| `telifsiz` | **0** |
| `kamu malı` | **0** |
| `Standard Ebooks` | **0** |

Klasik yazar adları da neredeyse yok: `Dickens` 2, `Austen` 2, `Sherlock` 1, `Shakespeare` **0**. Bu 2 uygulama (Magibook, duoBooks) sırasıyla 0 ve 14 yorumlu — pazarda görünür değiller.

**Yorum:** Kütüphanenin *hukuki niteliği* pazarda hiç konuşulmuyor. Bu hem fırsat hem uyarı: kimse konuşmuyorsa ya kimse akıl edememiştir ya da kullanıcı umursamıyordur. Cevap bölüm 3'te.

### Boşluk B: Cümle çevirisi (uzun basma) neredeyse hiç sunulmuyor

| Aranan ifade | Kaç uygulamada |
|---|---|
| `kelimeye dokun` | 14 |
| `uzun bas` | **0** |
| `cümle çevir` | **4** (iStoria, Lexi, İng-Tr Sözlük Çeviri, Litoo) |

**Kelime düzeyinde çeviri kategori standardı haline gelmiş (14 uygulama), cümle düzeyinde çeviri neredeyse boş.** Ürünün "cümleye uzun bas → cümle çevirisi" özelliği, kelime çevirisinden ayrışan gerçek bir teknik farktır ve rakiplerin %98'inde yok.

Bu aynı zamanda A2–B2 kullanıcısının gerçek acısıyla örtüşüyor: A2–B2 seviyesinde okuyucunun takıldığı yer genelde tek kelime değil, **cümle yapısıdır** (relative clause, phrasal verb, deyim). Kelime çevirisi bu acıyı çözmez.

### Boşluk C: Seviye (CEFR) etiketi az kullanılıyor

`seviye` kelimesi 112 uygulamada geçiyor ama somut CEFR kodları çok daha az: `A2` 16, `B1` 12, `B2` 13. Ve `seviyeli ingilizce kitap` araması **yalnızca 2 sonuç** döndürüyor (bkz. `02-anahtar-kelimeler.md`).

### Boşluk D: Türkçe altyazı boş bırakılmış

Topladığım 253 Türkçe altyazının **74'ünde (%29)** altyazı yerine kategori adı ("Eğitim") görünüyor — yani o uygulamaların Türkçe altyazısı tanımlı değil. Bunlar arasında **kategori lideri Readable, Reading Power, BOOKR, Cake, Duolingo, Babbel** var. 30 karakterlik bedava indeksleme alanı boş duruyor.

### Boşluk E: En yakın rakip okuma ekranında reklam gösteriyor

En yakın rakip **İngilizce Okuma (ERA, id1448864234, 4,58/1.369 yorum)** — altyazısı `Dokun, Çevir, İngilizce Öğren`, yani bizim çekirdek etkileşimimizin aynısı. Ama IAP listesinde **`Remove Ads` ₺399,99** ürünü var. Bu, ücretsiz katmanın reklamlı olduğunun kesin kanıtı.

Benzer şekilde `Kolay İngilizce Kelime Öğren` (36.929 yorum) `Reklamları Kaldır ₺999,99` satıyor.

**Bizim "okuma ekranında ASLA reklam yok" ilkemiz, en yakın rakibin en görünür zayıflığına doğrudan denk geliyor.**

---

## 2. Rakiplerin YAPTIĞI ama bizim yapmadığımız (dürüst risk listesi)

Boşluk aramak kadar önemli olan, kategorinin **beklenti haline gelmiş** özelliklerini bilmek:

| Özellik | 260 uygulamada geçiş sayısı | Bizde durum |
|---|---|---|
| Ses / sesli kitap eşliğinde okuma | dicto, Bookvo, EWA, Beelinguapp, İng.Okuma+SesliKitap dahil geniş kullanım | **Premium'da planlı (TTS), henüz yok** |
| Aralıklı tekrar (SRS) | `aralıklı` 30, `tekrar` 79 uygulama | **Premium'da planlı, henüz yok** |
| Çevrimdışı kullanım | `çevrimdışı` 31, `offline` 14 | **Premium'da planlı, henüz yok** |
| Yapay zeka | `yapay zeka/zekâ` toplam 36 uygulama | **Premium'da planlı, henüz yok** |
| Reklamsızlık vaadi | `reklamsız` 29 uygulama | **Var (üstelik ücretsiz katmanda)** |

**Risk:** Premium özelliklerin **hiçbiri henüz yazılmadı.** Lansmanda satılacak somut premium değer şu an yok. Bu dosyadaki konumlandırma önerileri, ücretsiz katmanın kendi başına güçlü olduğu varsayımına dayanıyor (47 kitap, 1.373 bölüm, 26.071 kelimelik sözlük — bunlar gerçek ve hazır).

---

## 3. "Tüm kitaplar ücretsiz ve public domain" duruşu: avantaj mı, değer düşürücü mü?

### Cevap: İkiye ayır. **"Ücretsiz" avantaj; "public domain" değer düşürücü.**

#### 3a. "Ücretsiz" — güçlü ama tek başına yetersiz

`ücretsiz` kelimesi 260 uygulamanın **108'inde (%42)** geçiyor. Yani "ücretsiz" demek pazarda hiç ayırt edici değil; herkes diyor. Duolingo, EWA, Readable — hepsi "ücretsiz" diyor ve hepsi paywall'lı.

**Ama** kimse **ne kadarının** ücretsiz olduğunu söylemiyor. `01-rakipler.md`'de belgelendiği gibi, incelenen 30+ uygulamanın **hiçbiri** App Store açıklamasında net bir ücretsiz katman sınırı ilan etmiyor. Kullanıcı sınırı ancak indirdikten sonra öğreniyor — ve bu, Türk kullanıcının en sık şikayet ettiği konudur.

→ **Avantaj "ücretsiz" demekte değil, SAYI vermekte.** "47 kitabın 47'si ücretsiz" tipi bir ifade, "ücretsiz" diyen 108 uygulamanın hiçbirinin yapmadığı bir şey.

#### 3b. "Public domain" — kullanıcıya söylenmemeli

Bu, ürünün en dürüst ama pazarlama açısından en tehlikeli tarafı. Nedenleri:

1. **Hedef kullanıcı teknik değil.** Ürün tanımında hedef kullanıcı "teknik olmayan Türk kullanıcı" olarak belirlenmiş. "Public domain" bu kişiye hiçbir şey ifade etmez. En iyi ihtimalle anlaşılmaz, en kötü ihtimalle "bedava bulunmuş, ıskarta içerik" olarak okunur.
2. **Pazarda hiç kullanılmıyor olması, kullanıcının bunu aramadığının göstergesi.** 260 uygulamanın 0'ında geçiyor. Kimse bunu bir satış argümanı olarak denememiş.
3. **Ücretli premium ile çelişki riski.** "İçeriğimiz bedava bulundu" mesajı, aynı ekranda "aylık ₺79,99" demeyi zorlaştırır. Kullanıcı "bedava kitaba neden para veriyorum?" diye sorar. Oysa premium'da satılan içerik değil, **araç** (AI açıklama, TTS, SRS, offline).
4. **Rakip "Oxford içeriği" (iStoria) veya lisanslı çocuk kitapları (BOOKR) diyor.** Bunlar algılanan değeri yükselten ifadeler. "Public domain" tersini yapar.

#### 3c. Doğru çeviri: aynı gerçeği değer yükselten kelimelerle söyle

| Söyleme | Bunun yerine söyle | Neden |
|---|---|---|
| ~~Public domain kitaplar~~ | **Dünya klasikleri** | Aynı kitaplar, prestijli çerçeve |
| ~~Telifsiz içerik~~ | **Zamana meydan okumuş 47 kitap** | Ücretsizliği değil kaliteyi öne alır |
| ~~Project Gutenberg'den~~ | **Sherlock Holmes'tan Jane Austen'a** | Somut, tanınan, arzu edilen |
| ~~Kitaplar ücretsiz çünkü telifi yok~~ | **47 kitabın 47'si ücretsiz — hepsi, her zaman** | Sebebi değil sonucu satar |

**Not:** Public domain kaynağı **gizlenmemeli** — App Store açıklamasının en altına, "Kaynak" bölümüne dürüstçe yazılmalı (hem etik hem Apple'ın içerik hakları incelemesi için faydalı). Sadece **başlık, altyazı ve açıklamanın ilk paragrafında** yer almamalı.

#### 3d. Gerçek değer düşürme riski nerede?

Public domain'in asıl riski algı değil, **içeriğin kendisi**: Gutenberg metinleri 19. yüzyıl İngilizcesidir. A2 seviyesindeki bir Türk kullanıcı için *Moby Dick* okunabilir değildir. Rakipler bunu biliyor ve çözmüşler:

- **Readable:** "Her hikaye seviyene göre basitleştirilmiştir" — sadeleştirme yapıyor
- **iStoria:** Oxford graded readers lisanslıyor
- **Magibook:** adı bile "Sadeleştirilmiş Kitap"

**Bu, konumlandırmadan çok ürün riskidir ama konumlandırmayı doğrudan bağlar:** eğer 47 kitap ham Gutenberg metniyse, "A2–B2 için" demek yanlış vaat olur ve kötü yorum getirir. `docs/ROADMAP.md`'de seviyeleme (`pipeline/` → "seviyele" adımı) planlanmış; **bu adım tamamlanmadan A2 vaadi verilmemeli.**

---

## 4. Türk kullanıcıya özel hangi mesaj işe yarar

Aşağıdaki her mesaj, bu araştırmada **ölçülmüş bir rakip boşluğuna** dayanıyor.

### Mesaj 1 — "Tek kelime değil, tüm cümle" ⭐ en güçlü
> *Kelimeye dokun Türkçesini gör. Anlamadığın cümleye uzun bas, tamamının çevirisi çıksın.*

**Dayanak:** `kelimeye dokun` 14 uygulamada var (standart olmuş), `cümle çevir` yalnızca 4'te, `uzun bas` **0**'da. A2–B2 seviyesinin gerçek acısı cümle yapısı.
**Nerede:** Altyazı adayı ve ilk ekran görüntüsü.

### Mesaj 2 — "Hepsi ücretsiz. Sayısı da belli." ⭐
> *47 kitabın 47'si ücretsiz. Bölüm kilidi yok, günlük hak yok.*

**Dayanak:** 108 uygulama "ücretsiz" diyor, **0'ı sınır ilan ediyor.** Sayı vermek doğrulanabilirlik hissi yaratır ve TR pazarındaki "indirdim, 3. bölümde paywall çıktı" travmasına doğrudan cevaptır.
**Nerede:** Açıklamanın ilk paragrafı.

### Mesaj 3 — "Okurken reklam yok" ⭐
> *Okuma ekranında reklam yok. Hiç olmayacak.*

**Dayanak:** En yakın rakip (İngilizce Okuma, 1.369 yorum) ₺399,99'a "Reklamları Kaldır" satıyor. Kategori lideri kelime uygulaması ₺999,99'a satıyor. `reklamsız` diyen 29 uygulamanın çoğu bunu premium özelliği olarak söylüyor; biz **ücretsiz katmanda** söylüyoruz.
**Nerede:** Açıklamada madde, ekran görüntüsü başlığı.

### Mesaj 4 — "Sherlock Holmes'u İngilizce oku"
> *Ders değil, kitap. Sherlock Holmes, Jane Austen, Oscar Wilde — İngilizce, ama takıldığın yerde yanında biri var.*

**Dayanak:** `klasik roman ingilizce` araması **3 sonuç, 0 ağır rakip.** `Shakespeare` 0, `Austen` 2, `Sherlock` 1 uygulamada geçiyor. Rakiplerin içeriği ya kısa öykü/haber (Readable), ya lisanslı graded reader (iStoria/BOOKR), ya dizi/video (Voscreen, Diziyle Öğren). **Tanınmış klasik roman kütüphanesi boş.**
**Nerede:** Ekran görüntülerinde kitap kapakları; açıklamada kitap adları.

### Mesaj 5 — "Türkçesi hazır, sözlüğe bakmana gerek yok"
> *26.071 kelimelik İngilizce–Türkçe sözlük uygulamanın içinde.*

**Dayanak:** `ingilizce sözlük` araması 22 sonuç, 11 ağır rakip — bu terim gerçekten aranıyor. Sesli Sözlük 74.107 yorumla pazarın en büyük referans uygulaması, yani Türk kullanıcı sözlük arıyor. Ama okuma uygulamalarının hiçbiri sözlük büyüklüğünü rakamla vermiyor.
**Nerede:** Açıklama, ikinci paragraf.

### Mesaj 6 — "Türkçe konuşuyoruz"
> *Arayüz tamamen Türkçe. Hikayeler İngilizce.*

**Dayanak:** 253 altyazının %29'unda Türkçe altyazı yok (Readable, Cake, BOOKR, Duolingo dahil). Küresel rakiplerin çoğu Türkçeleştirmeyi yarım bırakmış. Yerelleştirme kalitesi Türk kullanıcı için gerçek bir tercih sebebidir.
**Nerede:** Altyazının Türkçe olması bunu zaten söylüyor; açıklamada tekrar etmeye gerek yok.

### İşe YARAMAYACAK mesajlar (kaçın)

| Mesaj | Neden kaçınmalı |
|---|---|
| "Public domain / telifsiz / Project Gutenberg" | Bölüm 3b. Hedef kullanıcı için anlamsız veya değer düşürücü. |
| "İngilizce öğrenmenin en iyi yolu" | `ingilizce öğren` teriminde 12 ağır rakip var; Duolingo (481.105 yorum) ile aynı cümlede yarışılmaz. |
| "YDS / YÖKDİL / TOEFL hazırlık" | Reading Power (2.137) ve Kelime+ (1.595) bu alanı tutuyor. Ürün sınav ürünü değil; yanlış kullanıcı çeker, kötü yorum getirir. |
| "Yapay zeka destekli" (şimdilik) | AI özelliği henüz yazılmadı. 36 uygulama zaten bunu söylüyor — ayırt edici değil, üstelik şu an yalan olur. |
| "Çocuklar için" | Gutenberg klasikleri yetişkin içeriği. `ingilizce çocuk hikaye` ayrı bir pazar (Buddy 79.293 yorum, EWA Kids, BOOKR). |
| "Sesli kitap / dinle" (şimdilik) | TTS premium olarak planlı ama yazılmadı. dicto, Bookvo, EWA bu alanda güçlü. Vaat edip vermemek 1 yıldızlık yorum demek. |

---

## 5. Özetle: tek cümlelik konumlandırma

> **İngilizce Hikaye, dünya klasiklerini İngilizce okurken takıldığın her kelimeye ve her cümleye anında Türkçe karşılık veren bir okuma uygulamasıdır. 47 kitabın tamamı ücretsiz, okuma ekranında hiç reklam yok.**

Bu cümledeki her iddianın araştırma dayanağı:

| İddia | Dayanak |
|---|---|
| "dünya klasikleri" | `klasik roman ingilizce` = 3 sonuç, 0 ağır rakip |
| "her kelimeye ve her cümleye" | `cümle çevir` yalnızca 4/260 uygulamada, `uzun bas` 0/260 |
| "anında Türkçe" | 26.071 kelimelik sözlük hazır; `ingilizce çeviri okuma` teriminde yalnızca 2 ağır rakip |
| "47 kitabın tamamı ücretsiz" | 108 uygulama "ücretsiz" diyor, 0'ı sayı/sınır veriyor |
| "hiç reklam yok" | En yakın rakip reklam kaldırmayı ₺399,99'a satıyor |

---

## 6. Bu analizin sınırları

- **Ölçüm kaynağı yalnızca App Store metadatasıdır.** Uygulama açıklamaları, uygulamanın gerçekte ne yaptığının tam listesi değildir; bir özellik açıklamada geçmiyor diye yok olduğu kanıtlanmış olmaz. "Rakipler yapmıyor" ifadelerini "rakipler **pazarlamıyor**" olarak okuyun — ASO açısından etki aynıdır ama teknik iddia değildir.
- **Hiçbir rakip uygulama kurulup denenmedi.** Ücretsiz katman sınırları, paywall akışları, deneme süreleri ve gerçek çeviri kalitesi bu araştırmanın kapsamı dışında.
- **Türk kullanıcıyla görüşme/anket yapılmadı.** Bölüm 4'teki mesajların *hangi sırayla* işe yarayacağı ölçülmedi; bunlar App Store'da A/B test edilerek doğrulanmalıdır (Apple'ın Product Page Optimization aracı 3 varyanta kadar ücretsiz test imkânı verir).
- **İndirme ve gelir verisi yok.** Yorum sayısı ölçek için kullanılan tek proxy'dir ve mükemmel değildir.
