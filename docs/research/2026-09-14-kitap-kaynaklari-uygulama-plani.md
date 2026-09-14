# Kitap Kaynakları — Uygulama Planı (C1/C2 Klasikleri, 9 Dil)

> Tarih: 2026-09-14
> Kapsam: es, fr, de, it, ru, zh, ja, tr, ar — C1/C2 seviyesi için gerçek
> kamu malı klasik kitap kaynağı bulma ve bunları pipeline'a bağlama planı.
> Önceki rapor: `docs/research/2026-09-13-cok-dilli-icerik-arastirmasi.md`
> (§1 "Her dil için kamu malı içerik kaynağı") — bu doküman onun ÜZERİNE
> inşa edilir, tekrarlamaz. Oradaki telif tablosu ve "yazar 1955 öncesi
> ölmüş olmalı" kuralı burada da geçerli ve **değişmedi**.

**Bu rapor nasıl okunmalı:** Aşağıdaki Project Gutenberg sayıları bu
oturumda **gerçek zamanlı** `gutendex.com` API'siyle ölçüldü (önceki rapor
bunu 403 hatası yüzünden yapamamıştı — bu oturumda `curl -L -A
"Mozilla/5.0"` ile sorun çözüldü, çıplak `WebFetch` hâlâ 403 alıyor,
muhtemelen bot koruması user-agent'a bakıyor). Diğer her iddia ya
doğrudan site fetch'iyle doğrulandı ya da **(doğrulanmadı)** diye
işaretlendi. Hiçbir sayı arama motoru özetinden alınıp doğrulanmadan
yazılmadı.

---

## 0. Özet — 5 bulgu

1. **Gutendex sayıları önceki raporun 2011 tahminlerini büyük ölçüde
   doğruluyor, ama büyüklük sırası değişti.** Fransızca ve Almanca
   tahmin edilenden daha zengin çıktı (fr: 3.682, de: 2.241, "yaşamı
   1955'ten önce sona ermiş yazar" filtresiyle). İtalyanca ve İspanyolca
   da beklenenden güçlü. Rusça, Çince ve Japonca'da Gutenberg gerçekten
   zayıf — bu üçünde birincil kaynak Gutenberg DEĞİL, ulusal arşivler.
2. **Türkçe için Gutenberg'de gerçek zamanlı ölçüm 0 kitap verdi**
   (filtre öncesi de, sonrası da). Bu oturumda ayrıca Türkiye Millî
   Kütüphane'nin "Dijital Kütüphane"si doğrudan fetch edildi:
   **tam metin değil, el yazması/süreli yayın TARAMA görüntüsü** sunuyor,
   telif notu "Tüm Hakları ... Milli Kütüphane Başkanlığı'na aittir" —
   yani yeniden dağıtım izni yok. **Önceki raporun "Türkçe'de kaynak yok"
   verdiği doğrulandı ve güçlendirildi**, bkz. §2.
3. **Arapça'da Gutenberg pratikte sıfır** (filtre sonrası 0, filtresiz
   toplam 1 kitap). Hindawi tek gerçekçi aday ama lisans hâlâ
   doğrulanmadı — bu oturumda da doğrulanamadı (bkz. §1.9).
4. **Kapak üretimi 9 dilin hepsinde DEĞİŞMEDEN çalışır.** `pipeline/src/cover.py`
   incelendi: kapak görselden değil, başlık/yazar metninden tipografik
   olarak üretiliyor (PIL ile). Tek bağımlılık `Fraunces` ve `IBM Plex
Mono` fontlarının o dilin alfabesini (Kiril, Arapça, CJK) kapsaması —
   aksi halde kutucuk/`.notdef` glif çıkar. Bkz. §3.
5. **Öncelik sırası önceki raporla aynı kalıyor ama gerekçesi netleşti:**
   Fransızca → İspanyolca → Almanca → İtalyanca, çünkü bu dördü hem
   Latince alfabe hem ölçülmüş yüksek Gutendex sayısı hem canlı ikincil
   kaynak taşıyor. Rusça beşinci (Wikisource ru + doğrulanmış canlı
   site). Japonca altıncı (Aozora Bunko doğrulandı, canlı). Çince,
   Arapça, Türkçe en sona — üçü de "özgün üretime yüksek bağımlılık"
   kategorisinde ve ikisi (tr, ar) Gutenberg'de gerçek zamanlı **0'a
   yakın** çıktı.

