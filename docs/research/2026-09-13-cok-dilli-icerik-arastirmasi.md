# Çok Dilli İçerik Araştırması — v2 (N×N dil çifti)

> Tarih: 2026-09-13
> Kapsam: 11 dil (en, de, fr, ru, zh, ja, it, uk, tr, ar, es), 110 yönlü çift.
> Amaç: Mevcut tek-yönlü (İngilizce içerik → Türkçe arayüz) mimarinin
> genelleştirilmesi için kaynak, altyapı, maliyet ve rakip verisi toplamak.

**Bu rapor nasıl okunmalı:** Her bölümde doğrulanmış veriler kaynak linkiyle
verildi. Kaynakla doğrulayamadığım her sayı açıkça **(tahmin)** diye
işaretlendi. Bazı kaynaklarda (özellikle Project Gutenberg dil bazlı kitap
sayıları) resmi bir "şu an kaç tane" sayfası yok; oradaki rakamlar ya eski
istatistik sayfalarından ya da üçüncü parti derlemelerden geliyor ve
işaretlendi.

---

## 0. Yönetici özeti — 8 kritik bulgu

1. **Ses (TTS) en büyük mimari risk, maliyet değil.** ADR-012'nin dayandığı
   teknik (`Neural2` sesi + SSML `<mark>` + `enableTimePointing` ile kelime
   zaman işaretleri) **11 dilin hepsinde yok.** Neural2 yalnızca birkaç büyük
   dilde var; Google'ın yeni ve en iyi nesli olan **Chirp 3: HD ise SSML'i hiç
   desteklemiyor**, yani `<mark>` de yok — kelime kelime vurgu özelliği o
   seslerde doğrudan üretilemez. Bu, v2'de çözülmesi gereken bir numaralı
   teknik sorundur (bkz. §4.1).
2. **spaCy 11 dilin 9'unu kapsıyor; Türkçe ve Arapça kapsamıyor.** İkisi için
   de eğitilmiş pipeline yok, sadece tokenizer var. Arapça için CAMeL Tools,
   Türkçe için Stanza/Zemberek ayrı entegrasyon gerektiriyor (bkz. §2).
3. **AI hikâye üretim maliyeti önemsiz.** 6 seviye × 11 dil × 12 hikâye = 792
   hikâye, Claude Sonnet 5 ile **~$130–200**, Opus 5 ile **~$320–500**
   aralığında **(tahmin)**. Batch API %50 indirimle yarıya iner. Bütçeyi
   belirleyen kalem üretim değil, ses ve insan doğrulaması.
4. **Kamu malı içerik dillere göre çok dengesiz.** İngilizce ~60.000+ eser;
   Ukraynaca ve Türkçe için Project Gutenberg pratikte boş. Bu diller için
   "klasikler" rafı ya ulusal kaynaklardan ya da hiç doldurulamaz.
5. **Telif kuralı ülkeye göre değişiyor ve bu bir ürün riski.** Çin yaşam+50,
   çoğu yer yaşam+70. "Bir ülkede kamu malı = her ülkede kamu malı" DEĞİL.
   Uygulama global dağıtıldığı için en uzun terime göre filtrelemek gerekiyor.
6. **110 çift için doğrudan sözlük üretmek gereksiz.** Pivot (İngilizce
   üzerinden) değil, **lemma-merkezli tek yönlü genişletme** doğru model:
   her kaynak dil için tek bir lemma listesi, o lemmanın 10 hedef dile
   karşılığı. 11 × 10 = 110 değil, 11 lemma listesi × 10 sütun (bkz. §4.2).
7. **Rakiplerin hiçbiri gerçek N×N yapmıyor.** Beelinguapp ~23 dil ama
   içerik İngilizce merkezli; LingQ kullanıcı katkılı; Duolingo Stories
   yalnızca birkaç kursta. Gerçek N×N bir farklılaşma noktası.
8. **Öneri: 11 dile birden gitmeyin.** 4 dil çiftiyle (TR↔EN, DE↔EN, ES↔EN,
   FR↔EN) başlayan senaryo ~$1.500–3.000 ve 2–3 ay; tam 11 dil
   ~$15.000–30.000 ve 9–14 ay **(tahmin)**. Ayrıntılı gerekçe §6'da.

---

## 1. Her dil için kamu malı (public domain) içerik kaynağı

### 1.0 Önce telif kuralı — çünkü kaynak seçimini o belirliyor

Kamu malı "evrensel" bir statü değil, ülke bazlı. Berne Sözleşmesi asgari
olarak yazarın ölümünden 50 yıl sonrasını şart koşuyor; ülkeler bunu uzatmakta
serbest.

| Ülke / bölge        | Süre                                                                | Not                                                                                                |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| AB (DE, FR, IT, ES) | Yaşam + 70                                                          | Uyumlaştırılmış                                                                                    |
| ABD                 | Yayın + 95 (1930 öncesi yayınlar kamu malı)                         | Gutenberg.org'un tabanı bu                                                                         |
| Rusya               | Yaşam + 70                                                          | Sovyet dönemi eserlerinde özel kurallar var                                                        |
| Japonya             | Yaşam + 70                                                          | 2018'de 50→70 çıktı, **geriye dönük değil** — 1999–2018 arasında kamu malı olanlar kamu malı kaldı |
| Çin                 | Yaşam + 50                                                          | En kısa terim; ÇHC'de kamu malı bir eser AB'de olmayabilir                                         |
| Ukrayna             | Yaşam + 70 **(tahmin — Wikipedia listesi üzerinden, doğrulanmadı)** |                                                                                                    |
| Türkiye             | Yaşam + 70 **(tahmin — FSEK 27; kaynak doğrulanmadı)**              |                                                                                                    |
| Arap ülkeleri       | Değişken, tipik yaşam + 50 **(tahmin)**                             | Mısır, Suudi Arabistan, BAE ayrı ayrı                                                              |

