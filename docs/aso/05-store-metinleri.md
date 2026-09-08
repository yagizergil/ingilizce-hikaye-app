# App Store Metinleri — Kopyala/Yapıştır

Tarih: 2026-09-07. Kaynak: `01-rakipler.md`, `02-anahtar-kelimeler.md`,
`04-konumlandirma.md` + 2026-09-07'de yayınlanan yeni içerik.

> Karakter sayıları Python `len()` ile sayıldı. Apple'ın sınırları:
> başlık 30, altyazı 30, anahtar kelime alanı 100 karakter.

---

## Neden araştırmanın önerisinden saptım

Araştırma altyazı olarak **"Klasik Kitaplar, Anında Çeviri"** önermişti ve
o gün doğruydu: katalog 47 klasik metinden ibaretti. Aynı gün 38 özgün
seviyeli hikâye yayınlandı (9 A1 + 30 A2'nin çoğu), yani ürün artık
"klasikler" değil **"seviyene göre hikâyeler + klasikler"**.

Araştırmanın kendi bulgusu bu değişikliği zorunlu kılıyor: rakiplerin
tamamı (Readable "seviyene göre basitleştirilmiş", iStoria "Oxford graded
readers", Magibook "Sadeleştirilmiş Kitap") seviyeleme iddiasıyla
konumlanıyor. Klasik metin iddiası bizi güçlü olmadığımız yerde
yarıştırırdı; seviyeleme iddiası artık dürüstçe yapılabilir bir iddia.

Araştırmanın "public domain / Gutenberg demeyin, teknik olmayan kullanıcıya
değer düşürücü" bulgusuna uyuldu: bu terimler açıklamanın hiçbir yerinde
geçmiyor, kaynak dürüstlüğü en alta konuldu.

---

## Başlık (30 karakter sınırı)

```
İngilizce Hikaye: Oku, Öğren
```

**28/30 karakter.**

- Ana terim (`ingilizce hikaye`) başta — Apple başlığa en yüksek ağırlığı veriyor.
- `oku` ve `öğren` iki ayrı arama terimini daha kapsıyor.

## Altyazı (30 karakter sınırı)

```
Seviyeli Hikaye, Anında Çeviri
```

**30/30 karakter.**

- `seviye` ve `çeviri` başlıkta olmayan iki güçlü terimi ekliyor.
- Rakip altyazılarının %29'u boş (araştırma bulgusu) — bu alan bedava
  indeksleme, boş bırakılmamalı.

## Anahtar kelime alanı (100 karakter sınırı)

```
kelime,ögren,okuma,ceviri,sözlük,seviye,klasik,roman,defter,cümle,hikâye,ezber,a2,b1,b2,metin,öykü
```

**98/100 karakter.**

Kurallar (araştırmanın Türkçe karakter ölçümüne dayanıyor):

- Başlık/altyazıda geçen kelimeler burada TEKRARLANMAZ — Apple ikisini
  birleştirip indeksliyor, tekrar yer israfı.
- Şapkasız/varyant formlar ayrıca yazılıyor: `ögren`, `ceviri` — ölçüme
  göre `ogren`↔`öğren` örtüşmesi yalnızca 5/10, `kelime`↔`kelıme` 2/10.
  Yani varyantlar ayrı terim gibi davranıyor.
- `a2,b1,b2` seviye araması yapan kullanıcıyı yakalıyor; araştırmada
  `seviyeli ingilizce kitap` yalnızca **2 sonuç** döndürüyordu — neredeyse
  boş bir alan.
- Boşluk YOK, yalnızca virgül (boşluk karakter yakar).

---

## Açıklama

İlk üç satır kritik: App Store'da "daha fazla" dokunulmadan yalnızca o
kadarı görünüyor.

```
Türkçe bilen biri için yazılmış bir İngilizce okuma uygulaması.
Anlamadığın kelimeye dokun, Türkçe karşılığı anında açılsın.
Cümleye uzun bas, cümlenin tamamının çevirisini gör.

SENİN SEVİYENDEN BAŞLA
Yeni başlıyorsan A1 ve A2 seviyesinde, tek oturumda bitebilecek 39 kısa
hikâye var — her biri 6-8 dakika, bu uygulama için yazıldı. Hazır
hissettiğinde B1 ve üstünde dünya edebiyatının klasiklerine geçersin.
Uygulama açılışta bir dakikalık bir kelime testiyle sana nereden
başlayacağını söyler.

OKURKEN ÖĞREN
Bilmediğin kelimeye dokunduğunda Türkçe karşılığı açılır. Beğendiğin
kelimeyi kaydet; uygulama onu aralıklı tekrar yöntemiyle, unutmaya
başladığın gün karşına çıkarır. Kelimeyi ilk gördüğün cümleyle birlikte
gösterir — ezber değil, hatırlama.

KİTAPLAR HER ZAMAN ÜCRETSİZ
Tüm kitaplar, tüm bölümler, sınırsız okuma. Reklam yok. Okuma ekranında
hiçbir zaman kesinti, banner ya da abonelik teklifi görmezsin.

PREMIUM NE EKLER
- Sınırsız kelime kaydı (ücretsiz katmanda 100 kelime)
- Aralıklı tekrar ile sınırsız kelime tekrarı
- Günde 200 AI cümle çevirisi (ücretsiz katmanda 10)
- Okuma süresi, seri ve seviye istatistikleri

SESLİ OKU, TAKİP ET
Hikâyeyi sesli dinlerken okunan kelime metnin üzerinde işaretlenir. Gözün
kulağını takip eder — telaffuzu ve kelimenin cümledeki yerini aynı anda
öğrenirsin. Hız üç kademeli; yavaş, normal, hızlı. Sesli okuma ücretsizdir.

NELER VAR
- 109 kitap ve hikâye
- 63'ü seviyeli özgün hikâye (39 A1/A2, 24 B1)
- 26.000 kelimelik İngilizce-Türkçe sözlük
- Kelime kelime takipli sesli okuma
- Çevrimdışı okuma
- Koyu tema, yazı tipi ve punto ayarı

Klasik eserler telif hakkı sona ermiş, herkesin serbestçe kullanabileceği
kaynaklardan alınmıştır. Seviyeli hikâyeler İngilizce Hikaye Stüdyosu
tarafından bu uygulama için yazılmıştır.
```

> **DÜZELTME (2026-09-07 denetimi).** Premium listesi iki madde yüzünden
> yanıltıcıydı ve yukarıda düzeltildi:
>
> - **"Sesli okuma" kaldırıldı.** Özellik üründe yok — `expo-speech`
>   yalnızca tek kelime telaffuzu için kullanılıyor ve o zaten ücretsiz.
>   Var olmayan bir özelliği satmak App Store Guideline 2.3.1 kapsamında
>   yanıltıcı metadatadır.
> - **AI maddesi sayılarla yazıldı.** Özellik vardı (`translate-sentence`
>   Edge Function'ı) ama kotası herkes için aynıydı, yani premium faydası
>   değildi. Migration 029 kotayı katmana bağladı: ücretsiz 10/gün,
>   premium 200/gün.
>
> Kural: bir fayda önce üründe çalışır, sonra bu listeye yazılır.

---

## "Yenilikler" metni (ilk sürüm)

```
İlk sürüm. 85 kitap, 26.000 kelimelik Türkçe sözlük ve yeni
başlayanlar için yazılmış 39 kısa hikâye ile yayındayız.
```

---

## Promosyon metni (170 karakter, güncellenebilir alan)

```
Yeni: A1 ve A2 seviyesinde, tek oturumda bitebilecek 39 özgün hikâye eklendi. Artık İngilizceye yeni başlayanlar da ilk günden okumaya başlayabilir.
```

**146/170 karakter.**

---

## Kategori ve yaş

| Alan              | Değer    | Gerekçe                                                         |
| ----------------- | -------- | --------------------------------------------------------------- |
| Birincil kategori | Eğitim   | Rakiplerin tamamı burada                                        |
| İkincil kategori  | Kitaplar | `roman`, `klasik`, `öykü` aramalarını yakalar                   |
| Yaş sınırı        | 4+       | İçerikte şiddet/yetişkin tema yok; `books.content_warnings` boş |

---

## Henüz YAPILAMAYAN (lansman öncesi zorunlu)

1. **Ekran görüntüleri.** Hiç yok. En az 3, tercihen 6 tane gerekiyor.
   Öncelik sırası: (1) reader'da bir kelimeye dokunulmuş, Türkçe karşılık
   açık; (2) seviye testi sonucu; (3) kütüphane, seviye rozetleriyle;
   (4) tekrar ekranı; (5) kelime defteri; (6) koyu tema reader.
2. **Gerçek arama hacimleri.** Apple Search Ads hesabı gerekiyor —
   araştırmanın da 1 numaralı önerisi. Yukarıdaki anahtar kelime seçimi
   sonuç sayısı ve rakip yoğunluğuna dayanıyor, gerçek hacme değil.
3. **Gizlilik politikası URL'i.** App Privacy beyanı için de gerekli.
   Toplanan veri: hesap kimliği (anonim ya da Apple/Google), okuma
   ilerlemesi, kaydedilen kelimeler, ürün telemetrisi (migration 020).
   Üçüncü parti analitik satıcısı YOK — beyan bu yüzden dar.

---

## DÜZELTME (2026-09-07, yayın öncesi son doğrulama)

Açıklamadaki **"Sonra B1 seviyesinde biraz daha uzun özgün hikâyelere"**
cümlesi kaldırıldı.

Veritabanından ölçüldü: B1 seviyesinde 15 kitap var ama **hiçbiri özgün
değil** — hepsi ortalama 197 dakikalık klasikler. Özgün hikâyelerin
tamamı (39) A1 ve A2'de.

| Seviye | Kitap | Özgün | Ort. süre |
| ------ | ----- | ----- | --------- |
| A1     | 9     | 9     | 6 dk      |
| A2     | 30    | 30    | 8 dk      |
| B1     | 15    | 0     | 197 dk    |
| B2     | 24    | 0     | 271 dk    |
| C1     | 5     | 0     | 326 dk    |
| C2     | 2     | 0     | 298 dk    |

Var olmayan bir içeriği açıklamada vaat etmek App Store Guideline 2.3.1
kapsamında yanıltıcı metadatadır — bu, sesli okuma maddesinde bir kez
yaşanmış hatanın aynısıydı. Kural değişmedi: bir şey önce üründe olur,
sonra açıklamaya yazılır.

Ayrıca kaynak dağılımı düzeltildi: **46 klasik + 39 özgün** (bazı
belgelerde 47 + 38 yazıyordu, veritabanı 46 + 39 diyor).