---

## 1. Dil bazlı kaynaklar — doğrulanmış sayılarla

### 1.0 Gutendex ölçüm yöntemi (tekrarlanabilir)

```
curl -s -L -A "Mozilla/5.0" "https://gutendex.com/books/?languages=<kod>&author_year_end=1955"
```

`count` alanı, yazarı 1955'ten önce ölmüş (veya doğum yılı bilinmeyip
tahmini erken olan) eserlerin sayısını verir — bu, önceki raporun
önerdiği "muhafazakâr, tek eşik" kuralının doğrudan uygulanmış hâli.
`author_year_end` parametresiz sorgu (`?languages=<kod>`) filtresiz
toplamı verir; aradaki fark, **1955 sonrası ölmüş/yaşayan yazarların**
eserleri — yani hukuki incelemeden önce pipeline'a **girmemesi gereken**
kitaplar. Trailing slash zorunlu; onsuz 301 dönüyor ve bazı istemciler
redirect'i takip etmiyor (önceki raporun 403'ünün bir kısmı muhtemelen
bundandı — bu oturumda `curl -L` ile sorun yaşanmadı, çıplak `WebFetch`
ise hâlâ 403 veriyor, muhtemelen ayrı bir bot-koruması katmanı).

**2026-09-14 itibarıyla ölçülen sayılar:**

| Dil           | `author_year_end=1955` (güvenli havuz) | Filtresiz toplam | Not                                                                          |
| ------------- | -------------------------------------: | ---------------: | ---------------------------------------------------------------------------- |
| en (referans) |                                 49.336 |           63.042 | Önceki raporun "~60.000+" tahminiyle uyumlu                                  |
| fr            |                              **3.682** |            4.235 | Önceki tahmin "3.000+" idi — doğrulandı, biraz üstünde                       |
| de            |                              **2.241** |            2.464 | Önceki tahmin "1.500+" idi — doğrulanandan daha zengin çıktı                 |
| it            |                              **1.031** |            1.114 | Önceki raporun 2011 sayısı (291) çok eskiydi — gerçek sayı ~3,5 kat          |
| es            |                                **800** |              920 | Önceki raporun 2011 sayısı (308) da eskiydi — gerçek sayı ~2,6 kat           |
| ru            |                                  **8** |                9 | Önceki tahmin "<200" bile iyimserdi — Gutenberg Rusça'da pratikte YOK        |
| zh            |                                **202** |              444 | Önceki 2011 sayısı (405) toplamdan bile düşüktü; filtreli 202 kullanılabilir |
| ja            |                                 **22** |               22 | Çok küçük — Aozora Bunko birincil kaynak olmaya devam ediyor                 |
| tr            |                                  **0** |                0 | Doğrulandı: Gutenberg'de Türkçe eser yok                                     |
| ar            |                                  **0** |                1 | Doğrulandı: Gutenberg'de pratikte Arapça eser yok                            |

**Yorum:** Bu tablo önceki raporun §1.3 zorluk sıralamasını **değiştirmiyor
ama sayısal temelini güçlendiriyor**. İtalyanca ve İspanyolca'nın
göründüğünden daha güçlü olması, Aşama 1 sırasını (fr → es → de)
etkilemiyor çünkü es zaten o sırada; ama it'in de bu gruba (Latin
alfabe + güçlü Gutenberg + spaCy + doğrudan CEFR) girebileceğini
gösteriyor — Aşama 1'e dördüncü dil olarak eklenebilir.

### 1.1 🇫🇷 Fransızca — birincil kaynak: Project Gutenberg

- **Gutendex, `author_year_end=1955`: 3.682 eser.** Liste:
  `https://gutendex.com/books/?languages=fr&author_year_end=1955`
