# Büyüme Önerileri — Conversion ve Retention (1.1 ve sonrası)

> Tarih: 2026-09-07. Bağlam: 1.0 App Store incelemesine gönderildi. Bu belge
> yayın sonrası ilk iki-üç sürüm için karar verilebilir öneriler içerir.
>
> **Kanıt etiketleri:** Her iddianın yanında ya bir kaynak bağlantısı vardır
> ya da `[TAHMİN]` etiketi. `[TAHMİN]` etiketli hiçbir sayı bir kaynağa
> dayanmıyor; ürün muhakemesidir ve telemetriyle doğrulanmalıdır.
> `[VERİ YOK]` etiketi, aradım ama yayınlanmış rakam bulamadım demektir.

---

## 0. Yönetici özeti

Üç cümlelik teşhis:

1. **Ürünün en büyük conversion sorunu paywall'da değil, katalogda.** A2'de
   8 dakikalık hikâyeden sonra 197 dakikalık klasiğe atlayan bir kullanıcı
   premium'u değerlendirecek kadar uzun kalmıyor. B1 boşluğu bir "içerik
   işi" ama muhtemelen en yüksek ROI'li iş.
2. **Ücretsiz deneme kodu hazır ama muhtemelen ürün tarafında tanımlı
   değil.** `src/features/paywall/planModel.ts` içindeki `readTrial()`
   RevenueCat paketinden deneme süresini zaten okuyor ve i18n'de
   `ctaTrial`, `legal.trialThenPrice` anahtarları hazır. Bu, App Store
   Connect / RevenueCat konfigürasyon işi — kod işi değil. Sektörde
   denemeler dönüşümün ana motoru.
3. **Elimizde rakiplerin çoğunda olmayan bir veri var:** kitap başına CEFR
   kapsam dağılımı (`books.coverage_a1..c2`, `off_list_ratio`) ve kullanıcı
   başına lemma durumu (`user_lemma_state`, `book_lemmas`). Bu ikisini
   çarpınca "bu kitabın %96'sını zaten biliyorsun" diyebiliyoruz. Okuma
   araştırmasının %98 kapsam eşiği bunu pedagojik olarak da doğruluyor.
   Hiçbir rakip Türk kullanıcıya bunu söylemiyor.

**İlk 3 iş:** (1) B1 köprüsü içeriği, (2) ücretsiz deneme + onboarding sonu
paywall, (3) kişisel uygunluk rozeti + bilinen kelime sayacı.

---

## 1. Rakip mekanikleri ve yayınlanmış veri

### 1.1 Duolingo — streak ve leaderboard (en iyi belgelenmiş vaka)

Jorge Mazal'ın (eski Head of Product) yazdığı vakada dört yılda DAU 4,5
katına çıktı. Kritik nokta: en yüksek etkili kaldıraç yeni kullanıcı değil,
**mevcut kullanıcı elde tutma oranı (CURR)** çıktı.

| Mekanik                                                                        | Yayınlanmış sonuç                                                                                                                       | Kaynak                                                                                      |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Genel retention çalışması                                                      | CURR **+%21**, günlük churn **-%40'tan fazla**                                                                                          | [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth) |
| Streak (dondurma, tamir, takvim görünümü, animasyon, "streak-saver" bildirimi) | 7+ günlük serisi olan DAU payı **~3 katına, %50'nin üzerine** çıktı. Alt özelliklerin tek tek yüzdesi yayınlanmadı.                     | Aynı kaynak                                                                                 |
| Leaderboard / lig                                                              | Öğrenme süresi **+%17**; günde 1+ saat, haftada 5 gün çalışan kullanıcı sayısı **3 katına** çıktı; D1/D7 istatistiksel anlamlı iyileşti | Aynı kaynak                                                                                 |
| Push bildirimleri                                                              | "Onlarca küçük/orta kazanım", yıllar içinde birikerek ciddi DAU etkisi. **Tek tek yüzde yayınlanmadı.**                                 | Aynı kaynak                                                                                 |
| Widget, sosyal, okul, TikTok                                                   | Başarılı olduğu söyleniyor, **rakam yok**                                                                                               | Aynı kaynak                                                                                 |

Bizim için okuma: 10 günlük seriye ulaşan kullanıcının bırakma olasılığı
belirgin düşüyor. **Bizim ürünümüzde seri zaten var** (`StreakChip`,
`StreakCard`, `record_reading_session`), ama seri _kurtarma_ ve _günlük
hedef_ yok — Duolingo'nun asıl kazandığı yer orası.

### 1.2 Headway — okuma/özet kategorisinde alışkanlık oyunlaştırması

