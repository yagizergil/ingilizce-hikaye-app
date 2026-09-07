# Sanat Yönü — 3 Öneri

Bu doküman kod içermez. Amaç, uygulamanın *karakterini* seçmek —
renk paleti seçimi değil. Her yön Ana Sayfa (kitaplık) ekranının
gerçek verilerle (5 kitap, gerçek kapaklar) statik HTML mockup'ını
içerir: `mockups/direction-a.html`, `mockups/direction-b.html`,
`mockups/direction-c.html`. 390px genişlik, telefon oranı.

Not: `/mnt/skills/public/frontend-design/SKILL.md` bu ortamda mevcut
değildi; bu doküman doğrudan CLAUDE.md ürün ilkeleri ve
`docs/CATALOG.md`'deki gerçek katalog verisiyle hazırlandı.

---

## Yön A — "Fihrist" (Arşiv / Kütüphane Kataloğu)

### 1. Karakter
Bu uygulama **eski bir üniversite kütüphanesinin ödünç alma
fihrist kartlarını dijitalleştirmiş** gibi hissettirir. Kullanıcı bir
"uygulama" değil, bir kataloğa bakıyormuş hissi alır.

### 2. Tipografik karar
Tek font ailesi: **Source Serif 4**, hem başlıklarda hem gövdede hem
okuma metninde. Neden tek aile: bu yön "UI" ile "içerik" arasındaki
sınırı bilerek eritiyor — her şey basılı sayfa gibi görünsün istiyoruz,
sans-serif bir arayüz katmanı bu hissi kırar. Etiketler (seviye, sekme
adları) küçük, tracked (harf aralığı açılmış) versal harflerle —
gerçek small-caps değil, taklidi (`letter-spacing:.12em; text-transform:
uppercase; font-size:11px`). Ölçek 4 kademeli ve dar bir oranla kurulu
(11 → 13 → 19 → 30px) — çünkü bu yönde çeşitlilik boşluktan ve
italik/versal kontrastından geliyor, boyuttan değil.

### 3. Renk mantığı
2 renk: sıcak, hafif sararmış kağıt tonu (`#F6F1E7`) zemin + tek bir
"mühür kırmızısı" accent (`#8A3B2B`, eski kütüphane damgalarının
rengi). Nötr sıcak — griye değil, kağıda yakın. Accent sadece seviye
etiketinde ve alt çizgide kullanılır, başka hiçbir yerde — bir
uygulamada "vurgu rengi her yerde parlar" hissini bilerek reddediyoruz.

### 4. Düzen ilkesi
**Kart yok.** Bilgi hiyerarşisi tamamen ince yatay çizgilerle (hairline
rule) kurulu — tıpkı bir fihrist defteri gibi. Her satır bir "kayıt":
sıra numarası (No. 01, No. 02...) + kapak küçük resmi + başlık +
yazar (italik) + seviye/süre. Gölge yok, köşe yuvarlama yok (kapaklar
bile keskin köşeli, sadece 1px ince kontur). Yoğunluk orta-yüksek —
bu bir kataloğun yoğunluğu, ama satır arası boşluk (22px padding)
nefes alanı bırakıyor.

### 5. Risk
Çok "arşivsel/soğuk" durabilir — samimiyetsiz, akademik hissettirebilir.
20 dakikalık bir okuma seansına girmeden önce kullanıcıyı "ders
çalışıyormuş" gibi hissettirme riski var. Ayrıca tamamen serif UI,
küçük ekranlarda (buton, sekme etiketi gibi) okunabilirlik açısından
sans-serife göre biraz daha zorlayıcı olabilir.

---

## Yön B — "Okuma Odası" (Sakin Modern Kindle)

### 1. Karakter
Bu uygulama **sessiz bir çalışma odasında, akşamüstü ışığıyla
okunan bir kitap** gibi hissettirir. En az görsel gürültü, en çok
güven — "bu uygulama beni okumaktan alıkoymayacak" hissi.

### 2. Tipografik karar
İki font, net görev ayrımı: UI için **Inter** (nötr, sessiz, grotesk —
kendini göstermeyen bir arayüz fontu), okuma ve kitap başlıkları için
**Literata** (Google'ın e-okuma için tasarladığı, ekranda düşük
çözünürlükte bile okunaklı serif). Ölçek 6 kademeli, 1.25 oranına
yakın bir tip skalası (11 → 12 → 13 → 15 → 16 → 26px) — Things 3'teki
gibi *az ama kararlı* adımlar, her metin bloğunun net bir rolü var.
Kitap başlıkları her zaman Literata'da — bu, "içerik" ile "arayüz
kromu" arasındaki farkı okuyucuya hissettiren tek ayraç.

### 3. Renk mantığı
3 nötr + 1 accent. Nötr **sıcak** (griye kaçmayan, kağıda yakın
`#FAF8F4` zemin, `#1E1C19` neredeyse-siyah mürekkep tonu metin,
`#8A8378` ikincil metin). Accent **kille/toprakla** ilişkili bir
**turuncu-kahve (`#A6572E`, "clay")** — kitap cildi rengi çağrıştırıyor,
dijital bir marka rengi gibi durmuyor. Accent sadece ilerleme/durum
bilgisinde kullanılır (ör. "kaldığın yer" kartındaki yüzde), dekorasyon
için değil.