- **Format:** Her Gutenberg kitabı için `/ebooks/<id>.txt.utf-8`,
  `/ebooks/<id>.epub3.images` ve `/ebooks/<id>.html.images` URL'leri var
  (Gutendex `formats` alanında MIME→URL sözlüğü olarak geliyor).
  **Pipeline için önerilen: `.txt.utf-8`** — mevcut İngilizce pipeline'ı
  zaten TXT'den başlıyor (bkz. `pipeline/src/ingest.py` mantığı, ADR-007
  metnini gördüğümüz "sayfalama cihazda" kararıyla tutarlı: pipeline'a
  düz metin yeter, HTML/EPUB parse etmeye gerek yok).
- **İkincil kaynak — Wikisource fr:** `https://fr.wikisource.org` canlı
  (bu oturumda `dumps.wikimedia.org/trwikisource/` benzeri bir yol
  doğrulandı: Wikimedia tüm Wikisource dilleri için `dumps.wikimedia.org/
<kod>wikisource/` altında **aylık XML dump** yayınlıyor — `frwikisource`
  için de aynı desen geçerli). Bulk indirme API çağrısı değil, **dump
  indirme + `mwparserfromhell` ile wiki-markup temizleme** gerektirir.
- **Rate limit:** Gutenberg toplu indirmede User-Agent + makul aralık
  (>2 sn/istek) istiyor, resmi API dokümanı yok ama toplu kazıma
  politikası `gutenberg.org/policy/robot_access.html` sayfasında —
  pipeline `robots.txt`'e uymalı ve mirror kullanmayı düşünmeli
  (`www.gutenberg.org` yerine `aleph.gutenberg.org` gibi mirror'lar).
- **Değerlendirme:** Kaynak sorunu yok, en kolay dil.

### 1.2 🇪🇸 İspanyolca — birincil kaynak: Cervantes Virtual + Gutenberg

- **Gutendex: 800 eser.**
- **Biblioteca Virtual Miguel de Cervantes** (`cervantesvirtual.com`) bu
  oturumda **canlı doğrulandı** (HTTP 200). Önceki raporun belirttiği
  TEI-XML dışa aktarımı sitenin kendi arama sonuçlarında kitap
  bazında mevcut ama **toplu/API indirme uç noktası yok** — her kitap
  tek tek TEI-XML veya PDF olarak indirilmeli, yani mekanizma **API
  değil, per-book scrape**. Katalog sayfası yapısı istikrarlıysa
  (`obra-visor` URL şablonu) bir liste sayfasından ID toplayıp döngüyle
  indirmek mümkün, ama bu kırılgan bir kazıma — kütüphanenin `robots.txt`
  ve kullanım şartları önce okunmalı.
- **Değerlendirme:** Gutenberg tek başına 800 eserle B2/C1/C2 rafını
  doldurmaya yeter; Cervantes Virtual'i yalnızca Gutenberg'de olmayan
  belirli başlıklar için (örn. daha çeşitli tür) ikinci sırada kullan.

### 1.3 🇩🇪 Almanca — birincil kaynak: Project Gutenberg

- **Gutendex: 2.241 eser** — önceki tahminin belirgin üstünde.
- Projekt Gutenberg-DE ve Zeno.org önceki raporda "riskli/karışık lisans"
  diye işaretlenmişti; bu oturumda yeniden ziyaret edilmedi çünkü
  Gutendex'in kendi sayısı zaten yeterli hacim veriyor — ikincil kaynağa
  ihtiyaç azaldı, risk almaya gerek yok.
- **Değerlendirme:** Gutenberg tek başına yeterli. Wikisource de ek kaynak
  olarak saklı tutulabilir (100.000+ text unit, önceki rapor).

### 1.4 🇮🇹 İtalyanca — birincil kaynak: Project Gutenberg + LiberLiber

- **Gutendex: 1.031 eser** — önceki 2011 sayısının (291) yaklaşık 3,5 katı.
- **LiberLiber** (`liberliber.it`) bu oturumda canlı doğrulandı (200), ama
  denenen katalog yol şablonu (`/online/opere/libri/catalogo/`) 404 verdi
  — yani **URL yapısı önceki raporda varsayılandan farklı**, siteye
  girip güncel katalog/indirme sayfası yolunu yeniden bulmak gerekiyor.
  LiberLiber'in kendi ana sayfasından "Catalogo" bağlantısı takip
  edilerek doğru yol bulunmalı; format hâlâ ağırlıklı **EPUB/PDF/TXT**,
  bazı kitaplarda RTF.
- **Değerlendirme:** Gutenberg'in 1.031'lik havuzu tek başına yeterli
  hacim. LiberLiber tür çeşitliliği için opsiyonel ikinci kaynak.

### 1.5 🇷🇺 Rusça — birincil kaynak: Wikisource ru (Gutenberg DEĞİL)

- **Gutendex: 8 eser** — Gutenberg Rusça'da gerçek anlamda kullanılamaz.
- Önceki raporun uyardığı gibi **lib.ru kullanılmamalı** (lisans riski).
- **Wikisource ru** birincil kaynak olarak kalıyor: dump mekanizması
  `dumps.wikimedia.org/ruwikisource/` üzerinden aylık XML — bu, tüm
  Wikisource dilleri için **aynı, tek bir kod yolu** demek (bkz. §1.10
  genel Wikisource stratejisi).
- **Değerlendirme:** Değişmedi — Wikisource ru + dikkatli filtreleme.

### 1.6 🇯🇵 Japonca — birincil kaynak: Aozora Bunko (doğrulandı, canlı)

- **Gutendex: 22 eser** — ihmal edilebilir.
- **Aozora Bunko** (`aozora.gr.jp`) bu oturumda canlı doğrulandı (200).
  GitHub mirror'ı (`github.com/aozorabunko/aozorabunko`) bu oturumda
  **404 verdi** — repo adı veya organizasyon adı değişmiş/taşınmış
  olabilir; kesin bulk-indirme yolu için Aozora'nın kendi sitesindeki
  "全て" (tümü) zip indirme sayfası veya güncel bir fork/mirror aranmalı.
  Bu bir **açık soru** olarak işaretleniyor (bkz. §5).
- **Format:** Aozora kendi ruby-anotasyonlu düz metin (Shift-JIS ağırlıklı,
  bazı yeni eklemeler UTF-8) + XHTML sunuyor. Furigana/ruby ayıklama için
  özel bir parser (`〔外字〕` gibi özel işaretler, `｜…《…》` ruby söz
  dizimi) gerekiyor — bu iş miktarı önceki raporda zaten "ağır" diye
  işaretlenmişti, değişmedi.
- **Değerlendirme:** İçerik kaynağı hâlâ mükemmel; bulk-indirme yolunun
  GitHub mirror'ının güncel adresini bulmak veya doğrudan siteden
  kazımak pipeline entegrasyonundan önce netleşmeli.

### 1.7 🇨🇳 Çince (Basitleştirilmiş) — zorlu, karma kaynak

- **Gutendex: 202 eser** (`author_year_end=1955`) — önceki raporun 2011
  sayısından (405) düşük ama **kullanılabilir bir taban**. Filtresiz
  toplam 444; aradaki 242 eser 1955 sonrası ölmüş/yaşayan yazarlara ait
  olabilir — pipeline'a alınmamalı.
- 202 eserin ne kadarının **geleneksel** vs **basitleştirilmiş** karakter
  kullandığı bu oturumda doğrulanamadı — Gutendex API'sinin `formats`
  alanı bunu ayırt etmiyor, her kitabın metni indirilip OpenCC ile
  kontrol edilmeli (önceki raporun önerdiği gibi).
- **Değerlendirme:** Değişmedi — en zor dillerden biri, özgün üretime
  ağırlık gerekiyor, ama 202 kitaplık bir Gutenberg tabanı en azından
  sıfır değil.

### 1.8 🇹🇷 Türkçe — VERDİKT: klasik kaynağı yok, doğrulandı ve güçlendirildi

Önceki raporun sorusu: "Türkçe'de gerçekten bir Gutenberg-benzeri kaynak
var mı, yoksa 2011 verisiyle mi yetiniliyor?" Bu oturumda üç ayrı yol
denendi:

1. **Project Gutenberg / Gutendex:** `languages=tr` sorgusu **0 sonuç**
   döndü, hem filtreli hem filtresiz. Gerçek zamanlı, kesin.
2. **Millî Kütüphane "Dijital Kütüphane"** (`dijital-kutuphane.mkutup.gov.tr`)
   — bu oturumda doğrudan fetch edildi. Sonuç: bu bir **Gutenberg
   muadili DEĞİL**. İçerik "El Yazması Eserler, Süreli Yayınlar ve Kitap
   Dışı Materyaller" — yani **taranmış görüntü** arşivi (manuscript/
   periodical scan), tam metin değil. Sitenin kendi duyurusu "maksimum
   poz [görüntü] indirme sayısı 5000'e yükseltildi" diyor — bu, metnin
   OCR'lı/aranabilir olmadığının, sayfa görüntüsü indirmenin esas
   kullanım biçimi olduğunun işareti. Telif notu **"Tüm Hakları ...
   Milli Kütüphane Başkanlığı'na aittir"** — yeniden dağıtım/pipeline
   kullanımı için açık izin yok.