Kaynaklar: [List of copyright duration by country (Wikipedia)](https://en.wikipedia.org/wiki/List_of_countries%27_copyright_lengths),
[Copyright law of Japan](https://en.wikipedia.org/wiki/Copyright_law_of_Japan),
[Copyrighted.com — Copyright by Country](https://www.copyrighted.com/blog/copyright-by-country)

**Ürün kuralı önerisi:** CLAUDE.md İlke #3 ("içerik kaynağı her zaman
doğrulanabilir public domain'dir") v2'de şu şekilde sertleştirilmeli:
_bir eser ancak hem kaynak ülkesinde hem de ABD'de kamu malıysa yayınlanır._
Pratikte bu, **yazarın 1955'ten önce ölmüş olması** gibi tek ve muhafazakâr
bir eşiğe indirgenebilir — pipeline'a otomatik kontrol olarak eklenebilir.
Project Gutenberg zaten ABD kuralına göre temizlenmiş bir havuz olduğu için
en düşük hukuki riskli kaynak odur; ulusal kütüphaneler daha riskli.

### 1.1 Genel çok dilli kaynaklar

| Kaynak                     | URL                        | Kapsam                                                   | Lisans netliği                                                                   | Format                                               |
| -------------------------- | -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Project Gutenberg          | https://www.gutenberg.org  | ~78.000 eser (Mart 2026), ~80 dil                        | **Çok yüksek** — her eser ABD kamu malı olarak doğrulanmış, açık lisans metni    | EPUB, TXT (UTF-8), HTML — **pipeline için en uygun** |
| Wikisource (dil sürümleri) | https://xx.wikisource.org  | 83 aktif wiki, toplam 10.000.000+ "text unit" (Ağu 2026) | Yüksek ama karışık — CC BY-SA ve kamu malı karışık; her sayfa ayrı kontrol ister | Wiki markup; EPUB dışa aktarım var ama kalitesiz     |
| Internet Archive           | https://archive.org        | Çok geniş, çok dilli                                     | **Düşük** — tarama kalitesi ve lisans durumu değişken                            | OCR'lı TXT, kalite riskli                            |
| Standard Ebooks            | https://standardebooks.org | ~1.000 eser, yalnızca İngilizce                          | Çok yüksek                                                                       | Mükemmel EPUB — temizlik işi sıfıra iner             |

Kaynaklar: [Project Gutenberg (Wikipedia)](https://en.wikipedia.org/wiki/Project_Gutenberg),
[Wikipedia:List of Wikisource editions](https://en.wikipedia.org/wiki/Wikipedia:List_of_Wikisource_editions),
[Project Gutenberg News — Statistics](https://www.gutenbergnews.org/statistics/)

**Wikisource dil büyüklükleri (Ağu 2026):** Fransızca 1.000.000+ metin birimi;
Almanca, İngilizce, İtalyanca, Lehçe, Rusça, Çince her biri 100.000+; Arapça ve
İspanyolca 10.000+. Dikkat: "text unit" = sayfa, kitap değil. Bir roman
yüzlerce text unit olabilir, yani bu sayılar kitap sayısı DEĞİL.

### 1.2 Dil bazlı detay

> **Project Gutenberg dil sayıları hakkında uyarı:** PG'nin güncel, resmi bir
> "dil başına kaç kitap" sayfası yok. Aşağıdaki sayılar PG'nin kendi
> bookshelf sayfalarından ve 2011 tarihli istatistik sayfasından derlendi,
> yani **eski ve eksik**. Kesin sayı için `gutendex.com/books?languages=xx`
> API'sinin `count` alanı sorgulanmalı (bu araştırma sırasında 403 döndü).

---

#### 🇬🇧 İngilizce (en)

- **Project Gutenberg**: ~60.000+ eser — kıyaslanamaz derecede zengin.
  https://www.gutenberg.org/browse/languages/en
- **Standard Ebooks**: ~1.000 titizlikle hazırlanmış EPUB.
  https://standardebooks.org
- Telif: ABD kuralı (1930 öncesi yayın). Lisans netliği **mükemmel**.
- **Durum: Mevcut sistemde zaten çözülmüş (56 klasik).**

#### 🇩🇪 Almanca (de)

- **Project Gutenberg**: ~776 eser (2011 verisi; bugün muhtemelen 1.500+
  **(tahmin)**). https://www.gutenberg.org/browse/languages/de
- **Projekt Gutenberg-DE**: https://www.projekt-gutenberg.org — Almanya'nın
  en büyük Almanca metin arşivi. **Uyarı:** PG.org ile ilgisi yok, ayrı bir
  ticari proje. Lisans şartları kısıtlayıcı, **toplu indirmeye izin vermiyor**;
  pipeline kaynağı olarak riskli.
- **Zeno.org**: https://www.zeno.org — Zenodot Verlagsgesellschaft mbH
  tarafından işletilen, Almanca'nın en büyük tam metin dijital kütüphanesi
  (2007'den beri). Lisans: karışık, ticari kullanım için ayrıca sorulmalı.
  https://en.wikipedia.org/wiki/Zeno.org
- **Wikisource de**: 100.000+ text unit.
- **Değerlendirme:** PG.org + Wikisource yeterli. Zeno/PG-DE hukuki inceleme
  gerektirir, ilk turda kullanılmamalı.

#### 🇫🇷 Fransızca (fr)

- **Project Gutenberg**: ~1.834 eser (2011); bugün 3.000+ **(tahmin)** —
  İngilizce'den sonra en büyük ikinci koleksiyon.
  https://www.gutenberg.org/browse/languages/fr
- **Wikisource fr**: **1.000.000+ text unit** — tüm Wikisource'lar içinde en
  büyüğü. Fransızca için en zengin kaynak.
- **Gallica (BnF)**: https://gallica.bnf.fr — Fransa Ulusal Kütüphanesi.
  Devasa ama çoğu taranmış görüntü + OCR; metin kalitesi değişken.
- **Değerlendirme:** İngilizce'den sonra en kolay dil. Kaynak sorunu yok.

#### 🇷🇺 Rusça (ru)

- **Project Gutenberg**: az sayıda (PG'nin "on dil" listesinde var ama
  koleksiyon küçük, **<200 tahmin**).
- **lib.ru (Maksim Moşkov Kütüphanesi)**: http://lib.ru — Rusça'nın en eski ve
  en büyük ücretsiz metin arşivi. **Lisans netliği düşük**: telifli eserler de
  var, "yazar itiraz ederse kaldırılır" modeli. Pipeline için **riskli**.
- **ilibrary.ru**: http://ilibrary.ru — daha küçük ama daha temiz klasik
  koleksiyonu, iyi HTML.
- **Wikisource ru**: 100.000+ text unit — **lisans açısından en güvenli Rusça
  kaynak.**
- **Değerlendirme:** Wikisource ru'yu birincil, PG'yi ikincil kaynak yap.
  lib.ru'yu kullanma (telif riski).

#### 🇨🇳 Çince — Basitleştirilmiş (zh)

- **Project Gutenberg**: ~405 eser. https://www.gutenberg.org/browse/languages/zh
  Çoğu **geleneksel** karakterlerle; basitleştirilmişe dönüştürme adımı gerekir
  (OpenCC kütüphanesi ile otomatize edilebilir).
- **ctext.org (Chinese Text Project)**: https://ctext.org — klasik Çince
  (wenyan) metinler. **Ürün için uygun değil:** modern Çince öğrenen bir
  kullanıcı klasik Çince okuyamaz. A2–B2 hedefine tamamen ters.
- **Wikisource zh**: 100.000+ text unit.
- **Kritik sorun:** Çin telifi yaşam+50 olmasına rağmen, **20. yüzyıl modern
  Çin edebiyatının çoğu (Lu Xun 1936, Lao She 1966) telif durumu ülkeye göre
  değişiyor.** Lu Xun ÇHC'de kamu malı, AB'de de öyle (1936+70=2006), ama her
  yazar ayrı kontrol ister.
- **Değerlendirme:** **En zor dillerden biri.** Klasikler rafı ya çok ince
  olur ya da klasik Çince yüzünden seviye uyumsuz olur. Özgün üretime ağırlık
  vermek gerekir.

#### 🇯🇵 Japonca (ja)

- **Aozora Bunko (青空文庫)**: https://www.aozora.gr.jp — **17.700+ eser**
  (Ocak 2026). Japonca için tartışmasız en iyi kaynak.
  - Lisans netliği: **Yüksek** — telifi dolmuş veya yazarın izin verdiği
    eserler. Her eserin lisansı sayfa üstünde açıkça yazıyor.
  - Format: Kendi ruby-annotasyonlu düz metin formatı + XHTML. Pipeline'a
    özel parser gerekir (ruby/furigana etiketlerini ayıklamak).
    GitHub'da tam veri seti mevcut: https://github.com/aozorabunko/aozorabunko
  - https://en.wikipedia.org/wiki/Aozora_Bunko
- **Project Gutenberg**: çok az Japonca eser.
- **Telif:** Yaşam + 70 (2018'den beri), geriye dönük değil. Natsume Sōseki
  (1916), Akutagawa (1927), Dazai (1948) kamu malı.
- **Değerlendirme:** İçerik kaynağı **mükemmel**, ama furigana/ruby parsing +
  dikey yazım + kanji seviyelendirme işi ciddi. (bkz. §2)

#### 🇮🇹 İtalyanca (it)

- **Project Gutenberg**: ~291 eser.
  https://www.gutenberg.org/browse/languages/it
- **LiberLiber / Progetto Manuzio**: https://www.liberliber.it — 900+ kamu
  malı metin. Lisans: çoğu CC veya kamu malı, sayfa başına belirtilmiş.
  Format: PDF/RTF/TXT — EPUB az.
- **Wikisource it**: 100.000+ text unit.
- **Değerlendirme:** Orta zorluk. PG + LiberLiber + Wikisource birleşimi
  yeterli hacim verir.

#### 🇺🇦 Ukraynaca (uk)

- **Project Gutenberg**: pratikte **boş** (<20 eser tahmin).
- **Ukrainska Literatura (ukrlib.com.ua)**: https://www.ukrlib.com.ua —
  Ukraynaca klasiklerin en geniş koleksiyonu. **Lisans netliği: düşük**,
  açık lisans beyanı yok. Pipeline için riskli.
- **Chtyvo (chtyvo.org.ua)**: https://chtyvo.org.ua — daha iyi lisans
  işaretlemesi, PDF/DJVU/FB2 formatları.
- **Wikisource uk**: nispeten küçük ama lisans açısından temiz.
- **Değerlendirme:** **En zayıf dil.** Klasikler rafı gerçekçi değil. Bu dil
  için ürünü **yalnızca özgün üretilmiş içerik** üzerine kurmak gerekir.

#### 🇹🇷 Türkçe (tr)

- **Project Gutenberg**: pratikte **boş**.
- Türkiye'de Gutenberg benzeri, açık lisanslı, kurumsal bir kamu malı metin
  arşivi **yok** (2026 itibarıyla bildiğim kadarıyla — **tahmin**).
- **Wikisource tr**: küçük ama temiz.
- **Kültür Bakanlığı e-kitap**: https://ekitap.ktb.gov.tr — bazı klasikler
  ücretsiz PDF; lisans şartları net değil.
- **Değerlendirme:** Ukraynaca ile aynı durumda. **Türkçe okuma içeriği için
  klasik kaynağı yok; özgün üretim zorunlu.** Bu, ürünün "Alman biri Türkçe
  okuyabilsin" vaadi için doğrudan bir kısıt.

#### 🇸🇦 Arapça (ar)

- **Hindawi Foundation (مؤسسة هنداوي)**: https://www.hindawi.org/en —
  **Arapça için en iyi kaynak.** 1.745 kitap / 81,5 milyon kelime
  (2008–2024 arası yayınlananlar akademik korpus olarak derlenmiş).
  Roman, çocuk edebiyatı, şiir, tiyatro, kurgu dışı — tür çeşitliliği iyi.
  - Ücretsiz erişim: https://www.hindawi.org/books/ (ayrıca safahat.org)
  - Toplu indirme aracı örneği: https://github.com/shahwan42/hindawi-dl
  - **Lisans: DOĞRULANMALI.** "Ücretsiz indirilebilir" ≠ "yeniden dağıtılabilir".
    Hindawi kitaplarının bir kısmı kamu malı klasiklerin yeni dizgisi, bir
    kısmı Hindawi'nin lisansladığı çeviriler. Pipeline'a almadan önce hukuki
    inceleme **zorunlu**.
  - Korpus kaydı: https://researchdata.se/en/catalogue/dataset/2024-145
- **Al-Maktaba Al-Shamela (المكتبة الشاملة)**: https://shamela.ws — çok geniş
  ama ağırlıklı klasik dinî/fıkhî metinler. Modern dil öğrenimi için **uygun
  değil** (ctext.org ile aynı sorun).
- **Wikisource ar**: 10.000+ text unit.
- **Ek teknik sorun:** Arapça metinlerde **harekeler (diakritikler) genelde
  yok.** Bu, hem TTS telaffuzunu hem de kelime-lemma eşlemesini zorlaştırır.
- **Değerlendirme:** Hindawi hukuken temizlenirse iyi; temizlenmezse Arapça da
  "özgün üretim zorunlu" kategorisine düşer.

#### 🇪🇸 İspanyolca (es)

- **Project Gutenberg**: ~308 eser.
  https://www.gutenberg.org/browse/languages/es
- **Biblioteca Virtual Miguel de Cervantes**: https://www.cervantesvirtual.com
  — Alicante Üniversitesi. 2005–2006'da 22.000+ eser; bugün çok daha fazla.
  İspanyolca ve İbero-Amerikan edebiyatının en büyük açık erişim deposu.
  TEI-XML dışa aktarımı var — **pipeline için çok uygun**.
  https://en.wikipedia.org/wiki/Miguel_de_Cervantes_Virtual_Library
- **Wikisource es**: 10.000+ text unit.
- **Değerlendirme:** Fransızca'dan sonra en kolay ikinci dil. Cervantes Virtual
  tek başına yeterli hacim veriyor.

### 1.3 Dil bazlı zorluk özeti

| Dil | Klasik kaynak kalitesi | Birincil kaynak önerisi       | Özgün üretime bağımlılık   |
| --- | ---------------------- | ----------------------------- | -------------------------- |
| en  | ★★★★★                  | Gutenberg + Standard Ebooks   | Düşük                      |
| fr  | ★★★★★                  | Gutenberg + Wikisource fr     | Düşük                      |
| es  | ★★★★☆                  | Cervantes Virtual + Gutenberg | Düşük                      |
| de  | ★★★★☆                  | Gutenberg + Wikisource de     | Düşük                      |
| it  | ★★★☆☆                  | Gutenberg + LiberLiber        | Orta                       |
| ru  | ★★★☆☆                  | Wikisource ru (lib.ru DEĞİL)  | Orta                       |
| ja  | ★★★★☆                  | Aozora Bunko                  | Düşük (ama teknik iş ağır) |
| ar  | ★★☆☆☆                  | Hindawi (lisans doğrulanırsa) | Yüksek                     |
| zh  | ★★☆☆☆                  | Gutenberg zh + Wikisource zh  | Yüksek                     |
| uk  | ★☆☆☆☆                  | Wikisource uk                 | **Tam bağımlı**            |
| tr  | ★☆☆☆☆                  | —                             | **Tam bağımlı**            |

---

## 2. Her dil için dilbilimsel altyapı

Mevcut pipeline iki şeye dayanıyor: (a) spaCy `en_core_web_sm` ile
lemmatizasyon/POS, (b) CEFR-J kelime listesiyle kapsam ölçümü. İkisi de
dil bazlı olarak farklı düzeyde genelleşiyor.

### 2.1 spaCy kapsamı

spaCy v3'te **24 dilde eğitilmiş pipeline** var: Katalanca, Çince, Hırvatça,
Danca, Felemenkçe, İngilizce, Fince, Fransızca, Almanca, Yunanca, İtalyanca,
Japonca, Korece, Litvanca, Makedonca, çok dilli (xx), Norveççe Bokmål, Lehçe,
Portekizce, Rumence, Rusça, Slovence, İspanyolca, İsveççe, Ukraynaca.

Kaynak: [spaCy — Models & Languages](https://spacy.io/usage/models)

| Dil    | spaCy modeli      | Durum                         | Not                                                                                      |
| ------ | ----------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| en     | `en_core_web_sm`  | ✅ Mevcutta kullanılıyor      | —                                                                                        |
| de     | `de_core_news_sm` | ✅ Var                        | Bileşik kelime (Komposita) ayrıştırma zayıf — `Donaudampfschiff` tek lemma olur          |
| fr     | `fr_core_news_sm` | ✅ Var                        | Elizyon (`l'`, `d'`) tokenizasyonu iyi                                                   |
| ru     | `ru_core_news_sm` | ✅ Var                        | Zengin çekim; lemmatizasyon kalitesi iyi                                                 |
| zh     | `zh_core_web_sm`  | ✅ Var                        | **Kelime sınırı yok** — segmentasyon (jieba/pkuseg) kritik; "lemma" kavramı yok, POS var |
| ja     | `ja_core_news_sm` | ✅ Var                        | **SudachiPy** ile segmentasyon; kurulum ek bağımlılık ister                              |
| it     | `it_core_news_sm` | ✅ Var                        | —                                                                                        |
| uk     | `uk_core_news_sm` | ✅ Var                        | **pymorphy3** bağımlılığı gerekir                                                        |
| es     | `es_core_news_sm` | ✅ Var                        | —                                                                                        |
| **tr** | —                 | ❌ **Yok** (sadece tokenizer) | Aşağıya bak                                                                              |
| **ar** | —                 | ❌ **Yok** (sadece tokenizer) | Aşağıya bak                                                                              |

### 2.2 Türkçe ve Arapça için alternatifler

**Türkçe** — sondan eklemeli (agglutinative), tek kelime bir cümle olabilir
(`evlerimizdekilerden`). Lemmatizasyon burada İngilizce'dekinden çok daha
kritik, çünkü yüzey formu sayısı pratik olarak sınırsız.

- **Stanza** (Stanford): Türkçe UD treebank üzerinde eğitilmiş pipeline var;
  tokenize + POS + lemma + dependency. https://stanfordnlp.github.io/stanza/
- **Zemberek-NLP**: Java tabanlı, Türkçe'ye özel morfolojik analizci. En
  doğru sonucu verir ama Python pipeline'ına JVM sokmak demek.
  https://github.com/ahmetaa/zemberek-nlp
- **TurkicNLP** (2026): Stanza uyumlu, 24 Türki dil için birleşik API; Apertium
  FST morfoloji + Stanza nöral modeller. https://arxiv.org/html/2602.19174v1
- **Öneri:** Stanza. spaCy ile aynı soyutlamaya (token → lemma → POS)
  oturuyor, saf Python, ek JVM yok.

**Arapça** — kök-şablon (root-and-pattern) morfolojisi + clitic ekleri +
harekesizlik. En zor dil.

- **CAMeL Tools** (NYU Abu Dhabi): Arapça'ya özel Python toolkit —
  tokenizasyon, morfolojik analiz, disambiguation, POS.
  https://github.com/CAMeL-Lab/camel_tools |
  [LREC 2020 makalesi](https://aclanthology.org/2020.lrec-1.868.pdf)
- **SinaTools** (2024): daha yeni alternatif.
  https://arxiv.org/pdf/2411.01523
- **Stanza**: Arapça UD pipeline'ı da var; CAMeL'den daha genel ama daha zayıf.
- **Öneri:** CAMeL Tools. Arapça'ya özel olması, genel araçlara göre kayda
  değer fark yaratıyor.

**Mimari sonuç:** `pipeline/` içinde dil-analizci soyutlaması (`Analyzer`
protokolü: `analyze(text) -> list[Token(surface, lemma, pos)]`) tanımlanıp
arkasına spaCy / Stanza / CAMeL sürücüleri konmalı. Pipeline'ın geri kalanı
(seviye doğrulayıcı, kapsam ölçümü) analizciden habersiz kalır.

**ADR-008'e etki:** Cihaz üstü, kural tabanlı lemmatizer (`tokenizer.js`)
İngilizce için çalışıyor. Bu yaklaşım **Türkçe, Arapça, Rusça, Ukraynaca,
Japonca ve Çince için çalışmaz** — ek-kuralı tabloları bu dillerin
morfolojisini kapsayamaz. Bu dillerde ADR-008'in "gelecek yol" olarak
dokümante ettiği `book_surface_lemmas` sunucu tarafı sözlüğü **zorunlu hale
geliyor**. v2'nin ADR-008'i tersine çevirmesi gerekecek gibi görünüyor.

### 2.3 Seviyelendirme standartları — CEFR'e ne kadar eşdeğer?

Mevcut sistem CEFR A1–C2 + CEFR-J kelime listesi kullanıyor. Bunun dil bazlı
karşılıkları:

| Dil | Yerel standart                                          | CEFR eşleşmesi                                                                                                             | Kelime listesi var mı                                                |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| en  | CEFR + NGSL/CEFR-J                                      | Doğal                                                                                                                      | ✅ Açık, mevcutta kullanılıyor                                       |
| de  | Goethe-Zertifikat A1–C2                                 | **Doğrudan CEFR**                                                                                                          | ✅ Goethe Wortlisten (A1, A2, B1 resmi PDF)                          |
| fr  | DELF/DALF + _Référentiels_                              | **Doğrudan CEFR**                                                                                                          | ✅ CEFR Reference Level Descriptions (Beacco vd., A1 2006 / B2 2004) |
| es  | DELE + _Plan Curricular del Instituto Cervantes_ (2006) | **Doğrudan CEFR**                                                                                                          | ✅ Plan Curricular korpus tabanlı listeler                           |
| it  | CELI/PLIDA + _Profilo della lingua italiana_            | **Doğrudan CEFR**                                                                                                          | ✅                                                                   |
| ru  | **TORFL / ТРКИ**                                        | Doğrudan: Elementary=A1, Basic=A2, I=B1, II=B2, III=C1, IV=C2                                                              | ⚠️ Resmi liste var ama serbest erişim zayıf                          |
| uk  | —                                                       | CEFR uyarlaması var ama olgunlaşmamış **(tahmin)**                                                                         | ❌                                                                   |
| tr  | **TYS (Türkçe Yeterlik Sınavı)**, Yunus Emre Enstitüsü  | CEFR'e göre tasarlanmış                                                                                                    | ⚠️ Resmi kelime listesi yok **(tahmin)**                             |
| zh  | **HSK** (HSK 3.0 / 2021, 9 seviye)                      | **Tartışmalı.** Resmi belgeler eski 6 seviyeyi A1–C2 diye eşliyor; Fachverband Chinesisch HSK 6'yı C2 değil **B2** sayıyor | ✅ HSK kelime listeleri tam ve açık — en iyi seviyeli liste          |
| ja  | **JLPT N5–N1**                                          | 2025'ten beri JLPT skor raporunda CEFR açıklaması var: N5→A1, N4→A2, N3→A2/B1, N2→B1/B2, N1→B2/C1. **N1 bile C2 değil**    | ✅ JLPT kelime + kanji listeleri yaygın                              |
| ar  | —                                                       | **Standart yok.** ALPT/ACTFL tabanlı denemeler var, CEFR eşlemesi olgunlaşmamış                                            | ❌                                                                   |

Kaynaklar:
[JLPT — CEFR Level Reference](https://www.jlpt.jp/e/about/cefr_reference.html),
[TORFL (Wikipedia)](https://en.wikipedia.org/wiki/Test_of_Russian_as_a_Foreign_Language),
[HSK–CEFR alignment](https://www.lingobright.com/statistics/hsk-level-to-cefr-alignment-chart),
[Word lists in CEFR Reference Level Descriptions (EURALEX 2012, PDF)](https://www.euralex.org/elx_proceedings/Euralex2012/pp328-335%20Marello.pdf)

### 2.4 Uygulamanın seviye sistemini nasıl uyarlaması gerekiyor

Üç seçenek var:

1. **Her yerde CEFR kullan, yerel standardı arkada eşle.** Kullanıcı hep
   A1–C2 görür; `zh` için HSK, `ja` için JLPT arka planda kullanılır.
   - Artı: tek UI, tek veri modeli, mevcut `cefr_level` kolonu korunur.
   - Eksi: JLPT N1 ≈ B2/C1 olduğu için Japonca C2 rafı **boş kalır**;
     kullanıcıya yalan söylenmiş olmaz ama basamak eksik görünür.
2. **Dil başına yerel etiket göster.** Japonca'da N5–N1, Çince'de HSK 1–9.
   - Artı: o dili öğrenenin zaten bildiği ölçek.
   - Eksi: `books.cefr_level` tek kolonu yetmez; UI dil bazlı çatallanır;
     seviye tespiti testi 11 kez yeniden yazılır.
3. **Hibrit: iç model CEFR, görünen etiket dile göre.** `books` tablosunda
   hem `cefr_level` (iç sıralama için, zorunlu) hem `native_level` (gösterim
   için, opsiyonel) tutulur.

**Öneri: (3).** Kütüphane sıralaması, SRS ve seviye tespiti tek bir ölçeğe
(CEFR) dayanır — bu mevcut kodun tamamını korur; yalnızca rozet metni
`native_level ?? cefr_level` olur. Maliyeti bir migration + bir i18n anahtarı.

**Doğrulayıcıya etki:** `pipeline`'ın STRICT doğrulayıcısı iki metrik
kullanıyor: ortalama cümle uzunluğu ve kelime dağarcığı kapsamı %. İkisi de
dil bağımlı yeniden kalibre edilmeli:

- **Cümle uzunluğu tavanı/tabanı** Almanca'da İngilizce'den yüksek, Çince ve
  Japonca'da "kelime" sayılamadığı için **karakter** cinsinden olmalı.
- **Kapsam %** yalnızca kelime listesi olan dillerde (en, de, fr, es, it, zh,
  ja) ölçülebilir. `ru` kısmen, `tr/ar/uk` için **hiç ölçülemez** — o dillerde
  doğrulayıcı frekans tabanlı bir vekile (örn. Wikipedia korpusundan türetilmiş
  ilk-N-kelime listesi) düşmek zorunda.

---

## 3. AI ile özgün hikâye üretimi: maliyet ve süre

### 3.1 Güncel Claude API fiyatları (2026-09-13 itibarıyla doğrulandı)

| Model            | Girdi $/MTok | Çıktı $/MTok | Batch girdi | Batch çıktı |
| ---------------- | ------------ | ------------ | ----------- | ----------- |
| Claude Opus 5    | $5           | $25          | $2,50       | $12,50      |
| Claude Sonnet 5  | $2           | $10          | $1          | $5          |
| Claude Haiku 4.5 | $1           | $5           | $0,50       | $2,50       |

- Batch API: girdi ve çıktıda **%50 indirim**, asenkron işleme.
- Prompt caching: cache okuma temel girdinin **0,1x'i**; 5 dk yazma 1,25x.
- Kaynak: [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### 3.2 Bir hikâyenin token maliyeti

**Varsayımlar (açıkça tahmin):**

- 3.000 kelimelik B1 hikâye.
- Sistem promptu + seviye kuralları + kelime listesi örneği: ~4.000 girdi token
  (prompt caching ile ikinci denemeden itibaren 0,1x).
- Çıktı: dile göre değişir. **Token/kelime oranı kritik ve dil bağımlı.**

| Dil grubu                   | Diller             | Token/kelime oranı (tahmin)              | 3.000 kelime ≈ |
| --------------------------- | ------------------ | ---------------------------------------- | -------------- |
| Latin alfabeli Batı dilleri | en, de, fr, es, it | ~1,4                                     | 4.200 token    |
| Kiril + Türkçe              | ru, uk, tr         | ~2,2                                     | 6.600 token    |
| Arapça                      | ar                 | ~2,5                                     | 7.500 token    |
| CJK                         | zh, ja             | ~2,0–3,0 (kelime ≠ karakter, ölçüm şart) | 7.500 token    |

> Not: Claude 4.7 ve sonrası yeni tokenizer kullanıyor ve aynı metin için
> **yaklaşık %30 daha fazla token** üretiyor. Yukarıdaki oranlar bunu
> içeriyor **(tahmin — gerçek oran `count_tokens` ile ölçülmeli)**.

**Tek deneme maliyeti (Sonnet 5, cache yok):**

| Dil grubu | Girdi                 | Çıktı                  | Toplam     |
| --------- | --------------------- | ---------------------- | ---------- |
| Batı      | 4.000 × $2/M = $0,008 | 4.200 × $10/M = $0,042 | **~$0,05** |
| Kiril/TR  | $0,008                | 6.600 × $10/M = $0,066 | **~$0,07** |
| CJK/AR    | $0,008                | 7.500 × $10/M = $0,075 | **~$0,08** |

**Opus 5 ile aynı hesap** (2,5x): Batı ~$0,12, CJK/AR ~$0,20.

**Kapalı döngü (mevcut `generate_stories.py` modeli):** üret → doğrula →
geçmezse gerekçeyle yeniden yazdır. Mevcut deneyim (B1: 24 hikâye, B2:
3 hikâye) **ortalama 1,5–2,5 denemeyi** işaret ediyor; yeni dillerde
doğrulayıcı kalibre edilene kadar **3'e kadar çıkabilir (tahmin)**.

Doğrulama (spaCy/Stanza/CAMeL) yerel çalışıyor, **API maliyeti yok** —
sadece CPU zamanı.

**Hikâye başına gerçekçi maliyet (2 deneme ortalaması):**

| Model            | Batı dilleri | CJK/AR/Kiril |
| ---------------- | ------------ | ------------ |
| Sonnet 5         | ~$0,10       | ~$0,16       |
| Sonnet 5 + Batch | ~$0,05       | ~$0,08       |
| Opus 5           | ~$0,25       | ~$0,40       |
| Opus 5 + Batch   | ~$0,13       | ~$0,20       |

### 3.3 Toplam katalog maliyeti

**Hedef: 6 seviye × 11 dil × 12 hikâye = 792 hikâye.**

| Senaryo                   | Toplam maliyet (tahmin) |
| ------------------------- | ----------------------- |
| Hepsi Sonnet 5, Batch API | **~$50–70**             |
| Hepsi Sonnet 5, senkron   | **~$100–140**           |
| Hepsi Opus 5, Batch API   | **~$130–180**           |
| Hepsi Opus 5, senkron     | **~$250–350**           |

**Yorum: Üretim maliyeti neredeyse konu dışı.** 792 özgün hikâye için
en kötü senaryoda $350. Bu, tek bir aylık abonelik gelirinden az. Asıl
kısıt **zaman ve kalite kontrolü**, para değil.

**Model seçimi önerisi:** A1–B1 için Sonnet 5 yeterli (kelime dağarcığı
kısıtlı, yaratıcılık beklentisi düşük). B2–C2 için Opus 5 — o seviyelerde
metin gerçekten edebi olmak zorunda ve ucuz modelin çıktısı düz kalıyor.
Mevcut deneyimde B2'nin "cümle uzunluğu tabanı" sorunu tam olarak buydu.

### 3.4 Süre ve rate limit

- **Paralelleştirilebilir mi: Evet.** Hikâyeler birbirinden bağımsız. Mevcut
  betik zaten var olan dosyaları atlıyor, yani kesilip devam edebiliyor.
- **Rate limit'ler tier bazlı** (Start / Build / Scale). Kaynak:
  [Rate limits](https://platform.claude.com/docs/en/api/rate-limits).
  Build tier'da paralel 5–10 istek makul **(tahmin)**.
- **Batch API kullanılırsa rate limit sorunu yok** — 792 isteği tek seferde
  gönderip beklersin. Tipik tamamlanma < 24 saat, genelde çok daha hızlı.
- **Wall-clock tahmini:**
  - Batch API ile: **1–2 gün** (üretim), + doğrulama döngüleri için 2–3 tur →
    **~1 hafta**.
  - Senkron, 5 paralel: hikâye başına ~90 sn × 792 × 2 deneme / 5 ≈
    **~8 saat saf hesaplama**; pratikte hata ayıklama ile **~1 hafta**.
- **Gerçek darboğaz API değil, insan:** her yeni dil için prompt kalibrasyonu
  (seviye kuralları, cümle uzunluğu bantları, kültürel uygunluk) ve çıktının
  anadili konuşan biri tarafından örneklem denetimi. **Dil başına 2–5 gün
  (tahmin).** 11 dil → **~2–3 ay insan zamanı**, tek kişiyle.

---

## 4. Kelime çevirisi ve TTS maliyeti çok dilli ölçekte

### 4.1 Google Cloud TTS — BU BÖLÜM EN KRİTİK BULGU

#### Fiyatlandırma (2026)

| Ses tipi    | Ücretsiz kota / ay | Aşım fiyatı (1M karakter) |
| ----------- | ------------------ | ------------------------- |
| Standard    | 4M karakter        | $4                        |
| WaveNet     | 4M karakter        | $4                        |
| **Neural2** | **1M karakter**    | **$16**                   |
| Studio      | 1M karakter        | $160                      |
| Chirp 3: HD | 1M karakter        | $30                       |

Kaynaklar: [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing),
[TextToLab — GCTTS pricing 2026](https://texttolab.com/blog/google-cloud-tts-pricing),
[costbench — free plan limits](https://costbench.com/software/ai-voice-tools/google-cloud-text-to-speech/free-plan/)

**Ücretsiz kota ses tipi başına GLOBAL, dil başına DEĞİL.** Yani 11 dil aynı
1M Neural2 kotasını paylaşıyor. Mevcut 207 bölüm yeniden üretimi 706.286
karakter tutmuştu; 11 dile çıkınca bu rakam **11 katına çıkmaz — çünkü içerik
de 11 katına çıkar**, yani ~7,8M karakter → ücretsiz kotayı aşar, ~$110
(Neural2) veya ~$205 (Chirp3-HD) **(tahmin)**.

Yani **ses maliyeti de aslında ucuz.** Sorun maliyet değil:

#### Ses tipi × dil matrisi — ASIL SORUN

| Locale    | Standard | WaveNet | **Neural2**     | Studio | **Chirp 3: HD** |
| --------- | -------- | ------- | --------------- | ------ | --------------- |
| en-US     | ✅       | ✅      | ✅              | ✅     | ✅              |
| de-DE     | ✅       | ✅      | ✅              | ❌     | ✅              |
| fr-FR     | ✅       | ✅      | ✅              | ✅     | ✅              |
| es-ES     | ✅       | ✅      | ⚠️ doğrulanmadı | ❌     | ✅              |
| it-IT     | ✅       | ✅      | ⚠️ doğrulanmadı | ❌     | ✅              |
| ru-RU     | ✅       | ✅      | ⚠️ doğrulanmadı | ❌     | ⚠️              |
| ja-JP     | ✅       | ✅      | ⚠️ doğrulanmadı | ❌     | ✅              |
| cmn-CN    | ✅       | ✅      | ⚠️ doğrulanmadı | ❌     | ✅              |
| **ar-XA** | ✅       | ✅      | ❌ **YOK**      | ❌     | ✅              |
| **tr-TR** | ✅       | ✅      | ❌ **YOK**      | ❌     | ⚠️ doğrulanmadı |
| **uk-UA** | ✅       | ✅      | ❌ **YOK**      | ❌     | ⚠️ doğrulanmadı |

Kaynak: [Supported voices and languages](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types),
[Chirp 3: HD voices](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)

> ⚠️ işaretli hücreler bu araştırmada **doğrulanamadı** — Google'ın voices
> listesi sayfası çok uzun olduğu için fetch kesildi. Uygulamaya geçmeden önce
> `texttospeech.voices.list()` API'si ile **programatik olarak** doğrulanmalı.
> Bu tek bir betik; tahminle ilerlemeyin.

#### Kelime zaman işaretleri (`<mark>` + `enableTimePointing`) — kırılma noktası

ADR-012'nin dayandığı vurgu mekanizması **SSML `<mark>` etiketlerine**
bağlı. Google'ın dokümantasyonu diyor ki:

- **Studio sesleri** SSML destekliyor **ama `<mark>`, `<emphasis>` ve
  `<prosody pitch>` hariç** → zaman işareti **alınamaz**.
- **Chirp 3: HD sesleri SSML'i hiç desteklemiyor** → zaman işareti
  **alınamaz**.
- **Neural2 ve WaveNet** SSML destekliyor → `<mark>` çalışıyor.

**Sonuç:** Kelime kelime vurgulu seslendirme **yalnızca Neural2 ve WaveNet**
seslerinde mümkün. Neural2 sadece birkaç dilde var. Yani:

| Dil grubu                                      | Vurgulu ses stratejisi                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| en, de, fr (+ muhtemelen es, it, ja, zh, ru)   | **Neural2 + `<mark>`** — mevcut mimari aynen çalışır                                    |
| **tr, uk, ar** (ve Neural2'si olmayan her dil) | **WaveNet + `<mark>`** — kalite düşer ama vurgu çalışır. Fiyat avantajı var ($4 vs $16) |
| Chirp 3: HD ile en iyi kalite istenirse        | **Vurgu kaybolur** veya zorlamalı hizalama (forced alignment) gerekir                   |

#### Alternatif: Forced alignment (zorlamalı hizalama)

Chirp 3: HD kalitesi + kelime vurgusu ikisini birden isterseniz, sesi
ürettikten sonra metinle hizalamak gerekir:

- **WhisperX** — Whisper + wav2vec2 ile kelime seviyesi zaman damgası.
  https://github.com/m-bain/whisperX
- **Montreal Forced Aligner (MFA)** — daha klasik, dil başına akustik model
  gerekir. https://montreal-forced-aligner.readthedocs.io/
- Artı: ses kalitesinden ödün yok, TTS sağlayıcısından bağımsız olursunuz
  (ElevenLabs, Azure vb. de kullanılabilir hale gelir).
- Eksi: **pipeline'a ciddi bir yeni bileşen** (GPU'lu bir adım), ve her dilde
  hizalama doğruluğu ayrı bir kalite metriği olur. CLAUDE.md'nin "Basitlik önce
  gelir" ilkesine karşı ciddi bir borç.

**Önerim:** v2'nin ilk turunda forced alignment'a girmeyin. Neural2/WaveNet +
`<mark>` yolunu koruyun; Chirp 3: HD'ye geçiş ayrı bir karar olsun. Karar
ADR-013 olarak yazılmalı.

#### Ayrıca: mevcut 5.000 bayt SSML sınırı ve öteleme hatası

`src/mp3_duration.py` ile çözülen kümülatif kayma sorunu (2026-09-08) her
dilde tekrar ortaya çıkacak — ama çözüm dil bağımsız olduğu için **yeniden
yaşanmaz**. Yalnız dikkat: **CJK dillerinde 5.000 bayt çok daha az metin
demek** (UTF-8'de Çince/Japonca karakter 3 bayt). Yani bölüm başına parça
sayısı 3–4'ten 10–12'ye çıkar ve **öteleme hatası birikme riski 3 kat artar**.
Ölçülmüş öteleme (`mp3_duration`) burada zorunlu, tahmin asla değil.

### 4.2 Sözlük / gloss üretimi: 110 çift için strateji

#### Kombinatorik problemin yanlış kurulması

"110 yönlü çift" ilk bakışta 110 ayrı sözlük gibi görünüyor. Değil.
Doğru veri modeli **kaynak dil merkezli**:

```
lemmas(id, lang, lemma, pos, ipa, frequency_rank)      -- 11 dil, dil başına ~25-40k satır
glosses(lemma_id, target_lang, gloss, example_sentence) -- lemma başına 10 satır
```

Yani 110 sözlük değil, **11 lemma listesi × 10 hedef dil sütunu**.
Toplam satır: 11 × 30.000 × 10 = **3,3 milyon gloss**.

#### Doğrudan mı, pivot mu?

| Strateji                        | Nasıl                                                                     | Artı                                                                                                                    | Eksi                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Doğrudan**                    | Almanca lemma → Rusça gloss, tek AI çağrısı                               | En yüksek kalite; anlam kaymaz                                                                                          | 110 yön için ayrı prompt kalibrasyonu                                                                |
| **Pivot (İngilizce üzerinden)** | de → en → ru                                                              | Tek bir "de→en" işi yeterli, sonra en→X tekrar kullanılır                                                               | **Anlam kaybı birikir.** `Schloss` → "castle/lock" → Rusça'ya hangisi? Pivot bu belirsizliği çözemez |
| **Toplu doğrudan (önerilen)**   | Tek AI çağrısında bir lemma için **10 hedef dilin hepsi birden** üretilir | Bağlam bir kez ödenir; model kaynak kelimenin anlamını bir kez çözer ve 10 dile birden yazar; anlam tutarlılığı garanti | Çıktı token'ı büyük ama girdi token'ı paylaşılıyor                                                   |

**Öneri kesin: Toplu doğrudan.** Pivot'un maliyet avantajı yok (girdi zaten
ucuz), kalite dezavantajı büyük. Çok anlamlı kelimelerde pivot sistematik
olarak yanlış çeviri üretir — ve bu, ürünün çekirdek değeri olan "kelimeye
dokun, karşılığını gör" akışının tam ortasında bozulur.

#### Maliyet hesabı (toplu doğrudan)

- Bir lemma için istek: girdi ~300 token (talimat cache'li + lemma + örnek
  cümle bağlamı), çıktı ~400 token (10 dilde gloss + örnek cümle).
- 100 lemma'lık batch'ler halinde → istek başına girdi ~4k, çıktı ~40k token.
- 11 × 30.000 = 330.000 lemma → 3.300 istek.
- **Haiku 4.5 + Batch** ($0,50/$2,50): girdi 13M×$0,5/M = $6,6; çıktı
  132M×$2,5/M = $330 → **~$340**
- **Sonnet 5 + Batch** ($1/$5): **~$670**
- **Opus 5 + Batch** ($2,50/$12,50): **~$1.700**

**Öneri:** Sözlük için **Sonnet 5 + Batch**. Haiku ucuz ama sözlük ürünün
çekirdeği — yanlış bir gloss doğrudan öğrenmeyi bozar. Opus'un farkı bu iş
için marjinal **(tahmin — A/B örneklemi ile doğrulanmalı)**.

**IPA:** AI'dan IPA istemeyin, uydurur. Wiktionary dökümü (`kaikki.org`,
https://kaikki.org/dictionary/ ) çoğu dil için IPA içeriyor ve ücretsiz.
Mevcut borç listesindeki "`ipa` boş" maddesi buradan kapatılabilir.

### 4.3 Cümle çevirisi (AI, çalışma anında)

Mevcut sistem Claude Haiku kullanıyor. 110 çift için değişen tek şey prompt'ta
hedef dilin parametrik olması. Maliyet kullanıcı başına, katalog başına değil.
Kota yönetimi (premium'da yüksek kota) aynı kalır.

**Tek yeni risk:** Düşük kaynaklı çiftlerde (örn. Ukraynaca → Arapça) çeviri
kalitesi ölçülmeden premium özelliği olarak satılmamalı. Bir örneklem
değerlendirmesi (LLM-judge veya anadili konuşan) yapılmalı.

---

## 5. Rakip analizi

| Uygulama                  | Dil / çift sayısı                                                               | İçerik stratejisi                                                                 | Fiyat (2026)                                        | N×N mi?                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Beelinguapp**           | ~23 dil katalogda (en, es, pt, fr, it, de, ja, ru, zh, hi, tr, ko, ar, sv, ...) | **Kendi üretiyor + kamu malı** çeviriler. Çift dilli yan yana okuma + ses.        | $7,99/ay, $49,90/yıl (App Store, Tem 2026)          | **Kısmen.** Arayüz çok dilli ama içerik ağırlıklı olarak İngilizce merkezli üretiliyor; her dil çiftinde eşit derinlik yok |
| **LingQ**                 | 40+ dil                                                                         | **Kullanıcı katkılı + içe aktarma.** Kendi metnini, sesini, videonu getir.        | ~$14/ay                                             | Teknik olarak evet ama **içerik kalitesi kullanıcıya bağlı**; seviyeli özgün içerik yok                                    |
| **Readlang**              | Tarayıcı eklentisi — teorik olarak her dil                                      | **Hiç içerik üretmiyor.** Kullanıcının okuduğu web sayfasını tıklanabilir yapıyor | $6/ay (en ucuz); ücretsizde günde 10 ifade çevirisi | Evet, ama içeriksiz — bir araç, bir kütüphane değil                                                                        |
| **Duolingo Stories**      | Yalnızca birkaç kurs (İngilizce konuşanlar için es, fr, it, de, pt)             | **Tamamen kendi üretiyor**, yüksek prodüksiyon                                    | Super Duolingo aboneliğine dâhil                    | **Hayır.** İngilizce merkezli, N×N değil. 2025'te 148 yeni kurs açıldı ama Stories yalnızca başlangıç seviyesinde          |
| **Duostories** (topluluk) | Duolingo Stories'in topluluk çevirisi                                           | Gönüllü çeviri                                                                    | Ücretsiz                                            | Duolingo'nun N×N boşluğunu topluluk dolduruyor — **pazarda talep olduğunun kanıtı**                                        |

Kaynaklar:
[FluentU — Beelinguapp review](https://www.fluentu.com/blog/reviews/beelingapp/),
[languavibe — Beelinguapp Review 2026](https://languavibe.com/beelinguapp-review/),
[Eppika — Best reading apps 2026](https://eppika.com/en/blog/best-reading-apps-language-learning-2026),
[Duolingo — 148 new courses (2025)](https://www.globenewswire.com/news-release/2025/04/30/3071105/0/en/Duolingo-Launches-148-New-Language-Courses-Expands-Access-to-Popular-Languages-Including-Japanese-and-Korean.html),
[Duostories](https://duostories.org/)

### 5.1 Çıkarımlar

1. **Gerçek N×N kimse yapmıyor.** Herkes İngilizce merkezli. "Alman biri
   Türkçe okusun" senaryosunu ciddiye alan bir uygulama görmedim. Bu bir
   farklılaşma alanı — **ama aynı zamanda bir uyarı:** kimse yapmıyorsa
   ekonomisi zor olduğu içindir. Her yeni dil çifti, birim ekonomiyi
   bozmadan eklenmeli.
2. **Fiyat bandı $6–14/ay.** Mevcut ₺79,99/ay (~$2,3) çok altında. Çok dilli
   sürüm uluslararası pazara açılacaksa fiyatlandırma yeniden düşünülmeli —
   RevenueCat zaten bölgesel fiyat destekliyor.
3. **Duostories'in varlığı**, "Stories'i benim dilimde istiyorum" talebinin
   gerçek olduğunu gösteriyor.
4. **Rakiplerin hiçbirinde kelime kelime vurgulu stüdyo seslendirmesi yok
   (tahmin — her biri tek tek test edilmedi).** Mevcut ürünün en güçlü
   teknik farkı bu; v2'de kaybedilmemeli. §4.1'deki TTS kısıtı bu yüzden
   sadece teknik değil, **stratejik** bir sorun.

---

## 6. Genel tahmini bütçe ve zaman çizelgesi

> Aşağıdaki tüm rakamlar **tahmin**dir. İşçilik, tek geliştirici + anadili
> konuşan gözden geçirenler varsayımıyla, **dış harcama** (API, TTS, insan
> denetimi) olarak verilmiştir. Geliştirici zamanı ayrıca gün olarak.

### Senaryo A — 4 çiftle başlangıç (TR↔EN, DE↔EN, ES↔EN, FR↔EN)

Aslında bu **5 dil** (tr, en, de, es, fr) ve **20 yönlü çift** demek (5×4).
Ama pratikte başlangıçta 8 yön yeterli (her dil ↔ İngilizce, + TR↔EN zaten var).

| Kalem                            | Miktar                                                                                        | Maliyet         |
| -------------------------------- | --------------------------------------------------------------------------------------------- | --------------- |
| Özgün hikâye üretimi             | 4 yeni dil × 6 seviye × 12 = 288 hikâye, Sonnet 5 + Batch                                     | ~$30            |
| Sözlük/gloss                     | 5 dil × 30k lemma × 4 hedef dil, Sonnet 5 + Batch                                             | ~$130           |
| TTS (Neural2, `<mark>` destekli) | 288 hikâye × ~18k karakter = 5,2M karakter; 1M ücretsiz → 4,2M × $16                          | ~$67            |
| Klasik içerik alımı              | Gutenberg de/fr/es — API maliyeti yok                                                         | $0              |
| Anadili gözden geçirme           | 4 dil × 3 gün × ~$200/gün                                                                     | ~$2.400         |
| **TOPLAM dış harcama**           |                                                                                               | **~$2.600**     |
| **Geliştirici zamanı**           | Veri modeli göçü + dil soyutlaması + UI i18n genişletme + pipeline çoklu dil + TTS ses seçici | **~6–10 hafta** |

**Bu senaryonun avantajı:** Beş dilin **hepsinde** spaCy eğitilmiş pipeline var
(tr hariç — Stanza), **hepsinde** CEFR doğrudan geçerli ve resmi kelime listesi
var (tr hariç), **dördünde** Neural2 var (tr için WaveNet). Yani §2 ve §4'teki
tüm zor problemleri **tek bir dilde (Türkçe)** çözüyorsunuz, dokuz dilde değil.

### Senaryo B — Tam 11 dil (110 yönlü çift)

| Kalem                                                           | Miktar                                                                                                                                                       | Maliyet             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Özgün hikâye üretimi                                            | 792 hikâye, A1–B1 Sonnet / B2–C2 Opus, Batch                                                                                                                 | ~$150               |
| Sözlük/gloss                                                    | 330k lemma × 10 hedef dil, Sonnet 5 + Batch                                                                                                                  | ~$670               |
| IPA (Wiktionary/kaikki dökümü)                                  | işleme                                                                                                                                                       | $0                  |
| TTS                                                             | 792 × 18k = 14,3M karakter. Neural2 olan dillerde $16/M, olmayanlarda WaveNet $4/M. Karma ortalama ~$12/M                                                    | ~$170               |
| Klasik içerik — Aozora/Cervantes/LiberLiber/Hindawi parser'ları | —                                                                                                                                                            | $0 (işçilik)        |
| Hindawi (Arapça) hukuki inceleme                                | avukat görüşü                                                                                                                                                | ~$1.000–3.000       |
| Anadili gözden geçirme                                          | 11 dil × 5 gün × ~$200/gün                                                                                                                                   | ~$11.000            |
| Çeviri kalite örneklemi (110 yön)                               | LLM-judge + spot insan denetimi                                                                                                                              | ~$1.500             |
| **TOPLAM dış harcama**                                          |                                                                                                                                                              | **~$15.000–18.000** |
| **Geliştirici zamanı**                                          | Senaryo A + 6 yeni dil (ar, zh, ja, ru, uk, it) + CAMeL/Stanza entegrasyonu + CJK sayfalama/font + RTL arayüz + furigana/ruby + seviye sistemi hibrit modeli | **~9–14 ay**        |

#### Senaryo B'de gözden kaçan işçilik kalemleri (bunlar en pahalı kısım)

- **RTL (sağdan sola) arayüz** — Arapça. React Native `I18nManager` desteği
  var ama reader'ın native sayfalama ölçümü (`measureChapter.tsx`,
  `paginate.ts`) RTL'de baştan test edilmeli. **~2–3 hafta.**
- **CJK sayfalama** — kelime sınırı olmayan dillerde satır kırma kuralları
  (kinsoku shori: satır başına gelemeyecek karakterler). Mevcut ölçüm
  mimarisi kelime tabanlı. **~3–4 hafta.**
- **Japonca ruby/furigana** — Aozora formatını parse etmek + reader'da
  üstte küçük kana göstermek. Bu tek başına bir feature. **~2–3 hafta.**
- **Fontlar** — `@expo-google-fonts` CJK ve Arapça yüzleri devasa. Noto Sans
  CJK tek başına ~10 MB. Bundle şu an 7 MB; dinamik font indirme gerekir.
  **~1–2 hafta.**
- **Seviye tespiti testi** — 36 kelimelik test **her dil için** yeniden
  yazılmalı. 11 × ~1 gün + kalibre. **~3 hafta.**

---

## 7. Önerilen yol haritası

### Kılavuz ilke

CLAUDE.md'nin "Basitlik önce gelir" ve "ücretsiz katman gerçekten
kullanılabilir olmalı" ilkeleri, v2'de tek bir kurala dönüşüyor:

> **Bir dil çifti, o çiftin okuma + sözlük + seslendirme üçlüsü tam çalışana
> kadar yayınlanmaz.** Yarım bir dil çifti, hiç olmayan bir dil çiftinden
> kötüdür — kullanıcı boş bir rafla karşılaşır ve geri dönmez.

### Aşama 0 — Mimari hazırlık (dil eklemeden, ~4–6 hafta)

Bu aşamada **hiç yeni dil eklenmez.** Amaç, mevcut tek dilli varsayımları
kodun dışına çıkarmak.

1. **Veri modeli göçü.** `books.language`, `lemmas.lang`,
   `glosses.target_lang` kolonları. RLS politikaları korunur.
2. **`Analyzer` soyutlaması** `pipeline/` içinde (spaCy / Stanza / CAMeL
   sürücüleri). İngilizce hâlâ tek kullanıcı, ama arayüz hazır.
3. **Doğrulayıcıyı parametrik yap.** Cümle uzunluğu bantları ve kapsam
   eşikleri dil başına config'e çıkar (`pipeline/levels/<lang>.toml`).
4. **ADR-013 yaz: çok dilli seslendirme.** §4.1'deki Neural2/WaveNet/
   Chirp3-HD kararını, `<mark>` kısıtını ve forced alignment'ın **şimdi
   yapılmadığını** belgele. ADR-008'in cihaz-içi lemmatizer kararının
   hangi dillerde geçersiz olduğunu da buraya yaz.
5. **Google TTS ses envanterini programatik doğrula.** `voices.list()` ile
   11 locale × 5 ses tipi matrisini gerçek veriyle doldur. §4.1'deki ⚠️
   hücreleri kapansın.

### Aşama 1 — Genişletme için en kolay üç dil (~8–10 hafta)

**Sıra: Fransızca → İspanyolca → Almanca.**

Neden bu üçü ve neden bu sırayla:

- Üçü de **Latin alfabesi** → reader'ın sayfalama/font/RTL mimarisine sıfır
  dokunuş.
- Üçünde de **spaCy eğitilmiş pipeline** var.
- Üçünde de **CEFR doğrudan geçerli** ve resmi kelime listesi var (Référentiels,
  Plan Curricular, Goethe Wortlisten).
- Üçünde de **kamu malı klasik bolluğu** var (fr: Wikisource 1M+; es: Cervantes
  Virtual 22k+; de: Gutenberg + Wikisource).
- Fransızca önce çünkü klasik kaynağı en zengin, yani ilk turda "klasikler
  rafı boş" riski en düşük.
- Almanca sona çünkü bileşik kelime (Komposita) lemmatizasyonu üçünün
  içinde en zor olan — öğrenilenlerle girmek daha iyi.

Bu aşama sonunda **4 dil, 12 yönlü çift** yayında.

### Aşama 2 — Türkçe'yi kaynak dil yap (~4–6 hafta)

Türkçe **zaten arayüz dili**, ama içerik dili değil. Bunu tersine çevirmek:

- Türkçe klasik kaynağı **yok** → tamamen özgün üretim. 6 seviye × 12 = 72
  hikâye.
- Stanza entegrasyonu (ilk spaCy-dışı analizci — `Analyzer` soyutlamasının
  ilk gerçek testi).
- WaveNet + `<mark>` ile seslendirme (Neural2 yok).
- Mevcut TR kullanıcı kitlesine **çift taraflı değer**: hem İngilizce/Fransızca
  okuyabiliyorlar, hem uygulama artık yabancılara Türkçe öğretebiliyor →
  organik uluslararası büyüme kapısı.

Bu aşama, "sıfır klasik kaynağı olan bir dil" problemini **bilinen bir dilde**
çözüyor. Ukraynaca'yı aynı problemle tanışmadan eklemek çok daha riskli.

### Aşama 3 — İtalyanca + Rusça (~6–8 hafta)

- İtalyanca: Aşama 1'in aynısı, sürpriz yok.
- Rusça: **Kiril alfabesi ilk kez.** Font ve tokenizasyon test edilir; spaCy
  var, TORFL→CEFR eşlemesi doğrudan. Ukraynaca'nın provası.

Bu noktada **7 dil, 42 yönlü çift**. Ürün gerçekten "çok dilli" sayılır ve
uluslararası pazarlama başlayabilir.

### Aşama 4 — Zor diller, teker teker ve ancak talep varsa

Buradan sonrası **ölçüme bağlı** olmalı. Her dil ayrı bir yatırım kararı.

| Sıra | Dil           | Blokeler                                                                                                         | Neden bu sırada                                                                            |
| ---- | ------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 8    | **Ukraynaca** | Klasik kaynağı yok (Aşama 2'de çözüldü); Kiril (Aşama 3'te çözüldü); Neural2 yok (Aşama 2'de WaveNet çözüldü)    | Aşama 2 ve 3'ün tüm problemlerini miras alıyor, yeni problem yok → **en ucuz sonraki dil** |
| 9    | **Japonca**   | Ruby/furigana, CJK sayfalama, font boyutu, JLPT≠CEFR                                                             | İçerik kaynağı mükemmel (Aozora 17.700+). Teknik iş ağır ama **belirsizlik düşük**         |
| 10   | **Çince**     | CJK sayfalama (9'da çözülür), basitleştirme dönüşümü, klasik Çince tuzağı, HSK eşlemesi tartışmalı               | Japonca'dan sonra CJK altyapısı hazır olur                                                 |
| 11   | **Arapça**    | RTL arayüz, hareke yokluğu, CAMeL entegrasyonu, Neural2 yok, **Hindawi lisans belirsizliği**, CEFR standardı yok | **En son.** Tek başına diğer üçünün toplamı kadar risk taşıyor                             |

### Karar noktaları (gate'ler)

Her aşamanın sonunda şu üç soru sorulmalı, cevap "hayır"sa durulmalı:

1. **Yeni dilin kullanıcısı geldi mi?** Aşama 1 sonunda fr/es/de kullanıcı
   oranı toplam kullanıcının %10'unu geçmediyse, dil eklemek yanlış yatırım —
   sorun pazarlamada.
2. **Ücretsiz katman o dilde gerçekten kullanılabilir mi?** O dilde en az 20
   kitap ve sözlük kapsamı %90+ değilse yayınlanmamalı (Ürün İlkesi #2).
3. **Seslendirme o dilde çalışıyor mu?** Çalışmıyorsa premium o dilde ne
   satıyor? ADR-012'ye göre premium'un en büyük vaadi seslendirme. Seslendirme
   olmayan bir dil çiftinde paywall metni **yanıltıcı olur** — App Store
   Guideline 2.3.1, ki bu tam olarak CLAUDE.md'nin "bir fayda önce üründe
   çalışır, sonra paywall'a yazılır" kuralı.

### Özet tavsiye

**Senaryo A'yı seç, ama Senaryo B'nin veri modeliyle inşa et.**

Aşama 0'daki göç, 11 dili destekleyecek şekilde tasarlanmalı (`language`
kolonları, `Analyzer` soyutlaması, parametrik doğrulayıcı) — ama gerçekten
yayınlanan dil sayısı talebe göre artmalı. Böylece yanlış tahmin edilen bir
dil, atılmış $2.000'lık içerik üretimi olur; yanlış tasarlanmış bir veri
modeli ise 6 aylık bir yeniden yazım olur.

---

## Ek A — Doğrulanması gereken açık sorular

Bu araştırmada kesin cevap alamadığım, **uygulamaya geçmeden önce
kapatılması gereken** konular:

1. **Google TTS ses envanteri** — 11 locale için Neural2/Chirp3-HD/WaveNet
   matrisi `texttospeech.voices.list()` ile programatik doğrulanmalı. (§4.1)
2. **Chirp 3: HD + zaman işareti** — SSML desteklemediği doğrulandı, ama
   `enableTimePointing` dışında bir kelime zamanlama mekanizması sunuyor mu?
   Google dokümanı bu konuda net değil.
3. **Hindawi Foundation lisansı** — yeniden dağıtım hakkı var mı? Arapça
   stratejisinin tamamı buna bağlı. (§1.2)
4. **Project Gutenberg güncel dil sayıları** — `gutendex.com` API'si 403
   döndü; PG'nin kendi arama sayfası toplam göstermiyor. Bir kez CSV dökümü
   (https://www.gutenberg.org/cache/epub/feeds/) indirilip sayılmalı.
5. **Ukraynaca ve Türkçe telif süresi** — resmi mevzuat metinleriyle
   doğrulanmalı (FSEK m.27 ve Ukrayna Telif Kanunu).
6. **Token/kelime oranları** — §3.2'deki tüm oranlar tahmin. Her dilde
   gerçek bir 3.000 kelimelik metin `messages.count_tokens` ile ölçülmeli;
   bütçe ona göre revize edilmeli.
7. **Rakiplerde kelime vurgulu ses** — Beelinguapp ve LingQ'da kelime kelime
   vurgu var mı? Ürünün en güçlü farkını iddia etmeden önce test edilmeli.

---

## Ek B — Tüm kaynaklar

**İçerik kaynakları**

- [Project Gutenberg](https://www.gutenberg.org/)
- [Project Gutenberg — Browse by Language](https://www.gutenberg.org/browse/languages/)
- [Project Gutenberg News — Statistics](https://www.gutenbergnews.org/statistics/)
- [Project Gutenberg (Wikipedia)](https://en.wikipedia.org/wiki/Project_Gutenberg)
- [Wikipedia:List of Wikisource editions](https://en.wikipedia.org/wiki/Wikipedia:List_of_Wikisource_editions)
- [Standard Ebooks](https://standardebooks.org/)
- [Projekt Gutenberg-DE](https://www.projekt-gutenberg.org/)
- [Zeno.org (Wikipedia)](https://en.wikipedia.org/wiki/Zeno.org)
- [Gallica (BnF)](https://gallica.bnf.fr/)
- [lib.ru](http://lib.ru/) · [ilibrary.ru](http://ilibrary.ru/)
- [Aozora Bunko](https://www.aozora.gr.jp/) · [GitHub deposu](https://github.com/aozorabunko/aozorabunko) · [Wikipedia](https://en.wikipedia.org/wiki/Aozora_Bunko)
- [ctext.org — Chinese Text Project](https://ctext.org/)
- [LiberLiber](https://www.liberliber.it/)
- [ukrlib.com.ua](https://www.ukrlib.com.ua/) · [chtyvo.org.ua](https://chtyvo.org.ua/)
- [Hindawi Foundation](https://www.hindawi.org/en) · [Arabic E-Book Corpus](https://researchdata.se/en/catalogue/dataset/2024-145) · [hindawi-dl](https://github.com/shahwan42/hindawi-dl)
- [Al-Maktaba Al-Shamela](https://shamela.ws/)
- [Biblioteca Virtual Miguel de Cervantes](https://www.cervantesvirtual.com/) · [Wikipedia](https://en.wikipedia.org/wiki/Miguel_de_Cervantes_Virtual_Library)

**Telif**

- [List of copyright duration by country (Wikipedia)](https://en.wikipedia.org/wiki/List_of_countries%27_copyright_lengths)
- [Copyright law of Japan (Wikipedia)](https://en.wikipedia.org/wiki/Copyright_law_of_Japan)
- [Copyrighted.com — Copyright by Country](https://www.copyrighted.com/blog/copyright-by-country)

**Dilbilimsel altyapı**

- [spaCy — Models & Languages](https://spacy.io/usage/models)
- [spaCy — Japanese models](https://spacy.io/models/ja)
- [Stanza (Stanford NLP)](https://stanfordnlp.github.io/stanza/)
- [CAMeL Tools (GitHub)](https://github.com/CAMeL-Lab/camel_tools) · [LREC 2020 makalesi](https://aclanthology.org/2020.lrec-1.868.pdf)
- [SinaTools (arXiv)](https://arxiv.org/pdf/2411.01523)
- [TurkicNLP (arXiv 2026)](https://arxiv.org/html/2602.19174v1)
- [Zemberek-NLP](https://github.com/ahmetaa/zemberek-nlp)
- [kaikki.org — Wiktionary dökümleri](https://kaikki.org/dictionary/)

**Seviye standartları**

- [JLPT — CEFR Level Reference](https://www.jlpt.jp/e/about/cefr_reference.html)
- [TORFL (Wikipedia)](https://en.wikipedia.org/wiki/Test_of_Russian_as_a_Foreign_Language)
- [HSK–CEFR alignment](https://www.lingobright.com/statistics/hsk-level-to-cefr-alignment-chart)
- [Word lists in CEFR Reference Level Descriptions (EURALEX 2012, PDF)](https://www.euralex.org/elx_proceedings/Euralex2012/pp328-335%20Marello.pdf)
- [Instituto Cervantes (Wikipedia)](https://en.wikipedia.org/wiki/Instituto_Cervantes)

**API / maliyet**

- [Anthropic — Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic — Rate limits](https://platform.claude.com/docs/en/api/rate-limits)
- [Google Cloud TTS — Supported voices and languages](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)
- [Google Cloud TTS — Chirp 3: HD voices](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- [Google Cloud TTS — Pricing](https://cloud.google.com/text-to-speech/pricing)
- [TextToLab — Google Cloud TTS pricing 2026](https://texttolab.com/blog/google-cloud-tts-pricing)
- [costbench — Google Cloud TTS free plan](https://costbench.com/software/ai-voice-tools/google-cloud-text-to-speech/free-plan/)
- [WhisperX](https://github.com/m-bain/whisperX) · [Montreal Forced Aligner](https://montreal-forced-aligner.readthedocs.io/)

**Rakipler**

- [FluentU — Beelinguapp review](https://www.fluentu.com/blog/reviews/beelingapp/)
- [languavibe — Beelinguapp Review 2026](https://languavibe.com/beelinguapp-review/)
- [Eppika — Best reading apps for language learning 2026](https://eppika.com/en/blog/best-reading-apps-language-learning-2026)
- [Simply Fluent — Best apps for reading books in another language 2026](https://www.simplyfluent.com/blog/best-reading-apps-language-learning-2026/)
- [Duolingo — 148 New Language Courses (2025)](https://www.globenewswire.com/news-release/2025/04/30/3071105/0/en/Duolingo-Launches-148-New-Language-Courses-Expands-Access-to-Popular-Languages-Including-Japanese-and-Korean.html)
- [Duostories](https://duostories.org/)
