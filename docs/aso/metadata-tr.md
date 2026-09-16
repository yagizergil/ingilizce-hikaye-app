# App Store Metadata — Türkçe (tr)

**Tarih:** 15 Eylül 2026 · **Pazar:** App Store Türkiye
**Kaynak:** `rakip-arastirmasi.md`, `02-anahtar-kelimeler.md`
**Dürüstlük kuralı:** Aşağıdaki hiçbir metin üründe çalışmayan bir özelliği
iddia etmiyor. Sayılar migration 024 / 029 / 038 ve canlı katalogdan alındı.

---

## 1. Anahtar kelime araştırması — TR pazarına özgü

Türkçe'de arama davranışı iki şeyle ayrışıyor: (a) kullanıcıların büyük
kısmı **şapkasız ve büyük harfsiz** yazıyor (`ingilizce` ≠ `İngilizce`
arama eşleşmesinde ayrı davranıyor), (b) "İngilizce" kelimesi neredeyse
her sorguda var — tek başına "hikaye" aramak yok denecek kadar az.

| Terim                      | Rekabet (ölçüm)             | Alaka | Karar                              |
| -------------------------- | --------------------------- | ----- | ---------------------------------- |
| `ingilizce hikaye`         | Çok yüksek (16 ağır rakip)  | 1,00  | **Başlıkta**                       |
| `ingilizce okuma`          | Yüksek (11)                 | 1,00  | Başlık + alan                      |
| `seviyeli ingilizce kitap` | Neredeyse boş (2 sonuç)     | 1,00  | **Altyazıda** — en iyi fırsat      |
| `okuyarak ingilizce`       | Sıfıra yakın (0 ağır rakip) | 1,00  | Alan                               |
| `ingilizce çeviri okuma`   | Çok düşük (2)               | 1,00  | **Altyazıda**                      |
| `hikaye ile ingilizce`     | Sıfıra yakın (0)            | 1,00  | Alan                               |
| `klasik roman ingilizce`   | Boş (0)                     | 1,00  | Alan                               |
| `kelime defteri`           | Orta                        | 0,90  | Alan                               |
| `ingilizce sözlük`         | Yüksek                      | 0,85  | Alan                               |
| `ingilizce öğren`          | Aşırı (12 ağır rakip)       | 0,70  | **Hedeflenmiyor** — savaşılamaz    |
| `ingilizce sesli kitap`    | Yüksek                      | 0,85  | Alan (ses artık premium ve gerçek) |

**Stratejik karar:** Geniş terimlerde (`ingilizce öğren`, `dil öğrenme`)
Duolingo/Busuu ile yarışmak anlamsız. Bütün ağırlık **"okuyarak öğrenme"**
uzun kuyruğuna veriliyor — orada 0 ağır rakip var ve alaka 1,00.

---

## 2. Başlık — 30 karakter

```
İngilizce Hikaye: Oku, Öğren
```

**28/30 karakter.**

- `ingilizce hikaye` ana terim, en başta (Apple başlığa en yüksek ağırlığı
  veriyor).
- `oku` ve `öğren` iki ek terimi daha kapsıyor.

## 3. Altyazı — 30 karakter

```
Seviyeli Hikaye, Anında Çeviri
```

**30/30 karakter.**

- `seviyeli` + `çeviri`: ikisi de başlıkta yok, ikisi de düşük rekabetli.
- Ölçülen bulgu: TR'de rakiplerin **%29'u altyazıyı boş bırakıyor**
  (Readable, Reading Power, BOOKR, Duolingo dahil). Bu alan bedava
  indeksleme.

## 4. Anahtar kelime alanı — 100 karakter

```
okuma,ceviri,sözlük,kelime,defteri,klasik,roman,öykü,a1,a2,b1,b2,c1,metin,dinle,okuyarak,ücretsiz
```

**97/100 karakter.**

Kurallar:

- Başlık/altyazıdaki kelimeler **tekrarlanmadı** — Apple üçünü birleştirip
  indeksliyor, tekrar yer israfı.
- Şapkasız varyantlar ayrı terim gibi davranıyor; `ceviri` (şapkasız) ve
  `sözlük` birlikte yazıldı.
- Boşluk yok, yalnızca virgül (boşluk karakter yakıyor).
- `a1..c1` seviye araması yapan kullanıcıyı yakalıyor ve
  `seviyeli ingilizce kitap` aramasında yalnızca 2 sonuç var.

## 5. Promosyon metni — 170 karakter

```
Artık 10 dilde. İngilizce hikâyeyi oku, anlamadığın kelimeye dokun, karşılığını kendi dilinde gör. Tüm kitaplar ücretsiz, okuma ekranında hiç reklam yok.
```