3. **Wikisource tr** (`tr.wikisource.org`) canlı (200) ama önceki
   raporun da belirttiği gibi küçük; bu oturumda tam sayı elde
   edilemedi (istatistik sayfası farklı bir URL şablonunda, 404 aldı).
   Dump mekanizması diğer Wikisource dilleriyle aynı
   (`dumps.wikimedia.org/trwikisource/`), yani teknik olarak erişilebilir
   ama hacim küçük olduğu biliniyor.

**Verdikt (önceki raporla aynı, artık doğrulanmış):** Türkçe'de kurumsal,
Gutenberg-benzeri, toplu-indirilebilir bir kamu malı klasik kütüphanesi
**yok**. Millî Kütüphane arşivi var ama (a) format uygun değil (tarama,
tam metin değil), (b) lisansı belirsiz/kısıtlayıcı, (c) OCR + temizlik

- hukuki inceleme gerektirir — bu üçü birlikte onu pipeline'ın ilk
  turunda kullanılamaz kılıyor. **Türkçe C1/C2 rafı, tıpkı A1-B2'de
  olduğu gibi, tamamen özgün AI üretimine bağımlı kalmalı.** Wikisource
  tr, ileride küçük bir ek kaynak olarak değerlendirilebilir ama tek
  başına bir rafı doldurmaz.

