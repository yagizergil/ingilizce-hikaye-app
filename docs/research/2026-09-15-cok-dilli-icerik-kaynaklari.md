# Çok Dilli Kamu Malı Kitap Kaynakları — Uygulanabilir İçerik Planı

> Tarih: 2026-09-15
> Kapsam: es, fr, de, it, ru, zh, ja, ar, tr için gerçek kamu malı
> klasik kitap kaynakları, hukuki filtre, seviye uyumu, boru hattı ve
> öncelik/maliyet planı.
>
> **Önceki iki rapor:**
> `2026-09-13-cok-dilli-icerik-arastirmasi.md` (kaynak envanteri, NLP,
> CEFR eşlemesi) ve `2026-09-14-kitap-kaynaklari-uygulama-plani.md`
> (Gutendex ölçümleri, kapak, rollout sırası).
> **Bu rapor onları TEKRARLAMAZ.** Oradaki telif tablosu, "yazar 1955
> öncesi ölmüş olmalı" kuralı, spaCy/Stanza/CAMeL seçimleri ve
> CEFR↔JLPT/HSK/TORFL eşleme tartışması hâlâ geçerli ve değişmedi.
> Bu rapor üç yeni şey getiriyor: (1) o iki raporun açık bıraktığı 6
> sorunun **kapatılması**, (2) depoda **zaten var olan** çok dilli
> boru hattının ve indirilmiş 157 kitaplık ham korpusun envanteri,
> (3) seviye uyumu (§3) ve dile-göre-strateji — ikisi de önceki
> raporlarda hiç ele alınmamıştı.

**Doğrulama disiplini:** Aşağıdaki her sayı ya bu oturumda canlı bir
HTTP isteğiyle ya da depodaki dosyaların doğrudan ölçümüyle elde
edildi. Doğrulayamadığım her şey **(doğrulanmadı)** diye işaretli.
Arama motoru özetinden alınıp teyit edilmemiş hiçbir rakam yok.

---

## 0. Yönetici özeti — 9 bulgu

1. **En büyük bulgu: iş sanıldığından çok daha ileride.** `pipeline/`
   içinde 10 dilli tam bir boru hattı **zaten yazılmış ve çalışıyor**:
   `fetch_gutenberg.py`, `publish_classics.py`, `publish_multilang.py`,
   `generate_stories_multi.py` (spaCy/Stanza/CAMeL adaptörleriyle),
   `cover_multilang.py` ve 10 dilin kelime listeleri (`data/`).
   Ayrıca **157 klasik zaten indirilmiş** ve `classics_{lang}/`
   altında duruyor (§1.1). Eksik olan kod değil, **yayınlama kararı ve
   seviye/kalite elemesi**.
2. **Gutendex sayıları 24 saatte stabil** (fr 3.682, de 2.241, it 1.031,
   es 801, zh 202, ru 8, ja 0-22, tr 0, ar 0 — en 49.344). Önceki
   raporun ölçümleri doğrulandı; katalog günlük değişmiyor, yani bu
   sayılara planlama yapılabilir.
3. **Çince için "klasik Çince tuzağı" artık tahmin değil, ölçülmüş
   gerçek.** İndirilmiş 20 zh kitabın 18'i **geleneksel karakterli**
   ve içerik listesi 紅樓夢 (1763), 聊齋志異 (1715), 儒林外史 (1754),
   封神演義 (1606) gibi **pre-modern** eserler. Modern yerel dille
   yazılmış tek yazar Lu Xun. Biri (`肉蒲團`) erotik içerik, biri
   (`The Chinese Classics Vol.1`) aslında **İngilizce** bir kitap,
   yanlış dil etiketiyle gelmiş. **Çince Gutenberg havuzu bu ürün
   için pratikte kullanılamaz** (§1.4).
4. **Japonca'da doğru kaynak bulundu ve ölçüldü.** Aozora Bunko'nun
   resmî ana indeksi (`list_person_all_extended_utf8.zip`, 2,0 MB)
   indirildi ve ayrıştırıldı: **17.840 benzersiz eser**, bunun
   **17.352'si telifsiz** (`作品著作権フラグ = なし`), 17.347'sinde
   indirilebilir metin URL'i var. **Modern yazı (新字新仮名) + telifsiz
   + metni olan: 10.477 eser** — ürün için gerçek kullanılabilir havuz
   bu (§1.6). Önceki raporun 404 veren GitHub mirror'ının **yerine
   geçen canlı mirror: `aozorahack/aozorabunko_text`** (200).
5. **Hindawi kapandı / taşındı.** `hindawi.org/books` artık
   **`safahat.org/books`'a 301 yönleniyor** ve orası hem `curl` hem
   `WebFetch` ile **403** veriyor. Yani Arapça'nın tek gerçekçi adayı
   iki rapordur açık olan lisans sorusunu kapatmak bir yana, **artık
   programatik olarak erişilemiyor bile**. Arapça için karar:
   **tam özgün üretim** (§1.9).
6. **LiberLiber'in doğru katalog yolu bulundu** (önceki raporun 404
   verdiği açık soru): `https://liberliber.it/autori/autori-<harf>/`
   — A'dan Z'ye + `autori-0-9` şeklinde 27 sayfalık harf indeksi.
7. **Wikisource boyutları ilk kez gerçek sayıyla ölçüldü** (önceki
   raporlar "100.000+ text unit" gibi belirsiz ifadeler kullanıyordu).
   MediaWiki `siteinfo` API'siyle: zh 3.876.220, fr 712.249, de
   654.354, ru 623.754, it 225.059, ar 94.364, es 90.115, ja 18.736,
   **tr 20.025** makale (§1.10). Türkçe Wikisource önceki raporların
   "küçük" tahminini doğruluyor ama **sıfır değil**.
8. **Seviye uyumu asıl darboğaz, kaynak değil.** Bu klasiklerin
   ortalama uzunluğu 69.000–118.000 kelime (§1.1) ve hepsi C1/C2. Üç
   seçenek §3'te maliyetiyle karşılaştırıldı; **öneri: hibrit** —
   klasikler C1/C2 rafına ham girer, A2–B1 rafı için aynı klasiklerin
   **sadeleştirilmiş uyarlaması** üretilir. Kritik nokta:
   `src/validator.py`'nin `is_adaptation` bayrağı **bu ikisini zaten
   ayrı denetim modları olarak destekliyor** — yeni mimari gerekmiyor.
9. **Öneri: 4 dille başla (fr, es, de, it), 157 kitabın elemesini yap,
   sonra ru/ja.** Bu dördü için ham içerik zaten diskte;
   kalan iş indirme değil **eleme + yayınlama** (§5). Tahmini:
   4 dil için ~6-9 gün ve ~$150-400 API; 9 dilin tamamı ~8-12 hafta.

---

## 1. Kaynaklar — dil dil, doğrulanmış sayılarla

### 1.1 Önce envanter: depoda ZATEN ne var