### 4. Düzen ilkesi
Neredeyse kart yok — sadece "kaldığın yer" (continue reading) bloğu
hafifçe ayrılmış, o da çerçeve değil, üstündeki ince çizgiyle. Kitap
listesi ince hairline'larla ayrılmış satırlar (Yön A'ya benzer ama
daha ferah: 78px kapak, daha çok boşluk, sans-serif meta bilgi).
Ferahlık önceliği: dikey ritim geniş (satır başına ~18px padding +
78px kapak yüksekliği demek satır ~114px). Gölge/kalın border yok.

### 5. Risk
En "güvenli" seçenek olduğu için en az akılda kalıcı olabilir —
"iyi tasarlanmış ama unutulabilir" riski taşıyor. LingQ/Readlang'den
farkı incelikli (tipografi + boşluk kalitesi), ilk bakışta çarpıcı
bir "imza" öğesi yok; kullanıcı ekran görüntüsünü paylaştığında
"bu neyin uygulaması" sorusunu Yön A veya C kadar güçlü tetiklemeyebilir.

---

## Yön C — "Baskı Atölyesi" (Editöryal / Objeye Dönük)

### 1. Karakter
Bu uygulama **butik bir baskı atölyesinin kataloğu / tasarımcı bir
yayınevinin web sitesi** gibi hissettirir. Kitaplar burada birer
"obje" — her birinin kendi kimliği (rengi) var, tıpkı bir kitap
sırtının rengi gibi.

### 2. Tipografik karar
İki font, güçlü kontrastla: başlıklarda **Fraunces** (ink-trap
kesimleri olan, karakterli, "el yapımı baskı" hissi veren bir display
serif — Literata/Source Serif'ten kasıtlı olarak daha "kişilikli" ve
daha büyük boyutlarda kullanılır: 40px ana başlık, 20px kitap başlığı),
metadata ve etiketlerde **IBM Plex Mono** — kelime sayısı, bölüm
sayısı, süre gibi "ölçülebilir" bilgiler mono'da, bir kataloğun
teknik föyü gibi. Bu ayrım bilinçli: Fraunces *duygusal/editöryal*,
Plex Mono *bilgi/teknik* katmanını taşır — okuyucu ikisini otomatik
ayırt eder.

### 3. Renk mantığı
Zemin tek bir kağıt tonu (`#F1EEE6`), ama her kitabın kendi **"sırt
rengi"** var — 5 kitap için 5 farklı, birbirine karışmayan ama hepsi
düşük doygunluklu/mürekkep-karışımlı ton (oxblood, şişe yeşili, hardal,
arduvaz mavisi, erik moru — parlak/neon hiçbiri değil). Bu renkler
sadece seviye rozetinin konturunda ve kapak üzerine %16 opaklıkta
multiply blend olarak kullanılıyor — kapak fotoğrafını boyamıyor,
sadece ince bir ton ekliyor. Mantık: her kitap görsel olarak
"kendi kimliğiyle" ayrışsın, ama palet bir bütün olarak sakin kalsın.

### 4. Düzen ilkesi
Kart **var** — ama bu yönde bilinçli bir seçim, çünkü her kart bir
"obje kartı" (fiziksel bir kitabı temsil ediyor), UI kartı değil.
Asimetrik grid: sol sabit genişlikte kapak sütunu (88px), sağda
değişken içerik. Gölge yok, ince bir üst çizgi (nav ayırıcı) dışında
kalın border yok, köşeler keskin. Tipografik kontrast (40px başlık
vs 10px mono meta) hiyerarşiyi kart/kutu olmadan da net kurar.

### 5. Risk
En "kişilikli" yön olduğu için en çabuk yorulma riski taşır — 5 kitap
ötesine (50, 100 kitap) ölçeklendiğinde her kitaba özel renk atama
sistemi karmaşıklaşabilir ve görsel gürültüye dönüşebilir. Ayrıca mono
font metadata'da okunabilirlik açısından güçlü ama "sıcak/samimi"
hissinden en uzak durabilir — CLAUDE.md'nin istediği "sıcak, kitapsı"
tondan Yön A/B'ye göre daha uzak, "soğuk-editöryal"e daha yakın.

---

## Önerim

**Yön B ("Okuma Odası") temel alınmalı, Yön C'nin "her kitabın kendi
rengi" fikri (madde 3) BookCover fallback'i için ödünç alınmalı.**

Gerekçe: Ürün ilkesi #1 ("okuma ekranı kutsaldır") ve hedef kullanıcı
tanımı (20-40 dakika kesintisiz okuma) en çok Yön B'nin "sessiz oda"
karakteriyle örtüşüyor — bu bir kütüphane kataloğu (Yön A) ya da bir
tasarım stüdyosu portföyü (Yön C) değil, günlük kullanılacak bir okuma
aracı. Yön A güçlü ve özgün ama "arşivsel" tonu her gün açılan bir
uygulama için fazla mesafeli; Yön C en "Twitter'da paylaşılası" olan
ama 100+ kitaba ölçeklenmesi zor ve CLAUDE.md'nin "sıcak" hedefinden
sapıyor.

Öneri: Yön B'nin tipografi sistemi (Inter + Literata net ayrımı),
renk mantığı (tek clay accent) ve düzen ilkesi (kart yok, hairline)
birebir alınsın; Yön C'den sadece *BookCover fallback renginin*
kitaba göre deterministik ama düşük doygunluklu bir palet olması
fikri devralınsın (mevcut "renkli baş harf" yerine). Yön A'dan hiçbir
öğe alınmasını önermiyorum — iki yönü karıştırmak yerine net bir
karakterde kalmak, "önceki tasarım denemesinin" tekrar etmemesi için
daha güvenli.

Karar sizin — üç mockup'ı da inceleyip onaylayın ya da harmanlama
talimatı verin, onay olmadan implementasyona geçmiyorum.