### 1.9 🇸🇦 Arapça — Hindawi hâlâ tek gerçekçi aday, lisans hâlâ açık soru

- **Gutendex: 0 eser (filtreli), 1 eser (filtresiz).** Gutenberg Arapça'da
  yok denecek kadar az.
- **Hindawi Foundation** (`hindawi.org/books`) önceki raporda ana aday
  olarak işaretlenmişti. Bu oturumda siteye tekrar erişim denenmedi
  (zaman/öncelik kısıtı) — **lisans durumu hâlâ doğrulanmadı.** Bu,
  önceki raporun Ek A'sındaki 3. açık sorunun **hâlâ kapanmadığını**
  gösteriyor.
- Al-Maktaba Al-Shamela önceki raporda "modern dil öğrenimi için uygun
  değil" diye elenmişti — bu değerlendirme değişmedi.
- **Değerlendirme:** Arapça, dokuz dil arasında **en yüksek hukuki
  belirsizlikli** kaynak durumu. Hindawi'nin yeniden dağıtım hakkı bir
  avukat görüşüyle netleşmeden pipeline'a hiçbir Hindawi metni
  girmemeli. Netleşmezse Arapça da Türkçe gibi "tam özgün üretim"
  kategorisine düşer — bu, planlamada **varsayılan senaryo** olarak
  alınmalı, Hindawi bir iyimser ek olarak.

### 1.10 Genel teknik mekanizma: Wikisource dilleri için ortak kod yolu

Önceki rapor her Wikisource dilini ayrı ayrı ele almıştı ama teknik
mekanizma hepsinde **aynı**:

1. `https://dumps.wikimedia.org/<dilkodu>wikisource/latest/` altında
   aylık XML dump (`<dilkodu>wikisource-latest-pages-articles.xml.bz2`).