Bu, iki önceki raporda da yok — çünkü ikisi de yazıldıktan sonra
indirme yapılmış. `pipeline/classics_{lang}/` içeriği bu oturumda
doğrudan ölçüldü:

| Dil    | İndirilmiş kitap | Ortalama uzunluk        | Toplam        | Durum                                          |
| ------ | ---------------: | ----------------------- | ------------- | ---------------------------------------------- |
| es     |               30 | 118.001 kelime          | 3.540.031     | Yayına hazır aday                              |
| it     |               30 | 114.029 kelime          | 3.420.871     | Yayına hazır aday                              |
| de     |               30 | 86.880 kelime           | 2.606.420     | Yayına hazır aday                              |
| fr     |               30 | 69.070 kelime           | 2.072.107     | Yayına hazır aday                              |
| ja     |               15 | 143.916 karakter        | 2.158.753     | Gutenberg kaynaklı, ruby işaretli — §1.6       |
| zh     |               20 | 308.857 karakter        | 6.177.140     | **Kullanılamaz** — §1.4                        |
| ru     |                2 | 16.593 kelime           | 33.187        | **Kullanılamaz** — §1.5                        |
| ar, tr |                0 | —                       | —             | Kaynak yok (§1.8, §1.9)                        |

**Toplam 157 kitap, ~20 milyon kelime/karakter ham metin diskte.**
Hiçbiri yayınlanmamış. `publish_classics.py` bunları
`status='needs_review'` ile yazacak şekilde yazılmış (kendi
docstring'i bunu bilinçli bir güvenlik önlemi olarak açıklıyor).

**Bunun anlamı:** fr/es/de/it için "kaynak bulma" işi **bitmiş**.
Kalan iş §3'teki seviye elemesi ve §5'teki yayınlama.

### 1.2 Project Gutenberg — ölçüm (2026-09-15, yeniden)

Yöntem önceki raporla aynı (`curl -L -A "Mozilla/5.0"`, trailing slash
zorunlu; çıplak `WebFetch` hâlâ 403 alıyor):

```
curl -s -L -A "Mozilla/5.0" "https://gutendex.com/books/?languages=<kod>&author_year_end=1955"
```

| Dil | 2026-09-14 (önceki rapor) | 2026-09-15 (bu oturum) | Fark |
| --- | ------------------------: | ---------------------: | ---- |
| en  |                    49.336 |             **49.344** | +8   |
| fr  |                     3.682 |              **3.682** | 0    |
| de  |                     2.241 |              **2.241** | 0    |
| it  |                     1.031 |              **1.031** | 0    |
| es  |                       800 |                **801** | +1   |
| zh  |                       202 |                **202** | 0    |
| ru  |                         8 |                  **8** | 0    |
| tr  |                         0 |                  **0** | 0    |
| ar  |                         0 |                  **0** | 0    |
| ja  |                        22 |         (istek hatası) | —    |

**Yorum:** Havuz günlük ölçekte sabit. Bu, "sayı eskir mi" endişesini
kapatıyor: planlama bu rakamlara güvenle yapılabilir. Lisans netliği
Gutenberg'de **en yüksek** — her eser ABD kamu malı olarak doğrulanmış,
format `.txt.utf-8` (doğrudan boru hattına giriyor), toplu indirme
Gutendex API'si üzerinden mümkün ve `fetch_gutenberg.py` bunu zaten
yapıyor (istek başına 2 sn bekleme ile).

### 1.3 🇫🇷 fr / 🇪🇸 es / 🇩🇪 de / 🇮🇹 it — çözülmüş dört dil

Bu dördü için **yeni kaynak araştırmasına gerek yok.** Gutenberg tek
başına yeterli (3.682 / 801 / 2.241 / 1.031 eser), format TXT, lisans
net, 30'ar kitap zaten indirilmiş durumda.

İkincil kaynaklar (yalnızca tür çeşitliliği gerekirse):

| Kaynak                                | Bu oturumdaki durum                                                | Değerlendirme                                                                     |
| ------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **LiberLiber** (it)                   | Kök 200. **Katalog yolu bulundu:** `/autori/autori-<harf>/` (A–Z + 0-9) | Önceki raporun açık sorusu #3 **KAPANDI**. Format karışık (EPUB/PDF/RTF) — scrape gerekir |
| **Cervantes Virtual** (es)            | **403** (curl + WebFetch)                                          | Bot koruması eklenmiş görünüyor. **Toplu erişim artık pratik değil**; es için Gutenberg zaten yeterli, bu kaynağı ELE   |
| **Biblioteca Digital Hispánica** (es) | **403**                                                            | Aynı — kullanma                                                                   |
| **Gallica / BnF** (fr)                | **000 (bağlanamadı)**                                              | Bu oturumda hiç erişilemedi. Zaten çoğu tarama+OCR; fr için Gutenberg yeterli — ELE |
| **Wikisource** (hepsi)                | Canlı, dump mekanizması doğrulandı                                 | §1.10                                                                             |
| **Standard Ebooks**                   | 200. ~127 sayfa × 12 = **~1.500 eser**, **CC0** lisanslı            | **Yalnızca İngilizce** (site dil filtresi sunmuyor; İngilizce-dışı eser görülmedi — **(doğrulanmadı, ama misyon metni İngilizce klasiklere odaklı)**). Diğer 9 dil için kullanılamaz |

**Sonuç:** fr/es/de/it için **tek kaynak: Project Gutenberg.** Üç
ikincil kaynak (Cervantes, BDH, Gallica) bu oturumda erişilemez çıktı
ve zaten gerekli değiller — plandan çıkarılmalı ki boşa mühendislik
yapılmasın.

### 1.4 🇨🇳 zh — Gutenberg havuzu ürün için KULLANILAMAZ (yeni, ölçülmüş)

Önceki rapor "klasik Çince tuzağı" riskini işaretlemişti ama
doğrulayamamıştı. Bu oturumda indirilmiş 20 kitabın **metni doğrudan
ölçüldü**.

**(a) Karakter seti:** 20 kitabın **18'i geleneksel**, 2'si
basitleştirilmiş. (Yöntem: her metinde ayırt edici 24 geleneksel ve
24 basitleştirilmiş karakterin sayımı; örn. `book-23910` → 20.331
geleneksel / 0 basitleştirilmiş.) Yani OpenCC dönüşümü **opsiyonel
değil, zorunlu bir ön adım**.

**(b) Daha ciddi sorun — çağ:** İndirilen eserlerin yazar ölüm yılları:

| Eser         | Yazar        | Ölüm | Dil çağı                |
| ------------ | ------------ | ---: | ----------------------- |
| 封神演義     | Lu Xixing    | 1606 | Erken modern yerel dil  |
| 初刻拍案驚奇 | Ling Mengchu | 1644 | Erken modern yerel dil  |
| 警世通言     | Feng Menglong| 1646 | Erken modern yerel dil  |
| 聊齋志異     | Pu Songling  | 1715 | **Klasik Çince (文言)** |
| 儒林外史     | Wu Jingzi    | 1754 | Erken modern yerel dil  |
| 紅樓夢       | Cao Xueqin   | 1763 | Erken modern yerel dil  |
| 朝花夕拾     | Lu Xun       | 1936 | **Modern yerel dil ✓**  |
| 中國小說史略 | Lu Xun       | 1936 | Modern ama akademik     |

20 eserin 17'si **1800 öncesi**. HSK 1-6 öğrenen bir kullanıcı bu
metinleri okuyamaz — bu bir seviye sorunu değil, **dil sorunu**
(Chaucer'ın orta İngilizcesini A2 öğrencisine vermek gibi).

**(c) Veri kalitesi:** `The Chinese Classics — Volume 1: Confucian
Analects` (James Legge, 1897) Gutenberg'de `languages=zh` altında
geliyor ama **İngilizce bir kitap**. Ayrıca `肉蒲團` (Li Yu) erotik bir
eser — `content_warnings` alanı olmadan yayınlanamaz.

**Verdikt (önceki raporlardan daha sert):** Çince klasikler rafı
Gutenberg ile **doldurulamaz**. Alternatifler:
- **Wikisource zh** (3.876.220 makale — en büyük Wikisource) ama aynı
  çağ sorunu geçerli; Minguo dönemi (1912-1949) yazarlarına
  filtrelemek gerekir.
- **Öneri:** zh için klasikler rafını 1900-1949 arası modern yerel dil
  yazarlarıyla **elle küratörlü, 10-20 eserlik küçük bir seçki** olarak
  kur (Lu Xun, Zhu Ziqing, Xu Zhimo — hepsi 1955 öncesi ölmüş). Toplu
  indirme yerine **elle seçim**; havuz zaten küçük olduğu için otomasyon
  değmiyor.

### 1.5 🇷🇺 ru — Gutenberg sıfıra yakın, doğrulandı

Gutendex 8 eser. İndirilen 2 tanesi:
`1001 задача для умственного счета` (zihinden hesap problemleri kitabı,
Rachinskii, 1902) ve `Московия в представлении иностранцев XVI-XVII в.`
(akademik tarih, Apostol, 1942). **İkisi de edebiyat değil** — yani
Gutenberg ru havuzu 8 eserle küçük olmakla kalmıyor, **içeriği de
ürüne uygun değil**.

Bu oturumda canlı bulunan Rusça alternatifler:

| Kaynak                         | HTTP | Değerlendirme                                                                  |
| ------------------------------ | ---- | ------------------------------------------------------------------------------ |
| **Wikisource ru**              | 200  | **623.754 makale.** Dump: `dumps.wikimedia.org/ruwikisource/latest/ruwikisource-latest-pages-articles.xml.bz2` — **dosyanın varlığı doğrulandı**. Lisans en temiz. **Birincil kaynak.** |
| `ilibrary.ru`                  | 200  | Canlı, temiz klasik koleksiyonu, iyi HTML. **Lisans beyanı yok (doğrulanmadı)** — riskli |
| `rvb.ru` (Русская виртуальная библиотека) | 200 | Canlı. Akademik, editörlü basımlar. Lisans **(doğrulanmadı)** |
| `lib.ru`                       | —    | Önceki raporun "kullanma" kararı değişmedi (telif riski)                        |

**Öneri:** ru için tek yol **Wikisource ru dump'ı**. Bu, fr/es/de/it'ten
farklı bir kod yolu (§1.10) ve bu yüzden ru rollout'ta 5. sırada
kalmalı — önceki raporlarla aynı sonuç, ama artık Gutenberg'in neden
kurtarılamayacağı da gösterilmiş durumda.

### 1.6 🇯🇵 ja — Aozora Bunko, ilk kez tam sayıyla (açık soru #2 KAPANDI)

Önceki raporun 404 veren GitHub mirror'ı yerine **resmî ana indeks**
kullanıldı — bu, mirror'a hiç ihtiyaç bırakmıyor:

```
https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip
```

HTTP 200, 2.092.746 bayt, içinde tek CSV
(`list_person_all_extended_utf8.csv`), **55 sütun, 19.502 satır**.
Bu oturumda indirilip ayrıştırıldı:

| Ölçüm                                                            |   Sayı |
| ---------------------------------------------------------------- | -----: |
| Benzersiz eser (`作品ID`)                                        | 17.840 |
| Telifsiz eser (`作品著作権フラグ = なし`)                        | 17.352 |
| Telifsiz **ve** indirilebilir metin URL'i olan                    | 17.347 |
| **Telifsiz + modern yazı (`新字新仮名`) + metni olan**            | **10.477** |
| Telifli (`あり`) — **dokunulmayacak**                            |    928 |

Yazı biçimi dağılımı (satır bazında): 新字新仮名 12.130, 新字旧仮名
4.856, 旧字旧仮名 2.377, 旧字新仮名 109.

**Bu tablonun ürün için anlamı üç kat:**

1. **Hukuki filtre CSV'nin kendi içinde.** `作品著作権フラグ` sütunu
   eser bazında telif durumunu veriyor — yani Gutenberg'in
   `author_year_end=1955` filtresinin Japonca karşılığı **hazır**.
   Ayrıca `没年月日` (ölüm tarihi) sütunu var → `books.author_death_year`
   doğrudan doldurulabilir.
2. **Yazı biçimi filtresi seviye filtresidir.** 旧仮名 (eski kana)
   metinler modern Japonca öğrenen için okunamaz. `新字新仮名`
   filtresi havuzu 17.347 → **10.477**'ye indiriyor ama kalanı
   **gerçekten okunabilir** yapıyor. Bu, Çince'de yapamadığımız
   elemenin Japonca'da **veri içinde hazır** olması demek — ja'nın
   zh'den çok daha iyi durumda olmasının sebebi bu.
3. **Kodlama tuzağı:** metin dosyalarının **19.185'i Shift-JIS**
   (`JIS X 0208`), yalnızca 10'u UTF-8. Boru hattı `.txt` dosyalarını
   UTF-8 varsayıyor; Aozora için **zorunlu bir decode adımı** var.
   Dosyalar ayrıca `.zip` içinde geliyor
   (örn. `.../cards/001257/files/59898_ruby_70679.zip`).

**Ruby/furigana:** Dosya adındaki `_ruby_` işareti metinde furigana
olduğunu söylüyor; `｜漢字《かんじ》` söz dizimi ayıklanmalı. Not:
depodaki **Gutenberg kaynaklı** ja dosyaları da aynı ruby işaretlemesini
taşıyor (`classics_ja/book-31617.txt` başlığı `《...》 shows ruby`
diyor) — yani bu parser **iki kaynak için de** gerekli, tek sefer yazılır.

**Yedek bulk mirror (canlı):** `github.com/aozorahack/aozorabunko_text`
— HTTP 200, "text-only archives of www.aozora.gr.jp", son push
2023-03-22, ~256 MB. **Lisans alanı `null`** → mirror'a güvenmek yerine
resmî CSV + doğrudan indirme tercih edilmeli. (Önceki raporun 404 veren
`aozorabunko/aozorabunko` adresi bu oturumda da 404.)

### 1.7 Aozora telif kuralları sayfası

`https://www.aozora.gr.jp/guide/kijyunn.html` — 200 (canlı, 10.563
bayt). İçeriği bu oturumda **ayrıntılı okunmadı (doğrulanmadı)**; ama
CSV'deki `作品著作権フラグ` sütunu zaten eser-bazında ikili bir karar
veriyor ve boru hattı için pratik filtre odur. Yayına çıkmadan önce bu
sayfanın okunması **yine de önerilir** — özellikle "yazarın izniyle
yayınlananlar" kategorisinin (telifsiz değil, **izinli**) `なし`
bayrağına girip girmediği netleşmeli. **Bu, kapatılmamış tek Japonca
riski.**

### 1.8 🇹🇷 tr — kaynak yok, ama Wikisource ilk kez ölçüldü (açık soru #6 KAPANDI)

Önceki raporun verdiği "Türkçe'de Gutenberg-benzeri kaynak yok"
verdikti **değişmiyor**: Gutendex 0 (yeniden doğrulandı),
`ekitap.ktb.gov.tr` bu oturumda da **bağlanamadı (000)** — iki oturum
üst üste erişilemedi, yani geçici bir arıza değil.

**Yeni ölçüm — Wikisource tr** (`siteinfo` API, canlı):

| Ölçüm                  | Değer     |
| ---------------------- | --------- |
| Toplam sayfa           | 31.586    |
| **Makale (ns 0)**      | **20.025** |
| Aranabilir kelime      | 9.517.076 |
| Aktif kullanıcı        | 23        |
| Yönetici               | 2         |

**Karşılaştırma için:** fr 712.249, ru 623.754 makale. Türkçe
Wikisource **fr'nin %2,8'i** büyüklüğünde. 9,5 milyon kelime kulağa
çok geliyor ama bu, depodaki **tek bir dilin indirilmiş klasik
korpusuyla aynı mertebede** (es: 3,5M kelime / 30 kitap). Ayrıca
Wikisource içeriği ağırlıklı şiir, anayasa metni, kanun, hadis
derlemesi gibi **roman olmayan** türlerden oluşuyor
**(doğrulanmadı — içerik dağılımı örneklenmedi)**.

**Verdikt:** Türkçe klasikler rafı için Wikisource tr **tek başına
yeterli değil** ama "hiç yok" da yanlış. Gerçekçi plan: **özgün üretim
birincil kalır**, Wikisource tr'den **elle seçilmiş 5-15 kısa metin**
(Ömer Seyfettin öyküleri gibi — 1920'de ölmüş, net kamu malı) ikincil
bir raf olarak eklenebilir. Bu, otomasyon değil küratörlük işi.

### 1.9 🇸🇦 ar — Hindawi ERİŞİLEMEZ oldu (açık soru #1: kapatılamadı, ama karar netleşti)

İki rapordur açık olan "Hindawi'nin lisansı ne?" sorusu bu oturumda
**başka bir sebeple** düştü:

- `https://www.hindawi.org/books/` → **HTTP 301**, hedef
  `https://www.safahat.org/books/`
- `https://www.safahat.org/books/` → **HTTP 403** (hem `curl -L -A
  Mozilla/5.0` hem `WebFetch`)
- `https://www.hindawi.org/books/` doğrudan curl ile de **403**

Yani kurum taşınmış ve yeni adres otomatik erişime kapalı. Lisans
sorusuna cevap alınamadığı gibi, **alınsa bile toplu indirme yolu
yok**. Bir tarayıcıyla elle erişim mümkün olabilir
**(doğrulanmadı)** ama bu bir boru hattı kaynağı değildir.

**Verdikt (önceki raporun "varsayılan senaryo" dediği şey artık tek
senaryo):** Arapça klasikler rafı **yok**. Arapça, tıpkı Türkçe gibi,
**%100 özgün AI üretimine** bağımlı. Wikisource ar (94.364 makale) tek
teorik alternatif ama içeriği ağırlıklı klasik dinî/edebî metin —
modern Arapça öğrenen için Çince'dekiyle **aynı çağ sorunu**.
Ek olarak harekesizlik sorunu (önceki rapor §1.9) duruyor.

### 1.10 Wikisource — ilk kez gerçek sayılarla (tüm diller)

Yöntem (tekrarlanabilir, kimlik doğrulama gerektirmez):

```
curl -s -L -A "Mozilla/5.0" \
  "https://<kod>.wikisource.org/w/api.php?action=query&meta=siteinfo&siprop=statistics&format=json"
```

**2026-09-15 ölçümü:**

| Dil | Makale (ns 0) | Toplam sayfa | Aranabilir kelime | Aktif kullanıcı |
| --- | ------------: | -----------: | ----------------: | --------------: |
| zh  | **3.876.220** |    7.321.288 |     8.269.591.074 |             257 |
| fr  |   **712.249** |    4.819.066 |     1.274.681.834 |             290 |
| de  |   **654.354** |      713.241 |       252.268.373 |             151 |
| ru  |   **623.754** |    1.143.516 |       804.161.170 |             101 |
| it  |   **225.059** |      879.770 |       179.182.759 |              85 |
| ar  |    **94.364** |      291.016 |       115.369.570 |              59 |
| es  |    **90.115** |      343.947 |        92.933.305 |             104 |
| ja  |    **18.736** |       49.541 |        67.952.049 |              67 |
| tr  |    **20.025** |       31.586 |         9.517.076 |              23 |
| uk  |             — |            — |                 — | (rate limit)    |

> Not: uk sorgusu **API rate limit**'e takıldı ("You are making too many
> requests"). 10 ardışık istek fazla gelmiş — bir boru hattı bu API'yi
> kullanacaksa istekler arası bekleme koymalı. uk zaten ADR-013'te
> hedef dil değil, bu rapor kapsamı dışında.

**Kritik uyarı, sayıları yorumlarken:** "makale" = **sayfa**, kitap
değil. Wikisource proofread modeli bir romanı yüzlerce `Page:`
sayfasına böler; bir eseri tek metne birleştirmek `Index:`/`Page:`
namespace yapısını takip eden **ayrı bir adım**. Yani zh'nin 3,87
milyon makalesi 3,87 milyon kitap DEĞİL — büyüklük sırası için
gösterge, hacim için değil.

**Toplu indirme mekanizması (doğrulandı):**
`https://dumps.wikimedia.org/<kod>wikisource/latest/<kod>wikisource-latest-pages-articles.xml.bz2`
— `ruwikisource` için dosyanın varlığı bu oturumda teyit edildi. Aynı
desen tüm diller için geçerli. Rate limit sorunu yok (tek dosya
transferi, API çağrısı değil).

---

## 2. Hukuk — bir eserin bizim için güvenli olduğunu nasıl bileceğiz

Önceki raporun ülke-bazlı süre tablosu ve "yazar 1955'ten önce ölmüş
olmalı" muhafazakâr eşiği **değişmedi ve doğru**. Bu bölüm onun
**operasyonel karşılığını** yazıyor.

### 2.1 Zaten kodda olan koruma

`src/validator.py` telif kontrolünü kalite kontrolünden **bilinçli
olarak ayırmış**:

> `author_death_year` kontrolü her iki modda da ayrı bir fonksiyonla
> (`validate_author_death_year`) uygulanır — bu kalite tercihi değil,
> telif meselesidir.

`scripts/publish_classics.py` `books` tablosuna şu alanları yazıyor:
`author_death_year`, `source` (`'gutenberg'`), `source_url`, `license`,
`target_language`, `status='needs_review'`. **Yani gerekli metadata
şeması hazır.** Eksik olan tek şey: kaynak `'gutenberg'` sabit
kodlanmış — Aozora ve Wikisource eklenince parametreleşmeli.

### 2.2 Kaynak bazında hukuki risk sınıflandırması

| Kaynak                | Telif doğrulama yolu                                      | Risk       | Karar                                            |
| --------------------- | --------------------------------------------------------- | ---------- | ------------------------------------------------ |
| Project Gutenberg     | Gutendex `author_year_end=1955` + `authors[].death_year`  | **Düşük**  | ✅ Kullan — birincil                              |
| Aozora Bunko          | CSV `作品著作権フラグ = なし` + `没年月日` sütunu         | **Düşük**  | ✅ Kullan (§1.7 uyarısıyla)                       |
| Wikisource            | Sayfa başına lisans şablonu (`{{PD-old}}` vb.) kontrolü   | **Orta**   | ⚠️ Kullan, ama sayfa bazında lisans şablonu ZORUNLU |
| Standard Ebooks       | CC0 beyanı (sitenin footer'ında doğrulandı)               | **Çok düşük** | — (yalnızca İngilizce, bize faydası yok)        |
| LiberLiber            | Sayfa başına beyan                                        | **Orta**   | ⚠️ Yalnızca gerekirse, tek tek                    |
| ilibrary.ru / rvb.ru  | Beyan yok                                                 | **Yüksek** | ❌ Kullanma                                       |
| lib.ru                | "İtiraz gelirse kaldırırız" modeli                        | **Yüksek** | ❌ Kullanma (önceki raporla aynı)                 |
| Hindawi / safahat.org | **Erişilemiyor (403)**                                    | **Bilinmez** | ❌ Kullanma                                      |
| Projekt Gutenberg-DE / Zeno.org | Toplu indirmeye izin vermiyor                   | **Yüksek** | ❌ Kullanma (önceki raporla aynı)                 |
| Millî Kütüphane (tr)  | "Tüm hakları saklıdır"                                    | **Yüksek** | ❌ Kullanma                                       |

### 2.3 Boru hattına konması gereken somut kural

Her kitap için **üç alan zorunlu**, biri eksikse yayınlama:

1. `author_death_year` — **≤ 1955** (muhafazakâr eşik; hem ABD 95-yıl
   hem AB yaşam+70 kuralını aynı anda karşılar).
2. `source` + `source_url` — hangi kaynaktan, hangi adresten.
3. `license` — kaynağın kendi beyanı (metin olarak saklanmalı, boolean
   değil).

**Bilinmeyen ölüm yılı = red.** Depodaki zh korpusunda iki eserde
(`夜雨秋燈錄`, `肉蒲團`) `author_death_year: null` var — bunlar bu
kuralla otomatik elenir. Bu, kuralın **zaten işe yaradığının** somut
kanıtı.

**Ek kural önerisi (yeni):** `target_language` doğrulaması. Gutenberg
`languages=zh` altında İngilizce bir kitap döndürdü (§1.4c). Metnin
gerçekten hedef dilde olduğunu ölçen ucuz bir kontrol (örn. karakter
kümesi oranı veya `langdetect`) `publish_classics.py`'ye eklenmeli.

---

## 3. Seviye uyumu — asıl darboğaz (yeni bölüm)

Önceki iki rapor bunu hiç ele almadı. Ama §1.1'deki tablo sorunu net
gösteriyor: indirilmiş klasiklerin **ortalaması 69.000–118.000 kelime**
ve hepsi C1/C2. Hedef kullanıcı A2–B2. Yani kaynak bulmak sorunun
yarısı bile değil.

### 3.1 Üç seçenek, maliyet ve riskle

#### (a) Sadece C1/C2 rafına koy — ham metin

- **Maliyet:** ~0. Boru hattı hazır (`publish_classics.py` seviye
  tahmini yapıyor, `is_adaptation=False` modu ham metinler için zaten
  kalibre edilmiş).
- **Süre:** dil başına yarım gün (eleme + yayınlama).
- **Risk:** Hedef kullanıcının (A2–B2) **hiçbiri okuyamaz.** İngilizce
  tarafında yaşanan "B1 boşluğu" sorununun aynısı: raf dolu görünür,
  kullanıcı duvara çarpar. CLAUDE.md'deki B1 vakası tam olarak bunun
  ne kadar pahalıya mal olduğunu gösteriyor.
- **Değerlendirme:** Tek başına yetersiz, ama **maliyeti sıfır olduğu
  için ilk adım olarak yapılmalı** — C1/C2 rafı bugün boş, dolması net
  bir kazanç.

#### (b) Sadeleştirilmiş uyarlama üret

Kamu malı eserde uyarlama **telif açısından tamamen serbest** (eser
kamu malıysa türev eser de serbesttir; uyarlamanın kendi telifi bize
ait olur).

- **Maliyet:** Hikâye başına, mevcut `generate_stories_multi.py`
  ölçeğine dayanarak: B1/B2 özgün hikâye ~5.000 kelime ve kapalı
  döngü (üret→doğrula→yeniden yazdır) genelde 2-3 tur. Uyarlama bundan
  **daha pahalı**, çünkü kaynak metnin tamamı (70-120 bin kelime)
  girdi olarak ya bölüm bölüm verilmeli ya da özetlenmeli.
  Kaba tahmin: eser başına **$3–8** (Sonnet, batch ile yarısı)
  **(tahmin — bu ürün için hiç uyarlama üretilmedi, kıyas özgün hikâye
  maliyetinden türetildi)**.
- **Süre:** Prompt yazımı (dil başına değil, **seviye başına** —
  uyarlama promptu dilden bağımsız kurgulanabilir) 1-2 gün; sonra
  eser başına dakikalar.
- **Risk:** İki tanesi ciddi:
  1. **Kalite.** Bir romanı A2'ye indirmek özetlemek değil, yeniden
     yazmaktır. Kötü uyarlama, klasiğin adını taşıyan kötü bir metindir
     — marka riski.
  2. **Doğrulayıcı hazır ama kalibre değil.** `validate_book(...,
     is_adaptation=True)` modu **tam bu iş için yazılmış** (hedef
     seviyenin kapsam ve cümle uzunluğu eşiklerini TUTTURMASI beklenir,
     tutmazsa reddedilir). Ama eşikler İngilizce için kalibre edilmiş;
     `generate_stories_multi.py`'nin kendi docstring'i diğer diller
     için hâlâ "PİLOT doğrulayıcı, off-list toleransı İngilizce'den
     gevşek" diyor.
- **Değerlendirme:** **En yüksek getirili seçenek**, çünkü A2-B1 rafını
  gerçekten dolduran tek yol bu ve mimari (is_adaptation) zaten var.

#### (c) Kısa öykü / masal odaklı seçim

Roman yerine 2.000-6.000 kelimelik kısa öykü ve halk masalı seç.

- **Maliyet:** ~0 ek üretim; iş **seçim kriteri** yazmak
  (`word_count` üst sınırı + `content_type` filtresi).
- **Süre:** dil başına 1 gün (havuzu tarayıp kısa eserleri ayıklamak).
- **Risk:** Düşük. Tek sorun **hacim**: Gutenberg'de kısa öykü
  derlemeleri tek bir kitap olarak duruyor (30 öykü = 1 `.txt`), yani
  derlemeyi öykülere bölmek gerekiyor — mevcut `publish_classics.py`
  zaten "her ~1500 kelimede bir paragraf sınırında böl" diyen **kaba
  bir bölücü** kullanıyor, gerçek öykü sınırlarını bilmiyor.
- **Değerlendirme:** **En iyi maliyet/fayda oranı.** Seviyeyi tam
  çözmez (kısa ≠ kolay; Maupassant kısa ama B2+) ama okuma seansını
  20 dakikaya indirir ve bu tek başına büyük bir ulaşılabilirlik kazancı.

### 3.2 Öneri: hibrit, dile göre

| Dil    | Strateji                                                                 | Gerekçe                                                                   |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| fr     | **(a) + (c)** önce, sonra (b)                                            | 3.682'lik havuz kısa öykü seçimine fazlasıyla yeter (Maupassant, Daudet)  |
| es     | **(a) + (c)**                                                            | 801 eser; Latin alfabe, ELELex kelime listesi var                          |
| de     | **(a) + (c)**                                                            | 2.241 eser; Grimm masalları A2-B1'e en yakın kamu malı materyal            |
| it     | **(a) + (c)**                                                            | 1.031 eser; Collodi/Pinokyo, Novelle                                       |
| ru     | **(a)** küçük ölçekte + **(b)**                                          | Wikisource'tan az sayıda eser çıkar; Çehov öyküleri (c) için ideal         |
| ja     | **(c)** birincil                                                         | Aozora'da 10.477 modern-yazı eser var ve çoğu **kısa öykü** — (c) için en uygun dil |
| zh     | **(b)** zorunlu                                                          | Kullanılabilir klasik yok (§1.4); uyarlama veya özgün üretim dışında yol yok |
| tr, ar | **özgün üretim** (mevcut yol)                                            | Kaynak yok (§1.8, §1.9)                                                    |

**Tek cümlelik karar:** fr/es/de/it/ja için **(c) kısa eser seçimi
birinci öncelik** — çünkü maliyeti neredeyse sıfır ve seviyeyi
gerçekten iyileştiriyor. (b) uyarlama ikinci turda, zh ile başlayarak.

---

## 4. Boru hattı — "yeni dil ekleme" kontrol listesi

### 4.1 Önce gerçek: 10 dilin altyapısı ZATEN var

`scripts/generate_stories_multi.py` içindeki `LANGS` tablosu
incelendi. Her dil için `spacy_model`, `use_stanza`, `use_camel`,
kelime listesi CSV'si ve prompt yolu tanımlı:

| Dil | Analiz motoru               | Kelime listesi (`pipeline/data/`)              |
| --- | --------------------------- | ---------------------------------------------- |
| es  | spaCy `es_core_news_sm`     | `elelex-vocabulary-profile-es-1.0.csv`         |
| fr  | spaCy `fr_core_news_sm`     | `flelex-vocabulary-profile-fr-1.0.csv`         |
| de  | spaCy `de_core_news_sm`     | `daflex-vocabulary-profile-de-1.0.csv`         |
| it  | spaCy `it_core_news_sm`     | `kelly-vocabulary-profile-it-1.0.csv`          |
| ru  | spaCy `ru_core_news_sm`     | `kelly-vocabulary-profile-ru-1.0.csv`          |
| zh  | spaCy `zh_core_web_sm`      | `kelly-vocabulary-profile-zh-1.0.csv`          |
| ja  | spaCy `ja_core_news_sm`     | `jlpt-vocabulary-profile-ja-1.0.csv` (+N1-N5)  |
| tr  | **Stanza** (`use_stanza`)   | `wordfreq-vocabulary-profile-tr-1.0.csv`       |
| ar  | **CAMeL** (`use_camel`)     | `kelly-vocabulary-profile-ar-1.0.csv`          |
| en  | spaCy `en_core_web_sm`      | `cefrj-vocabulary-profile-1.5.csv` + Octanove  |

Yani önceki raporun §2'de **önerdiği** `Analyzer` soyutlaması
**yazılmış durumda**: `StanzaNlpAdapter` ve `CamelNlpAdapter`
spaCy'nin `nlp(text) -> doc.sents` arayüzünü taklit ediyor, böylece
`check_story` hangi motorun çalıştığını bilmiyor. Türkçe ve Arapça
için spaCy modeli yokluğu **çözülmüş**.

**Boru hattının dil-özel yerleri (kalan):**
- `use_token_count` bayrağı — zh/ja'da "kelime" sayılamadığı için
  token sayımı farklı (LangConfig'de var).
- CAMeL'e özel bir heuristik (`len(surface) <= 6 and
  surface_counts >= 2`) — Arapça'ya özel bir düzeltme.
- `prompts/generate_story_<level>_<lang>.md` — seviye × dil başına
  ayrı prompt dosyası.
- `cover_multilang.py` — Arapça/CJK font seçimi (önceki raporun §3'te
  önerdiği dil→font eşlemesi).

### 4.2 Yeni bir dil için kontrol listesi

Bu listeyi 11. bir dil eklenirse (ör. pt, pl) veya mevcut bir dilin
**klasikler** rafı açılırken kullan:

**A. Kaynak ve hukuk**
- [ ] Gutendex `?languages=<kod>&author_year_end=1955` sorgusu — havuz
      100'ün altındaysa Gutenberg **birincil kaynak olamaz**.
- [ ] Ulusal/özel arşiv var mı, toplu indirme (dump/API/zip) sunuyor mu?
- [ ] Lisans beyanı **eser bazında** okunabiliyor mu? (Aozora'nın
      `作品著作権フラグ`'ı gibi.) Yoksa kaynak **riskli** sayılır.
- [ ] `author_death_year` her eser için elde edilebiliyor mu?
      Edilemiyorsa o eser **elenir**.
- [ ] Metnin gerçekten o dilde olduğu doğrulanıyor mu? (§2.3 ek kuralı)

**B. Dilbilimsel altyapı**
- [ ] spaCy modeli var mı? (`spacy.io/usage/models` — 24 dil)
      Yoksa Stanza (tr deseni) veya dile-özel araç (ar/CAMeL deseni).
- [ ] Kelime frekans / CEFR listesi bulunabiliyor mu? Kanıtlanmış
      kaynaklar: **CEFRLex ailesi** (FLELex-fr, DAFlex-de, ELELex-es —
      hepsi depoda), **Kelly listesi** (it, ru, zh, ar — depoda),
      **JLPT N1-N5** (ja — depoda), **wordfreq** (tr — depoda, son
      çare). Hiçbiri yoksa wordfreq'ten ilk-N-kelime vekili üretilir.
- [ ] Cümle uzunluğu eşikleri (`config/thresholds.yaml`) o dil için
      kalibre edildi mi? Almanca İngilizce'den uzun, zh/ja'da
      **karakter** cinsinden ölçülmeli.

**C. Metin işleme**
- [ ] Kaynak formatı → düz metin dönüşümü var mı?
      (Gutenberg TXT: doğrudan; Aozora: **zip + Shift-JIS decode +
      ruby ayıklama**; Wikisource: **XML dump + mwparserfromhell**)
- [ ] Yazı sistemi normalizasyonu gerekiyor mu?
      (zh: **OpenCC geleneksel→basitleştirilmiş, ZORUNLU** — §1.4a)
- [ ] Bölüm ayırma: `publish_classics.py` şu an dil-agnostik kaba
      bölme (~1500 kelime) yapıyor. Gerçek bölüm başlıkları
      (`CHAPITRE`, `Kapitel`, `第一章`) için dil-başına regex
      **opsiyonel iyileştirme**, engelleyici değil.

**D. Sunum**
- [ ] `cover_multilang.py`'de font kapsamı — Arapça (`Noto Naskh
      Arabic`/`Amiri`), CJK (`Noto Sans SC`/`Noto Sans JP`). RTL için
      `arabic_reshaper` + `python-bidi`.
- [ ] Uygulama tarafı: `books.target_language` + `languages` tablosu
      (migration 033, ADR-013) — yeni dil oraya eklenmeli.
- [ ] **ADR-008 uyarısı:** cihaz-içi lemmatizer (`tokenizer.js`)
      yalnızca İngilizce. ru/zh/ja/ar/tr hedef dil olduğunda
      `book_surface_lemmas` sunucu tarafı sözlüğü **zorunlu** —
      ADR-013'ün kendisi de bunu söylüyor.

### 4.3 Dil-bağımsız vs dile-özgü adımlar

| Adım                       | Durum         | Not                                              |
| -------------------------- | ------------- | ------------------------------------------------ |
| Gutendex sorgu + indirme   | Dil-bağımsız  | `fetch_gutenberg.py --lang <kod>` çalışıyor      |
| Gutenberg boilerplate kırpma | Dil-bağımsız | `*** START/END OF ***` işaretçileri evrensel     |
| Bölüm/paragraf/cümle bölme | **Yarı**      | Paragraf evrensel; cümle bölme ar'da özel regex  |
| Tokenize + lemma + POS     | **Dile özgü** | Adaptör deseniyle soyutlanmış (§4.1)             |
| Seviye tahmini (%90 kapsam)| Dil-bağımsız  | Kelime listesi parametre                          |
| `validate_author_death_year` | Dil-bağımsız | Telif kontrolü                                   |
| Kapak üretimi              | **Yarı**      | Mantık aynı, font dile göre                       |
| Ses (TTS)                  | **Dile özgü** | Kapsam dışı — bkz. 09-13 raporu §4.1, çözülmedi  |

---

## 5. Öncelik ve maliyet

### 5.1 Öncelik sırası

Önceki raporun sırası (fr → es → de → it → ru → ja → zh → tr → ar)
**değişmiyor**, ama bu oturumun bulgularıyla iki düzeltme var:

1. **fr/es/de/it artık tek grup ve ilk aşama.** Dördü de: Latin
   alfabe + spaCy modeli + CEFRLex/Kelly kelime listesi + **30'ar kitap
   zaten indirilmiş**. Aralarında sıra gözetmek için sebep yok; hepsi
   aynı kod yolunu kullanıyor.
2. **zh, ru'nun ardından değil, ar/tr ile birlikte en sona.** Önceki
   rapor zh'yi 7. sıraya koyuyordu çünkü 202 kitaplık bir Gutenberg
   tabanı vardı. §1.4 o tabanın **kullanılamaz** olduğunu ölçtü — yani
   zh artık ar/tr ile aynı kategoride: "klasik yok, üretim zorunlu".

**Düzeltilmiş sıra:**

| Aşama | Diller          | İçerik durumu                              |
| ----- | --------------- | ------------------------------------------ |
| **1** | fr, es, de, it  | ✅ 120 kitap diskte, eleme+yayınlama kaldı |
| **2** | ja              | Aozora: 10.477 uygun eser, parser gerek    |
| **3** | ru              | Wikisource dump, yeni kod yolu             |
| **4** | zh, tr, ar      | Klasik yok → uyarlama/özgün üretim         |

### 5.2 Pazar büyüklüğü faktörü

Bu boyutu **doğrulanmış veriyle dolduramadım** — dil başına öğrenici
sayısı veya App Store pazar büyüklüğü için bu oturumda güvenilir bir
kaynağa erişilemedi. Uydurma rakam yazmamak için **doğrulanmadı**
diye bırakıyorum. Yine de kaynak bulunabilirliği ile pazar arasında
belirgin bir çelişki **yok**: es/fr/de/it hem en büyük Avrupa dilleri
hem de en zengin kamu malı havuzları. Ters düşen tek dil **zh** —
büyük pazar, kullanılamaz kaynak. Bu, zh'nin uyarlama/üretim
maliyetine katlanmayı haklı çıkarabilir, ama bu bir **iş kararı**,
teknik bir bulgu değil.

### 5.3 İş yükü tahminleri

**Neye dayanıyor:** (i) depodaki kodun mevcut durumu (§4.1 — 10 dilin
NLP ve kelime listesi işi bitmiş), (ii) §1.1'deki indirilmiş korpus,
(iii) mevcut `generate_stories_multi.py`'nin bilinen üretim davranışı
(kapalı döngü, 2-3 tur), (iv) 09-13 raporunun doğrulanmış Claude API
fiyatları (Sonnet 5: $2/$10 per MTok, batch ile yarı fiyat).

| Aşama | Dil(ler)   | İş                                                                | Gün (tahmin) | $ (tahmin)   |
| ----- | ---------- | ----------------------------------------------------------------- | -----------: | -----------: |
| 1a    | fr,es,de,it| 120 kitabın seviye tahmini + `needs_review` yayını + gözden geçirme |          2-3 |           ~0 |
| 1b    | fr,es,de,it| Kısa eser (c) seçimi: her dilden 20-40 kısa eser indir+yayınla      |          3-4 |           ~0 |
| 1c    | fr,es,de,it| Kapak fontu doğrulama (Latin — muhtemelen sorunsuz)                |          0,5 |           ~0 |
| **1** | **toplam** |                                                                    |      **6-8** |       **~0** |
| 2     | ja         | Aozora indirici + Shift-JIS decode + ruby parser + 30-60 eser       |          4-6 |           ~0 |
| 2b    | ja         | `Noto Sans JP` kapak fontu                                          |          0,5 |           ~0 |
| 3     | ru         | Wikisource dump indirici + `mwparserfromhell` + eser birleştirme    |          5-8 |           ~0 |
| 4a    | zh         | OpenCC + Minguo dönemi elle seçki (10-20 eser)                      |          3-4 |           ~0 |
| 4b    | zh         | A2-B1 uyarlama üretimi (~20 eser × $3-8)                            |          3-5 |    $60-160   |
| 4c    | tr, ar     | Özgün üretim devamı (mevcut yol, yeni iş yok)                       |            — |            — |
| 4d    | ar         | `Noto Naskh Arabic` + `arabic_reshaper`/`python-bidi` kapak         |            1 |           ~0 |
| —     | 4 dil × 3 seviye | (b) uyarlama, fr/es/de/it için 2. tur — ~60 eser            |         6-10 |   $180-480   |

**Özet:**
- **Minimum uygulanabilir (Aşama 1 yalnız): 6-8 gün, ~$0.** 120+ gerçek
  klasik 4 dilde yayına girer. Bugün sıfır olan bir raf dolar.
- **Aşama 1+2+3 (fr,es,de,it,ru,ja): ~16-23 gün, ~$0.** 6 dilde gerçek
  klasik rafı. API maliyeti yok çünkü hepsi indirme+işleme.
- **Tam kapsam (9 dil, uyarlamalar dâhil): ~8-12 hafta, $250-650 API.**

**Neden bu, 09-13 raporunun "$15-18k / 9-14 ay" Senaryo B'sinden çok
düşük:** o senaryo **11 dilde sıfırdan içerik üretmeyi + TTS'i**
kapsıyordu. Bu rapor yalnızca **klasik/kamu malı kitap rafını**
kapsıyor; hikâye üretimi zaten yapılmış (310 özgün hikâye, 10 dil) ve
**ses tamamen kapsam dışı** — ADR-012'nin çok dilli TTS sorunu (09-13
§4.1) **hâlâ çözülmemiş ve bu raporda da çözülmedi.**

---

## 6. Somut sonraki adımlar (öncelik sırasıyla)

1. **`publish_classics.py --lang fr` çalıştır, 30 kitabı
   `needs_review` ile yayınla, çıktıyı gözden geçir.** Kod hazır,
   içerik diskte. Bu tek komut "0 klasik" durumunu bitiriyor.
   Ardından es/de/it.
2. **`publish_classics.py`'ye dil doğrulaması ekle** (§2.3) — Gutenberg
   `languages=zh` altında İngilizce kitap döndürdüğü kanıtlandı.
3. **zh korpusunu yayınlama.** 20 kitabın 18'i geleneksel + pre-modern;
   ikisinde `author_death_year` yok. `classics_zh/` **elden geçirilene
   kadar dokunulmamalı**.
4. **`classics_ru/` (2 kitap) sil veya yok say** — ikisi de edebiyat
   değil.
5. **Aozora indiricisi yaz.** Resmî CSV (17.840 eser) → `作品著作権
   フラグ=なし` + `新字新仮名` filtresi → 10.477 havuz → zip indir →
   Shift-JIS decode → ruby ayıkla. **Bu tek betik Japonca rafını
   tek başına açıyor.**
6. **Aozora `kijyunn.html` sayfasını oku** — "izinli ama telifli"
   eserlerin `なし` bayrağına girip girmediği netleşmeli (§1.7, kalan
   tek Japonca riski).
7. **Kısa eser seçim kriteri ekle** (`--max-words`) — §3.1(c), en iyi
   maliyet/fayda oranlı seviye iyileştirmesi.
8. **Uyarlama boru hattını `is_adaptation=True` üzerine kur** — mimari
   hazır, eşiklerin dil başına kalibrasyonu gerekiyor.

---

## Ek A — Bu oturumda doğrudan doğrulanan uç noktalar

| URL / komut                                                                 | Sonuç                                        |
| --------------------------------------------------------------------------- | -------------------------------------------- |
| `gutendex.com/books/?languages=<9 dil>&author_year_end=1955`                | **200**, sayılar §1.2                        |
| `aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip`                 | **200**, 2.092.746 bayt, 19.502 satır ayrıştırıldı |
| `aozora.gr.jp/index_pages/index_top.html`                                   | 200                                          |
| `aozora.gr.jp/guide/kijyunn.html`                                          | 200 (içerik okunmadı)                        |
| `github.com/aozorahack/aozorabunko_text`                                   | **200** — yeni canlı mirror                  |
| `github.com/aozorabunko/aozorabunko`                                       | **404** (önceki raporla aynı)                |
| `<9 dil>.wikisource.org/w/api.php?...siprop=statistics`                    | **200**, sayılar §1.10                       |
| `uk.wikisource.org/w/api.php?...`                                          | **rate limit hatası**                        |
| `dumps.wikimedia.org/ruwikisource/latest/` → `...pages-articles.xml.bz2`    | **200**, dosya mevcut                        |
| `liberliber.it` → `/autori/autori-<a-z,0-9>/`                              | **200**, katalog yolu bulundu                |
| `liberliber.it/online/opere/`                                              | 403                                          |
| `hindawi.org/books/` → `safahat.org/books/`                                | **301 → 403**                                |
| `cervantesvirtual.com`                                                     | **403**                                      |
| `bdh.bne.es`                                                               | **403**                                      |
| `gallica.bnf.fr`                                                           | **000 (bağlanamadı)**                        |
| `ekitap.ktb.gov.tr`                                                        | **000** (iki oturumdur)                      |
| `standardebooks.org/ebooks`                                                | 200, ~1.500 eser, CC0                        |
| `ilibrary.ru`, `rvb.ru`                                                    | 200 (lisans doğrulanmadı)                    |

## Ek B — Hâlâ açık sorular

1. **Aozora "izinli ama telifli" kategorisi** — `kijyunn.html`
   okunmalı (§1.7). **Yayına çıkmadan kapatılmalı.**
2. **Wikisource tr içerik dağılımı** — 20.025 makalenin kaçı düzyazı
   edebiyat? Örneklenmedi.
3. **Wikisource sayfa→eser birleştirme** — `Index:`/`Page:` yapısını
   takip eden kodun karmaşıklığı ölçülmedi; ru aşamasının gerçek
   maliyeti buna bağlı.
4. **Pazar büyüklüğü verisi** (§5.2) — dil başına öğrenici/gelir
   verisi bulunamadı.
5. **Çok dilli TTS** — 09-13 raporunun 1 numaralı riski (Neural2 +
   SSML `<mark>` kapsamı), **bu raporda da ele alınmadı**, hâlâ açık.
6. **`thresholds.yaml` dil başına kalibrasyon** — mevcut eşikler
   İngilizce için; diğer diller "pilot" modda çalışıyor.