Headway, Blinkist kategoriyi kurduktan çok sonra girmesine rağmen en çok
indirilen özet uygulaması oldu (50M+ kullanıcı iddiası, şirketin kendi
beyanı). Mekanik seti bizim ürünümüze en yakın olanı: **streak + günlük
hedef + challenge + özet sonrası flashcard + aralıklı tekrar.** Yani
"pasif tüketimi aktif hatırlamaya çeviren" katman.
([Headway](https://makeheadway.com/blog/what-is-the-headway-app-and-how-does-it-work/))
Bağımsız doğrulanmış lift rakamı **[VERİ YOK]**.

Bizde SRS zaten var ama **okuma ile SRS arasındaki köprü zayıf**: bölüm
bitince kullanıcıya "az önce kaydettiğin 4 kelime" gösterilmiyor.

### 1.3 LingQ — "bilinen kelime" sayacı

LingQ'nun çekirdek motivasyon metriği bilinen kelime sayacı: 1K → 5K → 10K
→ 30K kilometre taşları. Kullanıcılar bunu "aylar-yıllar boyunca takip
edilen zaman çizelgesi" olarak tanımlıyor; dil öğrenmede asıl sorun olan
"balayı dönemi sonrası bırakma"ya karşı çalışıyor.
([Lingtuitive incelemesi](https://lingtuitive.com/blog/lingq-review))

Aynı incelemelerdeki eleştiri de önemli ve tasarımı etkilemeli: sayaç
gerçek yetkinliği **abartıyor** ("bayrağı kaldırdığın kelime sayısı"), bazı
kullanıcılara okumayı "veritabanı bahçıvanlığı"na çeviriyor gibi geliyor.
→ Bizde sayaç **tahmin** olarak sunulmalı, sertifika gibi değil.

Ölçülmüş retention lift **[VERİ YOK]**.

### 1.4 Beelinguapp / Cake / Readlang / Blinkist

Bu dördü için yayınlanmış, bağımsız doğrulanmış conversion/retention lift
rakamı **[VERİ YOK]**. Mekanik gözlemi olarak:

- **Beelinguapp:** yan yana iki dilli metin + karaoke ses. Bizim ürünümüzde
  ses yok ve planlanmıyor; **yan yana çeviri** ise ürün felsefemize aykırı
  (kelime/cümle bazında yardım veriyoruz, tam çeviri okumayı öldürür).
  Alınacak ders sınırlı.
- **Cake:** kısa video + günlük tek ders; asıl mekanik "günlük mikro
  içerik" ve bildirim. Bizde karşılığı "günün hikâyesi/kelimesi".
- **Readlang:** tarayıcı eklentisi, tıkla-çevir + otomatik flashcard.
  Bizim reader'ımızın zaten yaptığı şey; farkımız kürasyonlu katalog.
- **Blinkist/Headway:** ödeme mimarisi dersi — yıllık planı ağır basan
  2 planlı paywall + deneme. Bizde zaten yıllık ön seçili.

### 1.5 Abonelik ekonomisi kıyaslamaları (Eğitim kategorisi)

RevenueCat State of Subscription Apps 2026, Eğitim kategorisi medyanları:

| Metrik                             | Eğitim medyanı                             |
| ---------------------------------- | ------------------------------------------ |
| İndirme → deneme (D30)             | **%6,5**                                   |
| İndirme → ödeme (D35)              | **~%2,0** (İş %2,6 ile Oyun %1,0 arasında) |
| D14 gelir/indirme (RPI)            | **$0,30**                                  |
| Yıllık plan ödeyen başına RLTV     | **$22,82**                                 |
| Medyan yıllık fiyat                | **$39,99**                                 |
| Denemelerin Gün 0'da başlama oranı | **%78**                                    |

([RevenueCat SOSA 2026 — Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education))

Deneme süresi etkisi: 17–32 günlük denemeler **%45,7** deneme→ödeme
medyanıyla en yükseği; 3–7 günlük denemeler **%26,8**.
([Airbridge / SOSA & Adapty derlemesi](https://www.airbridge.io/en/blog/subscription-app-onboarding))

Sert paywall (hard paywall) D35'te **%12,1** vs freemium **%2,2** — 5,5 kat.
Ama iade oranı **%5,8 vs %3,4** (%70 daha yüksek).
([Airbridge](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026))
**Bizim için geçersiz:** Ürün İlkesi #2 sert paywall'u yasaklıyor. Bu sayıyı
buraya sadece "neyi bilerek feda ediyoruz"u kayıt altına almak için koydum.

**Türkiye özel:** Türkiye ARPU endeksi 0,29 — kullanıcı başına gelir premium
pazarların ~3,5'te biri. Yerelleştirilmiş fiyat, otomatik dönüştürülmüş
fiyatın ~%55 altında olmalı. Fiyat-hassas pazarlarda **yıllık + indirim**
haftalıktan daha iyi dönüşüyor.
([Mirava — App Pricing Guide: Turkey](https://www.mirava.io/blog/app-pricing-guide-turkey))

→ Mevcut fiyatımız (yıllık ₺399,99 ≈ $10) global eğitim medyanının
($39,99) çok altında ve TR endeksiyle **doğru hizada**. Fiyat kaldıracı
değil; **hacim ve dönüşüm oranı** kaldıracımız. Bu, "önce içerik ve
alışkanlık" stratejisini destekliyor.

### 1.6 Pedagojik dayanak (B1 argümanının bilimsel tarafı)

Okuduğunu anlamak ve bilmediği kelimeyi bağlamdan çıkarabilmek için
metindeki kelimelerin **~%95'i minimum, %98'i optimum** olarak biliniyor
olmalı. Graded reader'lar tam olarak bu %98 eşiğine göre tasarlanır.
([The Language Gym derlemesi](https://gianfrancoconti.com/2025/02/27/why-the-input-we-give-our-learners-must-be-95-98-comprehensible-in-order-to-enhance-language-acquisition-the-theory-and-the-research-evidence/),
[Nakanishi meta-analizi, TESOL Quarterly](https://onlinelibrary.wiley.com/doi/10.1002/tesq.157))

Bu, katalogdaki boşluğun neden bu kadar sert hissedildiğini açıklıyor: A2
kullanıcısı için Sherlock Holmes'un kapsamı %98'in çok altında. Kullanıcı
"ben beceremiyorum" diye yorumluyor, "bu kitap bana göre değil" diye değil.

---

## 2. Önerilen özellikler

Her başlıkta: **Ne** · **Kullanıcı ne görür** · **Hangi metrik** · **Efor** ·
**Mevcut altyapı** · **Risk**.

Efor ölçeği: **S** ≈ 1-3 gün · **M** ≈ 1-2 hafta · **L** ≈ 3+ hafta ya da
pipeline/migration gerektiren iş.

---

### Ö1 — B1 köprüsü: 12-16 özgün B1 kısa hikâye

**Ne:** A2 (8 dk) ile klasikler (197+ dk) arasındaki uçurumu dolduran,
15-25 dakikalık özgün B1 hikâyeler. Hedef: B1'de en az 12 başlık, ortalama
1.800-3.000 kelime.

**Kullanıcı ne görür:** Ana ekranda "Seviyene uygun sırada" rafında, A2'yi
bitirdikten sonra doğal bir sonraki adım. Duvar yok.

**Metrik:** D7 ve D30 retention (birincil), dolaylı olarak conversion —
premium'a dönüşecek kullanıcı, dönüşüm anına gelmeden bırakıyor.
Beklenen etki `[TAHMİN]`: A2 bitiren kullanıcıların D30'u en büyük sıçramayı
burada yapar; sayısal tahmin vermiyorum çünkü elimizde henüz baseline yok
(1.0 telemetrisi ilk kohortu üretecek).

**Efor: L** — ama kod eforu değil, **içerik eforu**. Üretim döngüsü zaten
yazılmış: `pipeline/prompts/generate_story_b1.md` +
`pipeline/scripts/generate_stories.py` (üret → STRICT doğrulayıcı →
gerekçeyle yeniden yazdır). Kalan iş: üretim, insan okuması, `ingest → run
→ publish`.

**Mevcut altyapı:** %100 hazır. Yeni migration yok, yeni tablo yok.
`books.cefr_level`, `coverage_*`, `estimated_minutes` alanları pipeline
tarafından zaten dolduruluyor.

**Risk:**

- Kalite riski: özgün B1 metni "ders kitabı gibi" olursa okunmaz. STRICT
  doğrulayıcı dilbilimsel eşikleri tutar ama **hikâye kalitesini tutmaz** —
  her metni bir insanın okuması şart.
- Guideline riski yok (ilke #3 ile uyumlu, özgün metin).
- Yan etki: B1'de içerik artınca B2 klasikleri daha da az açılabilir;
  bu bir sorun değil, doğru sıralama.

---

### Ö2 — Ücretsiz deneme (7 gün) + deneme bitiş hatırlatması

**Ne:** RevenueCat/App Store Connect'te yıllık plana 7 günlük introductory
offer tanımlamak; ayrıca denemenin bitmesine 2 gün kala **yerel** bildirim.

**Kullanıcı ne görür:** Paywall'da "7 gün ücretsiz dene" CTA'sı ve
"İlk 7 gün ücretsiz, sonra ₺399,99/yıl" yasal satırı. Deneme bitmeden
"Denemenin 2 gün sonra bitiyor — bu hafta 47 kelime kaydettin" bildirimi.

**Metrik: Conversion.** Eğitimde indirme→deneme D30 medyanı %6,5,
indirme→ödeme D35 ~%2,0. Denemelerin %78'i Gün 0'da başlıyor.
([SOSA 2026 Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education))
Deneme uzunluğu seçimi: 3-7 gün %26,8, 17-32 gün %45,7 deneme→ödeme
([Airbridge](https://www.airbridge.io/en/blog/subscription-app-onboarding)).
**Karar önerisi: 7 günle başla, sonra 14 güne A/B'le.** Uzun deneme daha iyi
dönüşüyor ama daha uzun geri bildirim döngüsü demek ve TR'de iptal
davranışı hakkında verimiz yok.

**Efor: S** (kod tarafı neredeyse sıfır) + **S** (bildirim).
`readTrial()` ve `PlanOptionRow`/`PaywallLegal` deneme durumunu zaten
işliyor; i18n anahtarları (`paywall.ctaTrial`, `plan.trialDays`,
`legal.trialThenPrice`) hazır. Bildirim için `src/lib/notifications.ts` ve
`features/reminders/reminderPlan.ts` deseni aynen kullanılabilir.

**Mevcut altyapı:** `planModel.ts`, `waitForServerPremium.ts`,
`revenuecat-webhook`, `reminders/`. Yeni tablo gerekmez.

**Risk:**

- **Guideline 3.1.2:** deneme koşulları paywall'da açıkça yazılmalı —
  `PaywallLegal` bunu zaten yapıyor, ama deneme aktifken metnin doğru
  varyantı gösterildiğinden emin olunmalı (test var).
- İade oranı artabilir; sert paywall verisinde iade %3,4 → %5,8 yükseliyor,
  deneme için ayrı rakam **[VERİ YOK]**.
- Deneme bildirimi "satış bildirimi" gibi hissedilirse hatırlatma iznini
  yaktırır. Metin **fayda odaklı** olmalı ("47 kelimen tekrar bekliyor"),
  fiyat odaklı değil.
- ADR-010'a uyumlu: yerel bildirim, push değil.

---

### Ö3 — Kişisel uygunluk rozeti: "Bu kitabın %96'sını biliyorsun"

**Ne:** Kitap detayında ve raflarda, kullanıcının bildiği lemmalarla
kitabın lemma dağılımını kesiştirip **kişisel kapsam yüzdesi** göstermek;
%95-98 bandını "tam sana göre" olarak işaretlemek.

**Kullanıcı ne görür:** Kitap kartında küçük bir rozet — "Sana göre: %96
tanıdık · rahat okursun" / "%88 — zorlayıcı" / "%99 — çok kolay".
Kitap detayında bir cümlelik açıklama ve "neden?" bağlantısı.

**Metrik: Retention (birincil), conversion (ikincil).** Yanlış kitap seçimi
bırakmanın en büyük tek nedeni; %98 kapsam eşiği araştırmayla destekli
([kaynak §1.6](#16-pedagojik-dayanak-b1-argümanının-bilimsel-tarafı)).
Ayrıca doğrudan bir premium anlatısı üretiyor: "kelime hazinen büyüdükçe
bu yüzde yükseliyor". Nicel lift **[TAHMİN]**.

**Efor: M.** Asıl iş `book_lemmas` (kitap × lemma × count) ile
`user_lemma_state` kesişimini verimli hesaplamak. En temiz yol: bir Postgres
fonksiyonu (`book_personal_coverage(user_id, book_id)`) + rafta gösterim
için kullanıcı başına tek seferlik toplu hesap.

**Mevcut altyapı: çok güçlü.**

- `public.book_lemmas(book_id, lemma, count)` — var, RLS'li.
- `public.user_lemma_state(user_id, lemma, pos, state)` — var, RLS'li.
- `public.books.coverage_a1..c2`, `off_list_ratio` — var, pipeline dolduruyor.
- `user_vocabulary_estimate` (36 kelimelik Meara testinden) — var.

**Risk / kritik uyarı:**

- **`user_lemma_state` bugün pasif okumadan DOLMUYOR.** Satırlar yalnızca
  kullanıcı kelimeyi kaydettiğinde/işaretlediğinde yazılıyor
  (`src/features/reader/api/useSavedWordsQuery.ts`). Yani ham haliyle sayaç
  sıfıra yakın başlar ve rozet anlamsız çıkar.
  **Çözüm (ve bu özelliğin asıl işi):** taban tahmini üçlüden türet —
  (a) seviye testinin `user_vocabulary_estimate` çıktısı,
  (b) bitirilen kitapların `book_lemmas` birleşimi ("gördü" sayılır),
  (c) `user_saved_words` (bilmiyordu sayılır, çıkarılır).
  Bu, ADR-008'in ruhuna uygun: yeni pipeline yok, mevcut veriden türetim.
- Ölçüm hatası riski: LingQ eleştirisi bizde de geçerli — rozet
  **tahmin** dili kullanmalı ("yaklaşık", "tahmini"), skor dili değil.
- Ters etki riski: "%88 — zorlayıcı" rozeti kullanıcıyı kitaptan
  caydırabilir. Metin **yasaklayıcı değil yönlendirici** olmalı ve her
  zaman bir alternatif önermeli ("bunun yerine şunu dene").

---

### Ö4 — Onboarding sonunda ilk paywall (seviye testi sonucuna bağlı)

**Ne:** Seviye testi sonuç ekranından sonra, ana ekrana girmeden önce
bir kez gösterilen kişiselleştirilmiş teklif. Reddedilebilir (X), ücretsiz
katman tam açık kalır.

**Kullanıcı ne görür:** "Seviyen B1. Bu seviyede tanımadığın ~2.400 kelime
var. Premium ile hepsini deftere alabilir ve unutmadan tekrar edebilirsin.
7 gün ücretsiz." + "Şimdi değil".

**Metrik: Conversion.** Denemelerin %78'i Gün 0'da başlıyor
([SOSA 2026 Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education));
paywall zamanlaması tasarımından daha belirleyici
([Airbridge](https://www.airbridge.io/en/blog/subscription-app-onboarding)).
Bugün 4 tetikleyicimizin hiçbiri Gün 0'da değil — en yoğun niyet anını
kaçırıyoruz.

**Efor: S.** `PaywallScreen` ve `app/paywall.tsx` var; `OnboardingGate` /
`LevelTestResult` akışına bir yönlendirme ve "gösterildi mi" bayrağı
(AsyncStorage) eklemek.

**Mevcut altyapı:** `features/onboarding`, `features/paywall`,
`useOnboardingStatusQuery`, `trackEvent("paywall_opened")`.

**Risk:**

- İlke #1 **ihlal edilmiyor** — okuma ekranının dışında.
- İlke #2 ihlal edilmiyor — kapatılabilir, hiçbir kitap kilitlenmiyor.
- Asıl risk: erken paywall **kurulum tamamlama oranını** düşürebilir.
  Bu yüzden **X mutlaka görünür ve ilk saniyeden aktif** olmalı, ve
  `onboarding_completed` olayı paywall'dan ÖNCE atılmalı ki huni
  kirlenmesin.
- Anonim kullanıcıda satın alma sonrası yetkinin doğru hesaba bağlanması
  (`011_account_merge`) test edilmeli.

---

### Ö5 — Bilinen kelime sayacı ve kilometre taşları

**Ne:** Profilde ve ana ekranda "tahmini kelime hazinen: 3.240" sayacı,
1K/3K/5K/10K kilometre taşları ve zaman içinde grafiği. (Ö3 ile aynı
hesaplama motorunu paylaşır.)

**Kullanıcı ne görür:** Profilde sayı + "bu ay +180". Kilometre taşı
geçildiğinde tek seferlik kutlama kartı (kitap bitirme kutlamasının kardeşi).

**Metrik: Retention (D30+).** LingQ'nun uzun vadeli tutundurmasının çekirdek
mekaniği; "balayı sonrası" bırakmaya karşı çalışıyor
([Lingtuitive](https://lingtuitive.com/blog/lingq-review)). Nicel lift
**[VERİ YOK]**. Ayrıca premium'un "ayrıntılı istatistik" faydasını somut
hale getirir — bugün o fayda paywall'da soyut.

**Efor: M** (Ö3 ile birlikte yapılırsa **S**, çünkü hesap ortak). Zaman
serisi için küçük bir tablo gerekir (`user_vocabulary_snapshots`, günlük 1
satır) — RLS zorunlu.

**Mevcut altyapı:** `ProfileStatsGrid`, `WeeklyMinutesChart` (grafik deseni
hazır), `user_vocabulary_estimate`, `completion/BookFinishedScreen`
(kutlama deseni hazır).

**Risk:** Sayının abartılı olması güveni bozar (LingQ eleştirisi). Sayaç
"tahmini" olarak etiketlenmeli ve nasıl hesaplandığı bir dokunuşla
açıklanmalı. Ayrıca **sayacın düşmemesi** gerekir — kullanıcı bir kelimeyi
"unuttum" işaretlerse sayaç geriye gitmemeli, aksi halde ceza gibi hissedilir.

---

### Ö6 — Günlük hedef + seri kurtarma (streak freeze)

**Ne:** Kullanıcının seçtiği günlük hedef (5/10/20 dakika ya da 1 bölüm) ve
ayda 2 kez kullanılabilen **seri dondurma**; ayrıca seri kırılmadan önce
"streak-saver" bildirimi.

**Kullanıcı ne görür:** Ana ekranda halka/ilerleme göstergesi ("bugün 6/10
dk"). Seri kırılacakken akşam bildirimi. Kırıldıysa "serini kurtar" kartı.

**Metrik: Retention (D7/D30).** Duolingo'da streak ekosistemi CURR'ı %21
artıran paketin merkezinde; 7+ gün serisi olan DAU payı ~3 katına çıktı
([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
Tek başına dondurmanın payı yayınlanmadı **[VERİ YOK]**.

**Efor: M.** Seri hesabı ve `record_reading_session` var; eklenecek olan
günlük hedef tercihi (AsyncStorage), dondurma kredisi (sunucu tarafı, çünkü
istemcide tutulursa suistimal edilir → küçük bir migration), ve bildirim
planına yeni bir tür.

**Mevcut altyapı:** `profile/StreakCard`, `home/StreakChip`,
`ProfileStats.currentStreak/readToday`, `reminders/reminderPlan.ts` (üç
hatırlatma türü zaten var — dördüncüsü aynı desende).

**Risk:**

- Aşırı oyunlaştırma yetişkin, ciddi bir okuma uygulamasının tonunu
  bozabilir. Ölçü: **sessiz ve zarif** — konfeti değil, ince bir halka.
- Bildirim yorgunluğu: hatırlatmalar zaten var, dördüncü tür eklenirken
  günlük toplam bildirim tavanı konmalı (öneri: günde en fazla 1).
- Seri dondurmayı premium faydası yapma cazibesine **direnilmeli** —
  ücretsiz katmanda da olmalı, aksi halde ilke #2'ye yakın bir kilitleme.

---

### Ö7 — Bölüm sonu mini tekrar (3 kart, o bölümden)

**Ne:** Bölüm bittiğinde, o bölümde kaydedilen kelimelerden 3 hızlı kart.
30 saniyelik bir kapanış.

**Kullanıcı ne görür:** `ChapterCompleteCard`'ın altında "Bu bölümden 4
kelime kaydettin — 3'ünü hemen tekrar et" düğmesi. İsteğe bağlı, atlanabilir.

**Metrik: Retention + dolaylı conversion.** Headway'in "özet sonrası
flashcard" mekaniğinin bizdeki karşılığı
([Headway](https://makeheadway.com/blog/what-is-the-headway-app-and-how-does-it-work/)).
Nicel lift **[VERİ YOK]**. Conversion bağlantısı: tekrar döngüsü işlerse
kullanıcı daha çok kelime kaydeder, 100 kelimelik ücretsiz tavana daha hızlı
ulaşır — bu tavan bugün paywall'un dördüncü tetikleyicisi.

**Efor: S.** SRS motoru (`srs/scheduler.ts`, `useReviewCardMutation`,
`ReviewRatingBar`) hazır; yapılacak iş mevcut bileşenleri bölüm bağlamıyla
filtreleyip küçük bir modalda göstermek.

**Mevcut altyapı:** `reader/ChapterCompleteCard`, `srs/*`,
`user_saved_words.book_id/sentence_id`.

**Risk / anayasa kontrolü:**

- **İlke #1 sınırında.** Bu bir _paywall/promosyon_ değil, öğrenme
  eylemidir — bu yüzden ihlal saymıyorum. Ama sınırı net tutmak için:
  bu ekranda **premium'dan hiç söz edilmez**, kota dolduğunda bile nötr
  mesaj gösterilir (migration 024'ün yorumundaki kural aynen geçerli).
- Okuma akışını kesme riski: her bölümde çıkarsa yorucu olur. Öneri:
  yalnızca o bölümde ≥2 kelime kaydedildiyse ve günde en fazla bir kez.

---

### Ö8 — "Okuma rotaları": kürasyonlu seviye yolculukları

**Ne:** A2 → B1 → B2 geçişini bir yol haritası olarak sunan, 5-7 kitaplık
kürasyonlu diziler. Örn: "Kısa gerilimden Sherlock'a — 6 adım".

**Kullanıcı ne görür:** Ana ekranda tek bir "Rotan" kartı: sıradaki kitap,
kaçıncı adımda olduğu, rota tamamlanınca rozet.

**Metrik: Retention (D30).** "Sırada ne var" sorusunu ortadan kaldırır —
kitap bitiminden sonraki boşluk, okuma uygulamalarında en büyük terk
noktası `[TAHMİN]`. Ö1 (B1 içeriği) olmadan bu özellik boşa çalışır; ikisi
birlikte anlamlı.

**Efor: M.** İçerik/kürasyon eforu + görece küçük kod.

**Mevcut altyapı: kısmen hazır ve şu an atıl.**
`public.collections` ve `public.collection_books` tabloları migration
001'den beri var ve kullanılmıyor. `useBookSeriesQuery`,
`BookSeriesInfo`, `CategoryShelf` bileşenleri mevcut. Yeni tablo
gerekmeyebilir (rota = sıralı bir collection + kullanıcı ilerlemesi
`user_book_progress`'ten türetilir).

**Risk:** Rotalar kötü kürasyonlanırsa kullanıcıyı yanlış zorluğa iter —
Ö3'ün kapsam hesabıyla doğrulanmalı. Ayrıca ilke #2: rota tamamlama
premium'a bağlanmaz.

---

### Ö9 — Haftalık okuma özeti (bildirim + ekran)

**Ne:** Pazar akşamı yerel bildirim + uygulamada bir özet ekranı: bu hafta
kaç dakika, kaç yeni kelime, en uzun seri, geçen haftaya göre değişim.

**Kullanıcı ne görür:** "Bu hafta 84 dakika okudun, 31 yeni kelime gördün —
geçen haftadan %20 fazla." Paylaşılabilir bir kart (isteğe bağlı).

**Metrik: Retention (D30) + conversion.** Duolingo'da bildirimlerin
biriken etkisi belgelenmiş ama tek tek yüzde yok
([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
Conversion tarafı: bu ekran, **okuma ekranının dışında** doğal bir beşinci
paywall tetikleyicisi olur ("ayrıntılı istatistiklerin tamamı premium'da").

**Efor: S-M.** Veri zaten hesaplanıyor (`useProfileStatsQuery`,
`WeeklyMinutesChart`); iş bildirim planı + tek ekran.

**Mevcut altyapı:** `profile/api/useProfileStatsQuery.ts`,
`WeeklyMinutesChart`, `reminders/*`, `lib/notifications.ts`.

**Risk:** Kötü bir hafta (0 dakika) için özet göndermek suçlayıcı olur —
eşik koy: haftada ≥1 okuma oturumu yoksa gönderme, onun yerine mevcut
"yarım kalan hikâye" hatırlatması çalışsın.

---

### Ö10 — iOS ana ekran widget'ı (günün kelimesi + seri + devam et)

**Ne:** Küçük/orta boy widget: bugünün tekrar bekleyen kelime sayısı, seri
günü ve "kaldığın yerden devam et" hedefi.

**Kullanıcı ne görür:** Ana ekranda kelime + Türkçe karşılığı; dokununca
doğrudan tekrar ekranına ya da okuduğu bölüme gider.

**Metrik: Retention (D7/D30).** Widget'ların tekrar açılışı artırdığı geniş
kabul görüyor ve dil uygulamalarında "iki hafta içinde bırakma" sorununa
karşı önerilen çözümlerden biri
([ArcTouch](https://arctouch.com/blog/widgets-home-screen),
[Lingo Widget](https://lingowidget.app/blog/widgets-that-teach-languages/)).
**Ölçülmüş, bağımsız lift rakamı [VERİ YOK]** — bulduğum kaynaklar ya
satıcı içeriği ya da genel iddia.

**Efor: L.** Expo managed workflow'da widget bir **native uzantı** demek:
config plugin + App Group + WidgetKit hedefi + veriyi paylaşımlı depoya
yazmak. ADR-001'in kaçış kapısı var ama bu, kurulum karmaşıklığını gerçekten
artıran ilk özellik. Ayrıca Expo Go'da test edilemez.

**Mevcut altyapı:** Veri var (`useDueCardsQuery`, streak); paylaşımlı
depolama katmanı **yok**.

**Risk:** Kısıt #4 ("basitlik önce gelir") ile en çok gerilen öneri.
**Önerim: erteleyin.** Önce Ö6 ve Ö9 ile bildirim/alışkanlık kaldıracını
ölçün; widget o kaldıraç doyduktan sonra değerlendirilsin.

---

### Ö11 — Win-back: süresi dolan aboneye ve iptal edene tek seferlik teklif

**Ne:** Aboneliği biten kullanıcıya, RevenueCat webhook'undan gelen
`EXPIRATION`/`CANCELLATION` olaylarına dayanan bir geri kazanım teklifi
(App Store win-back offer ya da uygulama içi indirimli yıllık).

**Kullanıcı ne görür:** Bir sonraki açılışta, okuma dışında: "Defterindeki
312 kelime seni bekliyor. Yıllık planı %40 indirimle geri al."

**Metrik: Conversion (net gelir).** Eğitim kategorisi en iyi dönüşenlerden
biri olmasına rağmen aboneyi de en hızlı kaybedenlerden
([RocketShip HQ özeti](https://www.rocketshiphq.com/revenuecat-state-of-subscription-apps-2025-summary/)).
Yani churn bu kategoride yapısal; geri kazanım kaldıracı orantılı olarak
büyük. Nicel lift **[TAHMİN]**.

**Efor: M.** Webhook zaten olayları alıyor
(`supabase/functions/revenuecat-webhook`, `apply_entitlement_event()`);
eklenecek olan "geri kazanım uygun mu" durumu ve tek bir ekran.

**Mevcut altyapı:** ADR-009 zinciri, `user_entitlements.expires_at`,
`useSubscriptionStatusQuery`.

**Risk:**

- ADR-009 ihlal edilmemeli: istemci **yetki yazmaz**, sadece teklifi
  gösterir.
- İndirimli teklif erken gösterilirse mevcut aboneler tam fiyattan
  vazgeçmeyi öğrenir. Kural: yalnızca **süresi dolmuş** kullanıcıya,
  yalnızca bir kez.
- Guideline 3.1.2: indirimli teklifin koşulları da paywall'daki gibi
  açıkça yazılmalı.

---

### Ö12 — Paywall hunisinin ölçülebilir hale getirilmesi (ön koşul iş)

**Ne:** Bir özellik değil, diğer her şeyin **ön koşulu**. Bugünkü telemetri
paywall'ı açıyor ve satın almayı görüyor ama **aradaki kaybı görmüyor**.

**Eksik olaylar:** `paywall_dismissed` (hangi adımda, ne kadar süre sonra),
`trial_started`, `trial_converted`, `trial_cancelled`,
`saved_word_limit_reached` (100 tavanına kaç kişi çarpıyor),
`ai_quota_exhausted` (10/gün tavanı), `book_abandoned` (hangi kitapta,
yüzde kaçta bırakıldı).

**Kullanıcı ne görür:** Hiçbir şey.

**Metrik:** Kendisi metrik üretmez, diğer 11 önerinin karar verilebilir
olmasını sağlar. Özellikle **`book_abandoned` + kitap seviyesi**, B1
boşluğu hipotezini ilk kez sayıyla kanıtlar ya da çürütür.

**Efor: S.** `src/lib/analytics.ts` arayüzü ve `analytics_events` tablosu
(migration 020) hazır; sadece çağrı noktaları eklenecek.

**Risk:** `analytics_events` yalnızca insert-only ve okuma politikası
bilerek yok — analiz service_role ile Supabase panosundan yapılıyor. Yeni
olaylar `params` 4KB sınırına ve 64 karakterlik ad sınırına uymalı.
Ayrıca App Privacy beyanı zaten bu tabloyu kapsıyor, yeni beyan gerekmez.

---

## 3. Etki / efor matrisi

Etki ölçeği ürüne özgü ve `[TAHMİN]` — yukarıdaki kaynaklarla desteklenmiş
muhakemeye dayanıyor, ölçülmüş değil.

```
        YÜKSEK ETKİ
             │
   Ö2 deneme │ Ö1 B1 içeriği
   Ö4 onb.pw │ Ö3 uygunluk rozeti
   Ö12 huni  │ Ö5 kelime sayacı
   Ö7 bölüm  │ Ö6 günlük hedef/streak
      sonu   │ Ö11 win-back
             │
─────────────┼─────────────────────  ORTA/YÜKSEK EFOR →
   DÜŞÜK     │
   EFOR      │ Ö8 okuma rotaları
             │ Ö9 haftalık özet
             │
             │              Ö10 widget
        DÜŞÜK ETKİ / BELİRSİZ
```

Sıralı liste (etki ÷ efor):

| #   | Öneri                        | Metrik     | Efor         | Etki `[TAHMİN]`     | Sıra  |
| --- | ---------------------------- | ---------- | ------------ | ------------------- | ----- |
| Ö2  | Ücretsiz deneme + hatırlatma | Conversion | S            | Yüksek              | **1** |
| Ö1  | B1 köprüsü içeriği           | Retention  | L (içerik)   | Çok yüksek          | **2** |
| Ö12 | Huni telemetrisi             | Ön koşul   | S            | Yüksek (dolaylı)    | **3** |
| Ö4  | Onboarding sonu paywall      | Conversion | S            | Orta-yüksek         | 4     |
| Ö3  | Uygunluk rozeti              | Retention  | M            | Yüksek              | 5     |
| Ö7  | Bölüm sonu mini tekrar       | Retention  | S            | Orta                | 6     |
| Ö6  | Günlük hedef + seri kurtarma | Retention  | M            | Orta-yüksek         | 7     |
| Ö5  | Bilinen kelime sayacı        | Retention  | M (Ö3 ile S) | Orta-yüksek         | 8     |
| Ö9  | Haftalık özet                | Retention  | S-M          | Orta                | 9     |
| Ö11 | Win-back                     | Conversion | M            | Orta                | 10    |
| Ö8  | Okuma rotaları               | Retention  | M            | Orta (Ö1'e bağımlı) | 11    |
| Ö10 | iOS widget                   | Retention  | L            | Belirsiz            | 12    |

---

## 4. İlk üç — gerekçeli

### 1. Ö2 — Ücretsiz deneme (+ Ö4 ile birlikte paketlenmeli)

**Neden birinci:** Kod eforu neredeyse sıfır — `readTrial()`, plan satırı,
yasal metin ve i18n anahtarları **zaten yazılmış**. Yapılacak iş App Store
Connect ve RevenueCat konfigürasyonu. Eğitim kategorisinde indirme→deneme
(%6,5) indirme→ödeme'nin (~%2,0) üç katı; deneme, ödeme kararının önündeki
tek en büyük sürtünmeyi kaldırıyor
([SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026-education)).
₺399,99'luk yıllık plan Türk kullanıcı için "denemeden ödenecek" bir tutar
değil.

**Ne zaman:** 1.1. Ö4 (onboarding paywall) ile aynı sürümde çıkmalı; deneme
teklifi, kullanıcının niyetinin en yüksek olduğu Gün 0'da görünmezse
kazancın büyük kısmı masada kalır (denemelerin %78'i Gün 0).

### 2. Ö1 — B1 köprüsü içeriği

**Neden ikinci ve neden "özellik değil ama en değerlisi":** Conversion
matematiği basit — premium'a dönüşmeyen kullanıcı, dönüşüm anına gelmeden
bırakan kullanıcıdır. Katalogda A2'nin 8 dakikası ile B1'in 197 dakikası
arasında **hiçbir şey yok**; hedef kullanıcının (A2-B2) tam ortası boş.
Okuma araştırması bunun neden bu kadar sert hissedildiğini açıklıyor:
anlama için ~%98 kelime kapsamı gerekiyor
([Language Gym derlemesi](https://gianfrancoconti.com/2025/02/27/why-the-input-we-give-our-learners-must-be-95-98-comprehensible-in-order-to-enhance-language-acquisition-the-theory-and-the-research-evidence/)),
ve A2 kullanıcısı için Sherlock Holmes o eşiğin çok altında. Kullanıcı bunu
"kitap bana göre değil" diye değil, "ben beceremiyorum" diye yorumlar ve
uygulamayı siler.

Ayrıca **diğer önerilerin çoğu buna bağımlı**: Ö8 (rotalar) B1 içeriği
olmadan boş bir yol haritası; Ö3 (uygunluk rozeti) kullanıcıya "sana uygun
kitap yok" demekten başka bir şey söyleyemez; Ö6 (seri) okunacak doğru
kitap yoksa kırılır.

**Neden ilk sırada değil:** Efor L ve takvimi kod işiyle aynı hızda
ilerlemiyor. Ö2 aynı sprintte bitirilebilir, Ö1 arka planda paralel yürür.

**Ne zaman:** Hemen başlatın, 1.2'de yayına. Hedef: **B1'de ≥12 özgün
başlık, 15-25 dakika**. Üretim döngüsü (`generate_stories.py` + STRICT
doğrulayıcı) hazır; darboğaz insan okuması.

### 3. Ö12 — Huni telemetrisi

**Neden üçüncü:** Bugün elimizde 1.0'ın hiçbir kohort verisi yok ve
`paywall_viewed` ile `purchase_completed` arasındaki kaybı göremiyoruz.
Daha da önemlisi **`book_abandoned` olayı yok** — yani B1 hipotezi
(bu belgenin en pahalı önerisinin dayanağı) şu an _doğrulanmamış bir
inanç_. S eforluk bir iş, 1.1'de çıkarsa 1.2'nin kararlarını veriye
bağlar.

Adapty verisine göre tek bir paywall testi %3-8 lift getiriyor ama yılda
40-50 test bileşik etkiyi yaratıyor
([Airbridge derlemesi](https://www.airbridge.io/en/blog/subscription-app-onboarding)).
Test altyapısı olmadan o döngü hiç başlamaz.

---

## 5. B1 boşluğunun ürün değeri — ayrı değerlendirme

Görev bunu ayrıca sordu, ayrıca cevaplıyorum.

**Bu bir özellik değil, ürünün temel vaadinin tamamlanması.** Uygulamanın
vaadi "A2-B2 seviyesindeki Türk kullanıcı okuyarak öğrensin". Katalog bu
vaadin yarısını tutuyor:

| Seviye | Başlık | Ort. süre  | Durum                                |
| ------ | ------ | ---------- | ------------------------------------ |
| A1     | 9      | 6 dk       | Sağlıklı                             |
| A2     | 30     | 8 dk       | Sağlıklı — katalogun en güçlü yeri   |
| **B1** | **15** | **197 dk** | **Kopukluk — özgün kısa hikâye YOK** |
| B2     | 24     | 271 dk     | Yalnızca klasikler                   |
| C1     | 5      | —          | Niş                                  |
| C2     | 2      | —          | Niş                                  |

Üç ayrı iş sonucu:

1. **Retention:** A2'yi bitiren kullanıcı için "sıradaki" 197 dakikadır.
   8 dakikalık başarı hissinden 197 dakikalık taahhüde geçiş, davranışsal
   olarak bir uçurum. Bu, D14-D30 aralığındaki terkin en olası tek nedeni
   `[TAHMİN — Ö12'deki `book_abandoned` olayı bunu doğrulayacak]`.
2. **Conversion:** Premium'un dört faydasının dördü de (sınırsız kelime,
   sınırsız SRS, AI kotası, istatistik) **okumaya devam eden** kullanıcıya
   değerli. Okumayı bırakan kullanıcıya hiçbiri satılamaz. Yani B1 boşluğu
   paywall'ın önündeki en büyük tıkaç.
3. **ASO ve mağaza konumlandırması:** "B1 seviyesinde kısa İngilizce
   hikâyeler" TR storefront'unda somut ve aranan bir vaat; 197 dakikalık
   klasikler değil. Ayrıca 2.3.1 açısından güvenli — var olan içeriği
   pazarlıyoruz.

**Maliyet gerçekçi mi:** Evet. Pipeline yazılı, doğrulayıcı yazılı, prompt
yazılı, yayınlama komutları belgelenmiş. 12-16 hikâyenin gerçek maliyeti
model ücreti değil, **her metnin bir insan tarafından okunması**. 12 hikâye
× ~20 dakika okuma = bir günlük iş, artı yeniden yazdırma turları.

**Risk:** Özgün B1 metinlerinin "ders kitabı İngilizcesi" olmasıdır. STRICT
doğrulayıcı cümle uzunluğu tavanı **ve tabanı** koyuyor (taban, metnin
yapay biçimde kısa cümlelere bölünmesini engellemek için) — ama bu
dilbilimsel bir kontrol, edebî değil. Kalite kapısı insandır.

**Öneri:** B1'i 1.2'nin _tek_ içerik hedefi yapın. B2'de özgün içeriğe
1.3'ten önce başlamayın; B2'de zaten 24 klasik var ve B1 köprüsü kurulmadan
oraya gelen kullanıcı yok.

---

## 6. Bilinçli olarak ÖNERMEDİKLERİM

Kısıtlar nedeniyle elenen, ama akla gelmesi muhtemel fikirler — burada
kayıt altına alıyorum ki tekrar gündeme gelmesin:

- **Okuma ekranında "premium ile bu kelimeyi kaydet" ipucu.** İlke #1
  ihlali. Kota dolduğunda bile nötr mesaj gösterilir (migration 024'ün
  yorumu bu kuralı zaten yazıyor).
- **Kitapları/bölümleri kilitleme, "günde 1 bölüm" sınırı.** İlke #2
  ihlali. Sert paywall'ın D35'te 5,5 kat daha iyi dönüştüğünü biliyoruz
  ([Airbridge](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026))
  — bunu bilerek feda ediyoruz.
- **TTS / sesli okuma.** Ürün kararı: yok ve planlanmıyor. Paywall'a
  yazılması 2.3.1 ihlali olur (bir kez oldu, denetimde kaldırıldı).
- **Telifli graded reader lisanslama.** İlke #3 ihlali.
- **Reklam katmanı.** İlke #1 ve ürünün tonu.
- **Sosyal lig/leaderboard (Duolingo tarzı).** Duolingo'da öğrenme süresini
  %17 artırdı ([Lenny's](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth))
  ama bizde **backend, moderasyon, kullanıcı profili görünürlüğü ve yeni
  App Privacy beyanı** demek. Kısıt #4 karşısında bu round'da haklı
  çıkarılamaz. Yeniden değerlendirme koşulu: Ö6'nın tekil seri mekaniği
  ölçülüp doyduktan sonra.
- **Fiyat artışı.** TR ARPU endeksi 0,29; fiyatımız zaten TR için doğru
  hizada ([Mirava](https://www.mirava.io/blog/app-pricing-guide-turkey)).
  Kaldıraç fiyat değil, dönüşüm oranı.

---

## Kaynaklar

- [How Duolingo reignited user growth — Jorge Mazal, Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- [RevenueCat — State of Subscription Apps 2026: Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education)
- [RevenueCat — State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- [Airbridge — Subscription App Onboarding: Get 100% of Users to Your Paywall](https://www.airbridge.io/en/blog/subscription-app-onboarding)
- [Airbridge — Hard Paywall vs Freemium 2026](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026)
- [RocketShip HQ — RevenueCat SOSA 2025 özeti](https://www.rocketshiphq.com/revenuecat-state-of-subscription-apps-2025-summary/)
- [Mirava — App Pricing Guide: Turkey](https://www.mirava.io/blog/app-pricing-guide-turkey)
- [Lingtuitive — LingQ Review](https://lingtuitive.com/blog/lingq-review)
- [Headway — What is the Headway app and how does it work](https://makeheadway.com/blog/what-is-the-headway-app-and-how-does-it-work/)
- [The Language Gym — %95-98 anlaşılabilirlik eşiği ve kanıtlar](https://gianfrancoconti.com/2025/02/27/why-the-input-we-give-our-learners-must-be-95-98-comprehensible-in-order-to-enhance-language-acquisition-the-theory-and-the-research-evidence/)
- [Nakanishi — A Meta-Analysis of Extensive Reading Research, TESOL Quarterly](https://onlinelibrary.wiley.com/doi/10.1002/tesq.157)
- [ArcTouch — Widgets on the Home Screen Increase iOS App Engagement](https://arctouch.com/blog/widgets-home-screen)
</content>

</invoke>

---

## EK: rapor sonrası doğrulama (2026-09-07)

Raporun iki iddiası kod üzerinde tek tek doğrulandı.

**Doğrulandı — ücretsiz deneme kodu gerçekten hazır.**
`planModel.ts:67` `readTrial()` `pkg.product.introPrice`'ı okuyor ve
satır 138'de her pakete bağlanıyor. i18n anahtarlarının dördü de yerinde
(`ctaTrial_one/other`, `plan.trialDays_one`, `legal.trialThenPrice_one`).

Bunun pratik sonucu raporda yazandan daha güçlü: `introPrice` StoreKit'ten
geliyor ve App Store Connect'te aboneliğe **Introductory Offer** eklemek bir
metadata değişikliği — **yeni derleme gerektirmiyor.** Yani uygulama
incelemedeyken bile deneme açılabilir, kod onu kendiliğinden gösterir.

**Düzeltildi — `saved_word_limit_reached` eksik DEĞİL.**
Rapor bu olayı eksik huni olayları arasında sayıyordu; kodda mevcut.
Gerçekten eksik olan üçü:

| Olay                       | Durum                         |
| -------------------------- | ----------------------------- |
| `paywall_dismissed`        | YOK                           |
| `trial_started`            | YOK                           |
| `book_abandoned`           | YOK                           |
| `saved_word_limit_reached` | **VAR** (rapor yanlış saymış) |

Toplam 57 `trackEvent` çağrısı var. `book_abandoned`'ın yokluğu raporun
kendi B1 argümanı açısından önemli: "kullanıcı 197 dakikalık klasikte
bırakıyor" hipotezi şu an ölçülmüş değil, muhakemeye dayanıyor.