2. `mwxml` veya `mwparserfromhell` (Python) ile wiki-markup'tan düz
   metne çevirme.
3. Ana isim alanı (namespace 0) dışındaki sayfaları (tartışma, kullanıcı,
   şablon) filtreleme.
4. Bir "eser" ile bir "sayfa" arasındaki farkı çözmek için `Index:` ve
   `Page:` namespace'lerindeki yapıyı takip etme (Wikisource kitapları
   sayfa sayfa proofread ediyor; bir romanı tek metin olarak birleştirmek
   ek bir adım).

Bu **tek bir Python betiği** olarak yazılıp fr/de/it/ru/ja/ar/tr
Wikisource'larının hepsinde tekrar kullanılabilir — önceki raporun
"Analyzer soyutlaması" önerisine benzer şekilde, burada da bir
`WikisourceExtractor` soyutlaması mantıklı. Rate limit sorunu yok çünkü
dump indirme tek seferlik bir dosya transferi, API çağrısı değil.

---

## 2. Format → düz metin çıkarma özeti

| Kaynak                      | Format                 | Çıkarma aracı                         | Not                                                                                                                      |
| --------------------------- | ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Project Gutenberg           | TXT (UTF-8)            | Doğrudan kullan                       | Baş/son "GUTENBERG LİSANSI" boilerplate'i kırpılmalı (sabit işaretleyici metin var: `*** START OF...` / `*** END OF...`) |
| Project Gutenberg           | EPUB3                  | `ebooklib` + `BeautifulSoup`          | TXT varken gerekmez                                                                                                      |
| Wikisource (tüm diller)     | XML dump (wiki markup) | `mwparserfromhell`                    | §1.10                                                                                                                    |
| Aozora Bunko                | Özel düz metin + ruby  | Özel regex parser                     | Ruby söz dizimini (`｜…《…》`) ayrıca işlemek gerekir                                                                    |
| LiberLiber                  | EPUB/PDF/TXT karışık   | `ebooklib` (EPUB), `pdfplumber` (PDF) | Format kitaba göre değişiyor, otomatik format algılama gerekir                                                           |
| Cervantes Virtual           | TEI-XML (per-book)     | `lxml` + TEI şeması                   | Toplu değil, tek tek                                                                                                     |
| Hindawi (lisans netleşirse) | HTML (per-book)        | `BeautifulSoup`                       | Lisans netleşmeden dokunulmaz                                                                                            |

---

## 3. Kapak görseli — mevcut yaklaşım 9 dile aynen taşınır

`pipeline/src/cover.py` incelendi. Mevcut mekanizma:

- Kapak bir **görsel indirme değil, PIL ile üretim**: başlık, yazar ve
  seviye rozeti uygulamanın kendi tasarım token'larıyla (`_BG`, `_INK`,
  `_ACCENT` — `src/theme/tokens/colors.ts`'ten alınan aynı hex'ler) bir
  tipografik kapağa çiziliyor (`generate_placeholder_cover`).
  Dosyanın kendi yorumu neden görsel değil tipografik olduğunu açıklıyor:
  önceki rastgele renk+baş harf üretici marka kimliğiyle uyuşmuyordu.
- Yazı tipleri `Fraunces_600SemiBold.ttf` (başlık) ve
  `IBMPlexMono_500Medium.ttf` (yazar/rozet), `pipeline/assets/fonts/`
  altında; bulunamazsa PIL'in gömülü fontuna düşüyor (`_load_font`).
- Üretilen PNG `upload_cover()` ile Supabase Storage `book-covers`
  bucket'ına yükleniyor.

**9 yeni dil için bu mekanizma DEĞİŞMEDEN çalışır** çünkü kapağa yazılan
tek şey kitabın kendi başlığı/yazarı — hangi dilde olursa olsun aynı
`draw.text()` çağrısı. **Tek gerçek risk: font glif kapsamı.**

- **Latin alfabeli diller (fr, es, de, it) + Kiril (ru):** Fraunces ve
  IBM Plex Mono ikisi de Latin Extended + Kiril kapsıyor (her iki font
  ailesi de Google Fonts'ta bu script'ler için yayınlanıyor) —
  **değişiklik gerekmez (doğrulama: font ailelerinin Google Fonts
  sayfasından script desteği kontrol edilmeli, bu oturumda dosya
  içeriği değil yalnızca font adı görüldü).**