**153/170 karakter.**

## 6. Açıklama — 4000 karakter sınırı

```
Türkçe bilen biri için yazılmış bir İngilizce okuma uygulaması.
Anlamadığın kelimeye dokun, Türkçe karşılığı anında açılsın.
Cümleye uzun bas, cümlenin tamamının çevirisini gör.

SENİN SEVİYENDEN BAŞLA
Yeni başlıyorsan A1 ve A2 seviyesinde, tek oturumda bitebilecek kısa
hikâyeler var; her biri 6-8 dakika ve bu uygulama için yazıldı. Sonra
yaklaşık 20 dakikalık B1 hikâyelerine, oradan dünya edebiyatının
klasiklerine geçersin. Basamak hiçbir yerde kopmuyor. Uygulama açılışta
kısa bir kelime testiyle sana nereden başlayacağını söyler.

OKURKEN ÖĞREN
Bilmediğin kelimeye dokunduğunda karşılığı açılır. Kelimenin telaffuzunu
dinlemek her zaman ücretsiz. Beğendiğin kelimeyi kaydet; uygulama onu
aralıklı tekrar yöntemiyle, unutmaya başladığın gün karşına çıkarır.
Kelimeyi ilk gördüğün cümleyle birlikte gösterir; ezber değil, hatırlama.

KİTAPLAR HER ZAMAN ÜCRETSİZ
Tüm kitaplar, tüm bölümler, sınırsız okuma. Reklam yok. Okuma ekranında
hiçbir zaman kesinti, banner ya da abonelik teklifi görmezsin.

ÜCRETSİZ KATMANDA NE VAR
- 119 kitabın tamamı, sınırsız okuma
- Günde 15 kelime çevirisi
- Günde 10 AI cümle çevirisi
- 100 kelimelik kelime defteri
- Aralıklı tekrar, sınırsız
- Okuma istatistikleri
- Kelime telaffuzu, sınırsız
- Çevrimdışı okuma

PREMIUM NE EKLER
- Stüdyo seslendirmesi: 63 özgün hikâyede, okunan kelime metinde
  işaretlenerek. Klasik kitaplarda seslendirme yok.
- Sınırsız kelime çevirisi (günlük 15 sınırı kalkar)
- Sınırsız kelime defteri
- Günde 200 AI cümle çevirisi
- İkinci dil çifti (ilk çift her zaman ücretsiz)

10 DİLDE
Arayüz ve kelime karşılıkları Türkçe, İngilizce, Almanca, Fransızca,
İtalyanca, İspanyolca, Rusça, Arapça, Çince ve Japonca olarak çalışıyor.
Hangi dili biliyorsan İngilizceyi onun üzerinden okuyabilirsin.

NELER VAR
- 119 kitap ve hikâye
- 63'ü seviyeli özgün hikâye (A1, A2 ve B1)
- 56 klasik eser (B1'den C2'ye)
- 26.000 kelimelik İngilizce-Türkçe sözlük
- Cümle çevirisi
- Çevrimdışı okuma
- Koyu tema, yazı tipi ve punto ayarı

Klasik eserler telif hakkı sona ermiş, herkesin serbestçe kullanabileceği
kaynaklardan alınmıştır. Seviyeli hikâyeler bu uygulama için yazılmıştır.
```

## 7. "Yenilikler" — ilk sürüm

```
İlk sürüm. 119 kitap, 26.000 kelimelik sözlük ve seviyene göre
başlayabilmen için A1'den B1'e 63 özgün hikâye ile yayındayız.
```

## 8. Kategori ve yaş

| Alan              | Değer    | Gerekçe                                       |
| ----------------- | -------- | --------------------------------------------- |
| Birincil kategori | Eğitim   | Rakiplerin tamamı burada                      |
| İkincil kategori  | Kitaplar | `roman`, `klasik`, `öykü` aramalarını yakalar |
| Yaş sınırı        | 4+       | İçerikte şiddet/yetişkin tema yok             |

## 9. Dürüstlük sınırları (bu dilde kontrol edilenler)

- Seslendirme **63 özgün hikâyede** var, klasiklerde YOK — açıklamada
  açıkça yazıldı.
- Aralıklı tekrar ve istatistikler **ücretsiz** — premium listesinde
  değiller (2026-09-14 denetim bulgusu).
- Kelime telaffuzu ücretsiz — premium listesinde değil.
- "10 dil" **arayüz/karşılık dili** sayısı; "10 dilde kitap" denmedi.
- Sosyal kanıt iddiası (kullanıcı sayısı, ödül) yok — henüz yayınlanmadık.
- Sayısal etkinlik iddiası ("%X daha hızlı öğren") yok.