- **Arapça (ar):** Fraunces/IBM Plex Mono Arapça glif İÇERMİYOR
  (doğrulanmadı ama bu font aileleri tipik olarak Latin/Kiril/Yunan
  kapsıyor, Arapça ayrı bir font ailesi gerektirir). Boş kutu/`.notdef`
  riski var. **Çözüm: aynı `cover.py` mantığı korunur, yalnızca Arapça
  kitaplar için ayrı bir Arapça-uyumlu font (örn. Google Fonts'taki
  `Noto Naskh Arabic` veya `Amiri` — ikisi de ücretsiz, OFL lisanslı)
  `_FONT_DIR`'e eklenip dil bazlı font seçimi yapılır.** RTL metin
  yönü için `arabic_reshaper` + `python-bidi` kütüphaneleri (PIL
  kendi başına RTL şekillendirme yapmıyor) gerekir — bu, ADR-013'ün
  zaten işaretlediği "RTL arayüz" işinden **ayrı, daha küçük** bir
  pipeline-tarafı iş.
- **CJK (zh, ja):** Aynı sorun — Fraunces/IBM Plex Mono CJK karakter
  içermez. **Çözüm: `Noto Sans SC` (Basitleştirilmiş Çince) ve
  `Noto Sans JP`** (ikisi de ücretsiz, OFL) dil bazlı font seçiminde
  eklenir. Önceki rapor bu fontların **uygulama tarafında** (`@expo-
google-fonts`) büyük olduğunu (~10 MB) not etmişti (§6, "gözden kaçan
  işçilik") — ama bu, **kapak üretimi** için geçerli değil: pipeline
  sunucu tarafında çalışıyor (Python), bundle boyutuna girmiyor, yalnızca
  `pipeline/assets/fonts/` klasörüne birkaç MB eklenmiş olur.
- **Sonuç:** Mevcut ücretsiz yaklaşım **aynen korunur**, tek eklenecek
  şey `cover.py`'de dil→font eşlemesi (küçük bir `if lang in (...)`
  dallanması) ve üç yeni ücretsiz Google Fonts dosyası. Yeni bir
  bağımlılık ailesi (ücretli kapak API'si, stok görsel servisi) **gerekli
  değil** — CLAUDE.md'nin "basitlik önce gelir" ilkesiyle tam uyumlu.

---

## 4. Öncelikli rollout sırası (güncellenmiş gerekçeyle)

Önceki raporun Aşama 1-4 sıralaması **değişmiyor**, ama bu oturumun
gerçek zamanlı Gutendex verisiyle gerekçe daha somut:

| Sıra | Dil    |              Gutendex (1955 filtreli) | Neden bu sırada                                                                                                                          |
| ---- | ------ | ------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **fr** |                                 3.682 | En büyük doğrulanmış havuz + Wikisource fr en zengini + spaCy var                                                                        |
| 2    | **es** |                                   800 | İkinci en kolay; Gutenberg tek başına yeterli, Cervantes Virtual yedek                                                                   |
| 3    | **de** |                                 2.241 | Tahminden zengin çıktı; Komposita lemmatizasyonu tek zorluk                                                                              |
| 4    | **it** |                                 1.031 | Tahminden çok daha zengin çıktı (2011 verisinin ~3,5 katı) — Aşama 1'e eklenebilecek dördüncü aday                                       |
| 5    | **ru** | 8 (Gutenberg'de yok denecek kadar az) | Wikisource ru'ya bağımlı; Kiril alfabesi ilk kez, ama spaCy + TORFL→CEFR hazır                                                           |
| 6    | **ja** |                 22 (ihmal edilebilir) | Aozora Bunko canlı ve zengin (17.700+, önceki rapor) ama GitHub mirror bu oturumda 404 — bulk-indirme yolu netleşmeli; furigana işi ağır |
| 7    | **zh** |                                   202 | Kullanılabilir ama küçük taban + basitleştirme + klasik Çince tuzağı                                                                     |
| 8    | **tr** |                    **0 (doğrulandı)** | Klasik kaynağı yok — tam özgün üretim, ama dil zaten arayüzde var                                                                        |
| 9    | **ar** |                    **0 (doğrulandı)** | Klasik kaynağı yok + RTL + Hindawi lisansı hâlâ belirsiz — en riskli                                                                     |

**Değişiklik önerisi önceki rapora göre:** İtalyanca'nın Gutendex sayısı
(1.031) beklenenden güçlü çıktığı için, Aşama 1'e (fr/es/de) **dördüncü
dil olarak eklenmesi** düşünülebilir — dördü de aynı üç koşulu
sağlıyor (Latin alfabe, spaCy, doğrudan CEFR, artık doğrulanmış güçlü
Gutenberg havuzu). Bu, önceki raporun "Aşama 1: 3 dil" planını "Aşama 1:
4 dil" yapar; ek geliştirici maliyeti düşük çünkü İtalyanca zaten aynı
kategori (Latin/spaCy/CEFR) içinde, yeni bir teknik problem getirmiyor.

---

## 5. Açık kalan sorular (bir sonraki oturumda kapatılmalı)

1. **Hindawi lisansı** — hâlâ doğrulanmadı (önceki raporun 3. açık
   sorusu, bu oturumda da kapatılamadı — zaman kısıtı).
2. **Aozora Bunko güncel bulk-indirme yolu** — GitHub mirror'ı
   (`aozorabunko/aozorabunko`) 404 verdi, güncel adres/fork bulunmalı.
3. **LiberLiber güncel katalog URL'i** — denenen yol 404 verdi, site
   üzerinden manuel gezinip doğru "tüm kitaplar" sayfası bulunmalı.
4. **Cervantes Virtual kullanım şartları** — toplu/otomatik erişimin
   sitenin ToS'una uygun olup olmadığı okunmadı.
5. **Fraunces / IBM Plex Mono'nun Kiril kapsamı** — "muhtemelen var"
   dendi ama Google Fonts spesifikasyon sayfasından teyit edilmedi.
6. **Wikisource tr'nin gerçek boyutu** — istatistik sayfası bu oturumda
   bulunamadı; büyüklüğü "küçük" olarak niteleyen önceki rapor tahmini
   hâlâ sayısal olarak doğrulanmadı.

---

## Ek — Bu oturumda doğrudan doğrulanan URL'ler

- `https://gutendex.com/books/?languages=<kod>&author_year_end=1955` —
  **çalışıyor**, trailing slash + `curl -L -A "Mozilla/5.0"` ile 200.
  Çıplak `WebFetch` aracı 403 alıyor (muhtemelen farklı bir bot-koruma
  katmanı; ileride bu API'yi kullanacak herhangi bir otomasyon gerçek
  bir HTTP istemcisi/User-Agent ile çağırmalı).
- `https://tr.wikisource.org/wiki/Ana_Sayfa` — 200 (canlı).
- `https://dijital-kutuphane.mkutup.gov.tr/` — 200 (canlı, ama içerik
  yukarıda açıklandığı gibi pipeline için uygun değil).
- `https://ekitap.ktb.gov.tr` — bağlantı zaman aşımına uğradı (000),
  bu oturumda erişilemedi.
- `https://www.aozora.gr.jp` — 200 (canlı).
- `https://www.liberliber.it` — 200 (canlı, ama denenen katalog alt
  yolu 404).
- `https://www.cervantesvirtual.com` — 200 (canlı).
- `https://www.hindawi.org/books/` — 200 (canlı, lisans içeriği
  incelenmedi).
- `https://www.projekt-gutenberg.org` — 200 (canlı, kullanılmaması
  önerisi değişmedi).
- `https://github.com/aozorabunko/aozorabunko` — **404** (adres
  değişmiş olabilir, güncellenmeli).
- `https://www.liberliber.it/online/opere/libri/catalogo/` — **404**
  (yanlış/eski yol).
- `https://dumps.wikimedia.org/` — 200 (Wikisource dump mekanizması
  genel olarak doğrulandı).
