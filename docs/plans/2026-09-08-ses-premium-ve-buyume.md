# Stüdyo Sesi, Premium Konumlandırması ve Büyüme — 1.1 ve sonrası

> Tarih: 2026-09-08. Bağlam: sesli okuma iki katmanlı hale geldi. Cihaz-üstü
> TTS (`expo-speech`) 109 kitabın hepsinde çalışıyor; Google WaveNet/Neural2
> stüdyo sesi yalnızca 63 özgün hikâyede var
> (`pipeline/scripts/generate_audio.py`, 207 bölüm, ~324 MB).
> Ürün kararı: stüdyo sesi premium, cihaz sesi herkese açık.
>
> Bu belge `docs/plans/2026-09-07-buyume-onerileri.md`nin (Ö1–Ö12) devamıdır,
> yerine geçmez. Oradaki öneriler tekrar edilmez; yeni numaralar Ö13'ten
> başlar.
>
> **Kanıt etiketleri:** her iddianın yanında ya kaynak bağlantısı vardır ya
> `[TAHMİN]` (kaynağa dayanmayan ürün muhakemesi, telemetriyle doğrulanmalı)
> ya da `[VERİ YOK]` (aradım, yayınlanmış rakam bulamadım).

---

## 0. Yönetici özeti

Beş bulgu, ikisi karar değiştirici:

1. **"Maliyeti var, o yüzden premium" gerekçesi rakamlarla ayakta
   durmuyor — ve bunu paywall'a yazmamalıyız.** Ölçtüm: 324 MB / 207 bölüm
   = bölüm başına ~1,57 MB, kitap başına ~5,14 MB. Supabase egress aşım
   fiyatı $0,03/GB olduğuna göre **bir kullanıcının bir hikâyeyi baştan
   sona dinlemesi ~$0,00015'e mal oluyor** — yani 1.000 tam kitap
   dinlemesi ~15 sente.
   ([Supabase pricing](https://supabase.com/pricing)) Depolamanın tamamı
   (324 MB) Supabase'in **ücretsiz** 1 GB kotasına bile sığıyor. Üretim
   maliyeti zaten sıfırdı (betiğin başlığındaki hesap: WaveNet 1M ücretsiz
   kota, ~738K faturalanabilir karakter).
   → **Sonuç:** ADR-011'in "marjinal maliyeti sıfır olduğu için ücretsiz"
   mantığı stüdyo sesi için de neredeyse aynen geçerli. Stüdyo sesini
   premium yapmanın savunulabilir tek gerekçesi maliyet değil,
   **farklılaştırılmış değer**: 63 hikâyede insan-benzeri anlatım, cihazın
   robotik "compact" sesiyle karşılaştırılamaz bir dinleme deneyimi.
   Gerekçeyi CLAUDE.md'de ve paywall'da böyle yazmalıyız; "sunucu maliyeti"
   demek hem yanlış hem gereksiz.

2. **Bugün kilit fiziksel olarak imkânsız: bucket herkese açık.**
   `pipeline/scripts/generate_audio.py` `book-audio` bucket'ını public
   yapıyor (`.../object/public/book-audio/...`) ve `chapters.audio_url`
   bu düz URL'i taşıyor; `useChapterQuery.ts` onu herkese veriyor. Yani
   premium kilidi bugün eklenirse **istemci tarafında kozmetik** olur —
   URL'i gören herkes dosyayı indirir. Kilit kararı alınacaksa **ilk iş
   S1: bucket'ı private yap + imzalı URL veren bir RPC/Edge Function**
   (migration 029'daki `my_ai_sentence_quota()` deseniyle birebir aynı
   şekil). Bu yapılmadan paywall'da "stüdyo sesi" satmak Guideline
   2.3.1 açısından da zayıf: satılan şey herkeste açık.

3. **Sektör verisi tadımlığın lehine ama uçları kesiyor.** RevenueCat'in
   115.000+ uygulamalık veri setinde katı paywall'un D35 dönüşümü
   medyan **%10,7**, freemium'un **%2,1** — ~5 kat.
   ([RevenueCat SOSA 2026 özeti](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026),
   [Airbridge derlemesi](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026))
   Ama Adapty'nin 2026 verisi tam tersini söylüyor (yumuşak paywall %4,85
   vs katı %3,34, paywall görüntüleme→ödeme). Yani "daha çok kilitle daha
   çok kazanırsın" GENELLENEBİLİR bir sonuç değil. Bizim ürünümüzde
   ürün ilkesi #2 zaten katı paywall'u yasaklıyor; tartışma "kilit mi
   değil mi" değil, **tadımlığın büyüklüğü**.

4. **Rakiplerin hiçbiri "ses"i tek başına satmıyor; ses bir kütüphane
   erişim hakkının içinde geliyor.** Blinkist ücretsiz katmanda sesi
   TAMAMEN kapatıyor (günde 1 metin özeti, ses yok), Headway ücretsiz
   katmanda günde 1 özeti SESLİ veriyor, Beelinguapp ana anlatım sesini
   ücretsiz bırakıp kütüphaneyi kilitliyor. Duolingo ise ters yöne
   gidiyor: DuoRadio ve "Explain My Answer" gibi özellikleri 2026'da
   ücretsize İNDİRDİ. (kaynaklar §2.2)
   → Bize en yakın model **Headway**: "her gün/her kullanıcı bir birim,
   sesiyle birlikte, tam deneyim".

5. **Sesin açtığı en yüksek getirili yeni özellik ses değil, ses+SRS
   köprüsü ve arka planda dinleme.** Sesin pedagojik değeri literatürde
   sağlam: sesli destekli okuma, sessiz okumaya göre anlamlı ölçüde daha
   fazla kelime kazanımı veriyor (Webb & Chang 2015).
   ([SSLA/Language Teaching Research](https://journals.sagepub.com/doi/abs/10.1177/1362168814559800))
   Bu, hem paywall metnini hem "neden dinlemelisin" onboarding'ini
   dürüstçe yazmamızı sağlıyor.

**İlk üç iş:** (1) **S1** imzalı URL altyapısı — ön koşul, onsuz hiçbir
şey yapılmamalı; (2) **S2** "ilk çaldığın özgün hikâye kalıcı olarak
senin" tadımlığı + kitap bitirme ekranındaki teklif; (3) **Ö13** arka
planda dinleme (ADR-011'in bilinen sınırını kaldırır ve premium'un tek
en güçlü satır maddesi olur).

---

# GÖREV 1 — Stüdyo sesinin premium'a alınması

## 1.1 Kod gerçeği: bugün ne var

| Parça                                        | Durum                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/features/reader/tts/useReaderTts.ts`    | Cihaz TTS'i, `onBoundary` ile kelime vurgusu. 109 kitap.                                |
| `src/features/reader/tts/useChapterAudio.ts` | Bulut sesi çalar, zaman damgalarından vurgu sürer. `enabled` bayrağıyla seçiliyor.      |
| `ReaderScreen.tsx:151`                       | `hasCloudAudio = Boolean(chapter?.audioUrl && chapter?.audioTimingsUrl)` — tek anahtar. |
| `chapters.audio_url` (migration 001)         | Düz, **public** Supabase Storage URL'i.                                                 |
| `pipeline/scripts/generate_audio.py`         | `BUCKET = "book-audio"`, `ensure_bucket` public oluşturuyor.                            |
| `ReaderSettingsSheet.tsx`                    | Cihaz sesi seçici + "gelişmiş ses indir" ipucu zaten var.                               |

Kilit için mimari olarak **tek bir kaldıraç** var: `chapter.audioUrl`'in
dolu gelip gelmemesi. Bu iyi haber — kilit tek noktadan uygulanabilir ve
`useChapterAudio` hiç değişmeden `audioUrl` boşsa cihaz TTS'ine düşüyor
(hook'un kendi yorumunda yazdığı davranış). Yani **kilidin "bozuk"
hâli bile çalışan bir üründür**: en kötü ihtimalle kullanıcı cihaz sesiyle
dinler.

## 1.2 (a) Tadımlık mekanikleri — yayınlanmış veri

### Freemium mimarisi: üç kalıp

RevenueCat'in freemium tasarım kılavuzu üç mimari tanımlıyor
([RevenueCat — Freemium tier design](https://www.revenuecat.com/blog/growth/freemium-tier-design)):

| Kalıp                  | Tanım                      | Örnek                                                | Bizdeki karşılığı                                         |
| ---------------------- | -------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| **Taster** (tadımlık)  | Aynı ürün, kullanım sınırı | Loom: 5 dk video, 25 kayıt                           | 100 kelime defteri (mig. 024), 10 AI çeviri/gün (mig 029) |
| **Split** (ayrıştırma) | Özellik segmentle ayrılır  | CapCut: gelişmiş düzenleme premium                   | Ayrıntılı istatistik                                      |
| **Hybrid**             | İkisi birlikte             | Slack: 90 gün geçmiş + Slack Connect tamamen premium | **Stüdyo sesi buraya düşüyor**                            |

Aynı kaynağın en önemli uyarısı bizim ilke #1/#2 ile birebir örtüşüyor:
_"kilitli özellikleri çekirdek iş akışının dışında tutarak yapay
sinirlenme yaratmaktan kaçının"_ ve **"Bill of Rights"**: hangi
ücretsiz özelliklerin ASLA aşındırılmayacağını iç anayasa olarak yaz
(Life360 örneği: "harita, konum geçmişi ve yer uyarıları ücretsiz
kalmalı"). CLAUDE.md'de bunun karşılığı zaten var (ADR-011 + ilke #2);
**cihaz-üstü TTS'i o listeye açıkça yazmalıyız.**

### Kaç birim ücretsiz veriliyor — rakiplerde gözlenen

| Ürün        | Ücretsiz birim                                                        | Kilit noktası                     | Kaynak                                                                        |
| ----------- | --------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| Headway     | **Günde 1 özet, sesli + çevrimdışı**                                  | 2. özet                           | [Blinkist vs Headway](https://nibble-app.com/blog/blinkist-vs-headway)        |
| Blinkist    | **Günde 1 "Daily Pick", ses YOK, seçim YOK**                          | Ses ve kütüphane                  | [Blinkist pricing 2026](https://www.befreed.ai/blog/blinkist-pricing-2026)    |
| LingQ       | **5 içe aktarma, 20 kayıtlı kelime**, reklam                          | 6. ders / 21. kelime              | [LingQ Free vs Premium](https://www.lingq.com/blog/lingq-free-vs-premium/)    |
| Beelinguapp | Sınırlı sayıda sesli kitap; **seri yaptıkça premium hikâye açılıyor** | Kütüphanenin geri kalanı + reklam | [Actual Fluency incelemesi](https://actualfluency.com/beelinguapp-review/)    |
| Cake        | Reklam + "kalp" ekonomisi, sınırlı kayıt                              | Kalp bitince                      | [Cake — Google Play](https://play.google.com/store/apps/details?id=me.mycake) |
| Speak       | Ücretsiz katman "işlevsel öğrenme için fazla dar"; 7 günlük deneme    | Neredeyse her şey                 | [Lingtuitive Speak incelemesi](https://lingtuitive.com/blog/speak-review)     |

**Dönüşüme etkisi — yayınlanmış rakam:** bu mekaniklerin tek tek
conversion lift'i için **[VERİ YOK]**. Hiçbir şirket "günde 1 özet
yerine 2 verince dönüşüm %X düştü" yayınlamadı. Elimizdeki tek sağlam
kıyaslama katman kalıbı düzeyinde (§0, madde 3) ve deneme süresi
düzeyinde: 17–32 günlük denemeler medyan **%45,7** deneme→ödeme, 3–7
günlük denemeler **%26,8**
([RevenueCat SOSA 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)).

**Beelinguapp'in "seri yaptıkça premium hikâye açılır" mekaniği** bizim
için en ilginç olanı: tadımlığı bir defalık hediye değil, **kazanılan
bir para birimi** yapıyor. Retention ve conversion'ı aynı anda
besliyor. Ölçülmüş etkisi **[VERİ YOK]** ama S2'nin varyantı olarak
değerlendirmeye değer (§1.3, Varyant E).

## 1.3 (b) "1 hikâye ücretsiz" tasarımının varyantları

Ortak veri: 63 özgün hikâye, 207 bölüm → **kitap başına ortalama 3,3
bölüm**; A1 ~3 dk, A2 ~8 dk, B1 ~20 dk okuma süresi. Yani "bir bölüm"
≈ 1–7 dakikalık ses, "bir hikâye" ≈ 3–20 dakika.

### Varyant A — Sabit tanıtım hikâyesi

Herkese aynı, önceden seçilmiş bir hikâyenin stüdyo sesi açık.

- **Artı:** en basit (tek satır konfigürasyon, `books.is_audio_free`);
  kilit hiçbir zaman kullanıcının kendi seçtiği içerikte belirmiyor —
  ilke #1 ile en az sürtüşen varyant; ses kalitesi kanıtlanabiliyor.
- **Eksi:** **alaka sıfır.** Kullanıcı A2'deyse ve tanıtım hikâyesi
  B1'se hiç açmaz. Tadımlığın işe yaraması "istediğim şeyde denedim"
  hissine bağlı; bu varyant onu vermiyor.
- **Algı:** nötr. "Demo" gibi okunur, hediye gibi değil.
- **Dönüşüm [TAHMİN]:** en düşük. Tadımlık kullanılmadan ölür.

### Varyant B — Kullanıcının çaldığı ilk hikâye, kalıcı olarak açık ⭐

Kullanıcı hangi özgün hikâyede stüdyo sesini ilk kez başlatırsa o hikâye
hesabına kalıcı olarak yazılır (`user_audio_grants(user_id, book_id)`).

- **Artı:** alaka en yüksek — kullanıcı kendi seçtiği, zaten okuduğu
  hikâyede tam deneyimi yaşıyor. **Kilit doğal olarak kitap bitiminde
  beliriyor**, yani zaten onaylı bir paywall yüzeyinde
  (`app/book-finished.tsx` / `BookFinishedScreen.tsx`) — ilke #1 hiç
  zorlanmıyor. "Hediye" algısı yaratıyor, "kısıt" algısı değil.
- **Eksi:** kullanıcı 3 dakikalık bir A1 hikâyesinde hakkını yakabilir.
  → Çözüm: hak **ilk çalma anında değil, ilk bölümün sonunda** bağlansın
  ve bağlanırken nötr bir bilgi verilsin ("Bu hikâyenin stüdyo sesi
  hesabına eklendi"). Ayrıca hakkın **bir kez taşınabilir** olması
  (ayarlardan "tadımlık hikâyeyi değiştir") itirazı tamamen kapatıyor.
- **Maliyet:** kullanıcı başına ≤ 5,14 MB ≈ **$0,00015**. İhmal
  edilebilir.
- **Algı:** en olumlu. Kilit "elimden alındı" değil, "birini aldım"
  şeklinde okunuyor.

### Varyant C — Her hikâyenin ilk bölümü

63 hikâyenin de 1. bölümü stüdyo sesiyle açık.

- **Artı:** her hikâyede tadımlık; keşif için en iyisi; Audible/Kindle
  "örnek" alışkanlığına yakın.
- **Eksi — ve bu belirleyici:** **kesinti noktası okuma ekranının tam
  ortasına düşüyor.** 2. bölüme geçen kullanıcının sesi sessizce cihaz
  sesine düşer ya da durur. İlke #1 gereği oraya bir teklif
  koyamıyoruz; koyamayınca da tadımlığın dönüşüm yolu yok — kullanıcı
  yalnızca kaliteyi kaybettiğini fark ediyor, ne yapacağını değil.
  Ayrıca 3,3 bölümlük ortalamada "ilk bölüm" hikâyenin ~%30'u; kullanıcı
  her hikâyede aynı yerde duvara çarparsa bu tekrarlayan bir
  hayal kırıklığı üretir (§1.2'deki "yapay sinirlenme" uyarısı).
- **Dönüşüm [TAHMİN]:** orta ama **rating riski en yüksek** varyant.

### Varyant D — Süreli deneme (ilk 7 gün stüdyo sesi sınırsız)

- **Artı:** RevenueCat verisiyle en uyumlu kalıp (deneme mekaniği);
  mevcut `readTrial()` / `ctaTrial` altyapısıyla kavramsal olarak
  hizalı.
- **Eksi:** yeni kullanıcı ilk 7 günde muhtemelen hâlâ A1/A2'de ve
  ürünü keşfediyor; sesin değerini anlamadan hak bitiyor. Ayrıca
  Ö2'deki gerçek 7 günlük RevenueCat denemesiyle **karışır** — iki
  farklı "deneme" kavramı kullanıcıyı ve bizi karıştırır.
- **Karar:** Ö2 (gerçek abonelik denemesi) varken bu varyant gereksiz.

### Varyant E — Kazanılan tadımlık (Beelinguapp modeli)

Her 7 günlük okuma serisi bir stüdyo sesi hakkı açar.

- **Artı:** retention ve conversion'ı aynı mekanikle besliyor; serimiz
  zaten var (`record_reading_session`, `StreakChip`).
- **Eksi:** premium'un değerini **aşındırır** — yeterince sabırlı bir
  kullanıcı 63 hikâyeyi bedavaya açar. Ayrıca "premium al" mesajıyla
  "seriyi sürdür" mesajı birbiriyle yarışır.
- **Karar:** 1.1'de **hayır**. Telemetri B'nin tadımlık kullanım oranını
  düşük gösterirse (§1.6) ikinci tur deneyi olarak masada kalsın.

### Öneri

**Varyant B**, şu iki eklemeyle:

1. Hak, **ilk bölüm bittiğinde** bağlanır ve bir kez değiştirilebilir.
2. Varyant A'nın tek gerçek faydası (kaliteyi duyurabilmek) hikâye
   harcamadan alınır: **paywall ekranına 15–20 saniyelik bir ses
   örneği** koyulur (`app/paywall.tsx`, reader'ın dışı). Aynı cümle
   önce cihaz sesiyle sonra stüdyo sesiyle — farkı anlatmak yerine
   duyurmak. Örnek dosya ~200 KB, tek seferlik.

## 1.4 (c) Kilit kullanıcıya NASIL gösterilir — ilke #1 ile uyumlu tasarım

Bu projede aranan ayrım zaten var ve migration 024'ün yorumunda
yazılı: istemci sınır hatasında **"nötr bir mesaj gösteriyor (yükseltme
çağrısı DEĞİL)"**. Bunu genel bir kurala yükseltmeyi öneriyorum:

> **Reader kuralı (öneri: CLAUDE.md'ye ADR-012 olarak eklensin).**
> Okuma ekranının içinde yalnızca **DURUM** bildirilebilir: neyin açık,
> neyin kapalı olduğu. Yasak olan **TEKLİF**tir: fiyat, plan adı,
> "yükselt" düğmesi, tasarruf rozeti, deneme CTA'sı, ekranı kaplayan
> modal. Durum bildirimi bir düğme değil, bir etikettir.

Bu kuralla uyumlu somut tasarım:

**Reader içinde (yalnızca durum):**

- `ReaderSettingsSheet` zaten bir ses seçici barındırıyor. Oraya bir
  satır eklenir: **"Stüdyo sesi · Premium"**, pasif (disabled) radyo
  satırı, yanında küçük bir kilit ikonu. Dokunulduğunda **hiçbir yere
  gitmez**; altında tek satır açıklama belirir: _"Bu hikâyenin stüdyo
  seslendirmesi Premium ile açılıyor. Cihaz sesi her hikâyede
  ücretsiz."_ Fiyat yok, düğme yok, yönlendirme yok.
- Tadımlık hikâyede aynı satır aktif ve yanında **"Tadımlık"** etiketi
  bulunur — kullanıcı neyi kullandığını bilir.
- Kilitli hikâyede ses düğmesi **kaybolmaz**: cihaz sesiyle çalışmaya
  devam eder. Kullanıcı hiçbir zaman "sesli okuma gitmiş" hissetmez.
  Bu tasarımın en kritik parçası (§1.5, risk 3).

**Reader dışında (teklif serbest):**

1. **Kitap detay ekranı** (`app/book/[id].tsx`) — okuma başlamadan
   önce. Kapak altında rozet: **"🎧 Stüdyo sesi"** (varsa) ve kilitliyse
   dokunulabilir bir satır → paywall (`source: "book_detail_audio"`).
   Bu **yeni bir paywall tetikleyicisi** ve şu an eksik olan en doğal
   olanı: kullanıcı "bu kitabı okuyacağım" niyetindeyken.
2. **Kitap bitirme ekranı** (`BookFinishedScreen.tsx`) — mevcut
   tetikleyici, yeni fayda cümlesi: _"Bu hikâyeyi stüdyo sesiyle
   dinledin. Diğer 62 hikâye Premium'da."_ Tadımlığı bitiren kullanıcı
   için en yüksek niyet anı.
3. **Kütüphane listesi** (`BookListRow` / `BookHero`) — kulaklık rozeti
   yalnızca **bilgi** olarak; kilitli/açık ayrımı rozetin doluluğuyla.
4. **Profil** — mevcut tetikleyici, fayda listesine bir satır.

**Kütüphaneye "Sesli" filtresi** eklenmesi (§Ö14) bu rozetin karşılığını
verir ve aynı zamanda 63 özgün hikâyeyi keşfedilebilir yapar.

## 1.5 (d) Riskler

### Risk 1 — Guideline 2.3.1: olmayan/kilitlenmemiş özelliği satmak

Apple'ın metni: _"marketing your app in a misleading way, such as by
promoting content or services that it does not actually offer ... is
grounds for removal"_
([App Review Guidelines 2.3.1](https://developer.apple.com/app-store/review/guidelines/)).

Bugünkü durumda **iki yönlü** risk var:

- **Satılan şey herkeste açık.** `book-audio` bucket public; paywall'da
  "stüdyo sesi" yazarsak ücretsiz kullanıcıda da çalışıyor olacak.
  Bu, migration 029'un düzelttiği AI kotası bulgusunun aynısı:
  _"satılan fayda gerçekte var, sadece KATMANA BAĞLI DEĞİLDİ."_
  → **S1 (imzalı URL) yapılmadan paywall metnine ses satırı EKLENMEZ.**
  Bu bir sıralama kuralı, tercih değil.
- **Kapsam abartısı.** Stüdyo sesi 109 kitabın 63'ünde var, 46
  klasikte YOK. Paywall'da "sesli kitap dinle" gibi kapsayıcı bir
  ifade kullanmak yanıltıcı olur.
  → Zorunlu metin şekli: **"63 özgün hikâyede stüdyo seslendirmesi"**.
  Sayı yazılmalı. App Store açıklamasında da aynı sayı geçmeli.

### Risk 2 — Guideline 3.1.2(a)

İlgili cümle: _"If you are changing your existing app to a
subscription-based business model, you should not take away the primary
functionality existing users have already paid for."_
([3.1.2(a)](https://developer.apple.com/app-store/review/guidelines/))

- Bu madde **satın alınmış** işlevi koruyor; bizde hiç kimse sesli
  okumayı satın almadı, 1.0 henüz yayında bile değil. **Doğrudan ihlal
  yok.** [TAHMİN: inceleme riski düşük.]
- Ama aynı maddenin "ongoing value" şartı için stüdyo sesi iyi bir
  argüman: "continually updated media content" listesinde açıkça
  sayılıyor. Yeni hikâye üretimi devam ettikçe bu güçleniyor.
- **Gerçek 3.1.2 riski başka yerde:** tadımlık hakkı hesaba
  (`user_id`) bağlanacağı için "abonelik tüm cihazlarda çalışmalı"
  şartıyla uyumlu. Cihaza bağlanırsa (AsyncStorage) **değil**.
  → Tadımlık kaydı **sunucuda**, `user_audio_grants` tablosunda
  tutulmalı; RLS zorunlu (CLAUDE.md "RLS'siz tablo" yasağı).

### Risk 3 — "Sesli okuma ücretsizdi, artık değil" algısı

Bu, **en somut ve en yönetilebilir** risk. Sektörde gözlenen kalıp:
kullanıcılar kazandıklarına değil **kaybettiklerine** göre puanlıyor;
alışkanlığı bölen güncelleme cezalandırılıyor
([Adapty — app ratings](https://adapty.io/blog/app-ratings-and-reviews/)).
100M+ yüklemeli Hypic örneğinde 1 yıldızlı yorumların ortak teması
"eskiden ücretsiz olan özellikler artık kilitli"
([Unstar blog](https://unstar.app/blog/app-store-reviews)).

Bizim lehimize üç şey var, ama üçü de **tasarımla korunmalı**:

1. **Sesli okuma kaybolmuyor.** 109 kitabın hepsinde cihaz sesi çalmaya
   devam ediyor, kelime vurgusuyla. Kaybolan bir özellik yok; eklenen
   bir kalite katmanı var. → **Kilitli hikâyede ses düğmesi asla
   kaybolmamalı.** Düğme kaybolursa algı anında "özellik gitti"ye
   döner.
2. **Zamanlama.** 1.0 henüz yayında değil. Stüdyo sesi **hiç ücretsiz
   yayınlanmazsa** "geri alma" diye bir olay olmaz — sadece premium bir
   fayda olarak doğar. → **Karar: stüdyo sesi 1.0'da ücretsiz olarak
   YAYINLANMAMALI.** Eğer 1.0 stüdyo sesiyle ücretsiz çıkarsa, sonradan
   kilitlemek gerçek bir geri alma olur ve o zaman mevcut kullanıcıları
   **grandfathering** ile korumak gerekir (teknik olarak
   `user_audio_grants`'a toplu satır yazmak; yapılabilir ama gereksiz
   bir borç).
3. **Dil.** Uygulama içinde ve App Store metninde "sesli okuma premium"
   ASLA yazılmaz. Doğru cümle iki parçalı:
   _"Sesli okuma her kitapta ücretsiz. Premium, 63 özgün hikâyeye
   stüdyoda kaydedilmiş insan sesi ekliyor."_
   → `tr.json` / `en.json`'da bu ayrımı taşıyan anahtarlar açılmalı;
   tek bir "audioPremium" anahtarı bu nüansı kaybettirir.

### Risk 4 — ADR-011 ile tutarlılık

ADR-011 "sesli okuma ÜCRETSİZ" diyor ve gerekçesi "marjinal maliyeti
sıfır". §0'daki hesap gösteriyor ki stüdyo sesinin marjinal maliyeti de
neredeyse sıfır. Yani ADR-011'in yazıldığı gibi bırakılıp stüdyo
sesinin kilitlenmesi **belgeyle çelişir**.
→ **ADR-011 güncellenmeli** (ADR-004 ve ADR-007'de yapıldığı gibi
"revize edildi" notuyla): gerekçe maliyetten değere kaydırılmalı.
Önerilen ayrım cümlesi:

> Cihaz-üstü TTS ücretsiz kalır çünkü işletim sisteminin verdiği bir
> yetenek; onu kilitlemek yapay bir kısıt olurdu. Stüdyo seslendirmesi
> ise ürettiğimiz bir varlık — 63 hikâye için yazılmış, kaydedilmiş ve
> hizalanmış bir içerik katmanı. Premium'un sattığı şey bant genişliği
> değil, bu içerik.

### Risk 5 — Sessiz düşüş (silent downgrade)

`useChapterAudio` `audioUrl` boşsa cihaz TTS'ine düşüyor. Kilit
uygulanınca ücretsiz kullanıcı için `audioUrl` null gelecek ve ses
**hiçbir açıklama olmadan** cihaz sesine dönecek. Kullanıcı bunu "bozuk"
sanabilir.
→ İstemci "bu bölümde stüdyo sesi VAR ama benim yetkim YOK" ile "hiç
yok"u ayırt edebilmeli. Öneri: `useChapterQuery` `audio_url` yerine
`has_studio_audio: boolean` + `audio_url: string | null` döndürsün.
Böylece §1.4'teki durum etiketi doğru gösterilebilir, klasiklerde ise
hiç gösterilmez.

## 1.6 Uygulama sırası ve telemetri

| Adım   | İş                                                                                                                                                 | Efor  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **S1** | `book-audio` private + `my_chapter_audio(chapter_id)` RPC (imzalı URL, TTL ~2 sa). Migration 029 deseni. Pipeline'da `ensure_bucket` public:false. | **M** |
| **S2** | `user_audio_grants` tablosu (RLS) + ilk bölüm sonunda hak bağlama + bir kez değiştirme.                                                            | **M** |
| **S3** | Durum etiketleri: `has_studio_audio`, ReaderSettingsSheet pasif satırı, kitap detayı rozeti + yeni paywall tetikleyicisi.                          | **S** |
| **S4** | Paywall ses örneği (cihaz vs stüdyo, 15–20 sn) + i18n metin ayrımı + ADR-011 güncellemesi.                                                         | **S** |
| **S5** | Çevrimdışı indirme yetkisi: tadımlık/premium hikâyelerin sesi indirilebilsin (Ö13 ile birlikte).                                                   | **M** |

**S1 diğer hepsinin ön koşuludur.** S1 yoksa S2–S4 yalnızca kozmetiktir
ve Guideline 2.3.1 riski taşır.

**Ölçülecekler** (Ö12'nin huni telemetrisine eklenecek):
`audio_taster_granted`, `audio_taster_completed` (tadımlık hikâye
bitti mi), `audio_locked_seen` (durum etiketi görüldü), paywall
`source: "book_detail_audio"` ve `"book_finished_audio"` dönüşümü,
stüdyo sesli oturumda ortalama okuma süresi vs cihaz sesli oturum.
Son metrik, ses+okuma birlikteliğinin retention'a etkisini ölçen tek
gösterge ve §2.2'deki literatürü kendi verimizle doğrular.

---

# GÖREV 2 — Retention ve conversion

## 2.1 (a) Rakiplerin ses konumlandırması

| Ürün            | Ses ücretsiz mi?                          | Ne kadar veriyor                                        | Konumlandırma                             | Kaynak                                                                                                                                                                         |
| --------------- | ----------------------------------------- | ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Duolingo**    | **Evet, ve genişliyor**                   | DuoRadio 9 dilde ücretsiz; podcast'ler tamamen ücretsiz | Ses bir kanca, gelir kaynağı değil        | [TechCrunch](https://techcrunch.com/2026/04/22/duolingo-is-now-giving-users-access-to-advanced-learning-content/), [duoplanet](https://duoplanet.com/duolingo-podcasts-guide/) |
| **Beelinguapp** | **Evet** (karaoke ses ana özellik)        | Sınırlı sayıda kitap; seri yaptıkça premium açılıyor    | Ses ürünün kendisi; satılan **kütüphane** | [Actual Fluency](https://actualfluency.com/beelinguapp-review/)                                                                                                                |
| **LingQ**       | Evet (ders sesi)                          | 5 içe aktarma, 20 kelime                                | Satılan **hacim** (import + LingQ sayısı) | [LingQ](https://www.lingq.com/blog/lingq-free-vs-premium/)                                                                                                                     |
| **Cake**        | Evet (video sesi)                         | Reklamlı + kalp sınırı; içeriğin çoğu Plus'a kaydı      | Satılan **içerik + reklamsızlık**         | [Google Play](https://play.google.com/store/apps/details?id=me.mycake)                                                                                                         |
| **Speak**       | Hayır (telaffuz geri bildirimi premium)   | 7 günlük deneme                                         | Satılan **AI geri bildirimi**             | [Lingtuitive](https://lingtuitive.com/blog/speak-review)                                                                                                                       |
| **Blinkist**    | **Hayır — ücretsizde ses hiç yok**        | Günde 1 metin özeti, seçim hakkı yok                    | Ses doğrudan premium sinyali              | [befreed](https://www.befreed.ai/blog/blinkist-pricing-2026)                                                                                                                   |
| **Headway**     | **Evet, günde 1 özet sesli + çevrimdışı** | Günde 1 birim, tam deneyim                              | Tadımlık: "tam deneyim, az miktarda"      | [nibble](https://nibble-app.com/blog/blinkist-vs-headway)                                                                                                                      |

**Üç okuma:**

1. **Dil öğrenme tarafında ses neredeyse hiç satılmıyor** (Duolingo,
   Beelinguapp, LingQ, Cake). Satılan şey hacim, kütüphane veya
   reklamsızlık. Ses satan tek örnek Blinkist ve o bir dil öğrenme
   uygulaması değil.
   → Bizim "stüdyo sesi premium" kararımız **kategorinin dışına düşen
   bir hamle**. Bu otomatik olarak yanlış demek değil (63 özgün
   hikâyeye stüdyo kaydı yaptırmış başka bir Türkçe-arayüzlü rakip
   yok), ama **iletişimi çok dikkatli olmalı** — kullanıcı
   karşılaştırmayı Duolingo'yla yapacak.
2. **Headway modeli bize en yakın olanı** ve tam olarak Varyant B'nin
   yaptığı şey: birimi kısıtla, deneyimi kısıtlama.
3. **Blinkist modeli (ücretsizde ses hiç yok) bizde imkânsız** — ilke
   #2 ve ADR-011 cihaz sesini garanti ediyor. İyi ki: Blinkist'in
   ücretsiz katmanı sektörde en çok eleştirilen katmanlardan biri.

## 2.2 (c) Sesin açtığı yeni imkânlar — hangileri bu ürüne uygun

**Pedagojik dayanak:** sesli destekli tekrarlı okuma, sessiz tekrarlı
okumaya göre anlamlı biçimde daha fazla kelime bilgisi üretiyor (Webb &
Chang 2015); okuma+dinleme ile 10 dereceli okuma kitabı sonrası göreli
kazanım %44,06, üç ay sonra %36,66
([Language Teaching Research](https://journals.sagepub.com/doi/abs/10.1177/1362168814559800);
[Springer, dinleme vs okuma karşılaştırması](https://link.springer.com/article/10.1007/s10936-020-09690-y)).
Yani "dinleyerek okumak" bizim için bir pazarlama süsü değil, ürünün
çekirdek iddiasını (kelime öğrenmek) güçlendiren ölçülmüş bir yol.

| İmkân                              | Uygun mu?                       | Gerekçe                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Arka planda dinleme**            | ✅ **Evet — en yüksek öncelik** | ADR-011'in açıkça yazdığı tek bilinen sınır. Türk kullanıcının en büyük kullanım anı (metro, trafik, yürüyüş) şu an tamamen kapalı. → **Ö13**                                                                |
| **Çevrimdışı ses indirme**         | ✅ Evet                         | Offline bölüm önbelleği (SQLite) zaten var; ses onun eksik yarısı. Metro/uçak senaryosu ancak ikisi birlikte çalışır. → **Ö13b (S5)**                                                                        |
| **Dinleyerek tekrar (SRS'te ses)** | ✅ Evet                         | Kelime kartında telaffuz. Ama `lemmas.audio_url` **boş** (CLAUDE.md teknik borç). Cihaz TTS'i ile tek kelime söyletmek bedava ve anında. → **Ö15**                                                           |
| **Gölge okuma (shadowing)**        | ⚠️ Kısmen                       | Tam shadowing mikrofon + hizalama ister. Ama **hafif sürümü** bedava: cümleye uzun bas → "bu cümleyi tekrar dinle" + yavaşlatılmış hız. Ses zaten zaman damgalı. → **Ö16**                                   |
| **Telaffuz karşılaştırma**         | ❌ Hayır (bu sürümde)           | Konuşma tanıma + puanlama demek: yeni bir bulut bağımlılığı, mikrofon izni, gerçek API maliyeti, ve Speak'in çekirdek işi. "Basitlik önce gelir" ile çelişiyor. §3'te gerekçesiyle listelendi.               |
| **Uyku modu / zamanlayıcı**        | ⚠️ Küçük ama ucuz               | Arka plan dinleme (Ö13) gelirse ~30 satırlık bir ek. Tek başına değersiz, Ö13'ün içinde anlamlı. → **Ö13'e dahil**                                                                                           |
| **Salt-dinleme modu**              | ❌ Hayır                        | Ürün "okuyarak öğrenme". Metni gizleyip yalnızca ses bırakmak, ürünü zayıf bir sesli kitap uygulamasına çevirir ve kelimeye dokunma döngüsünü öldürür. Arka plan dinleme (Ö13) bu ihtiyacı zaten karşılıyor. |
| **Podcast / özgün ses içeriği**    | ❌ Hayır                        | Yeni içerik türü = yeni pipeline. Duolingo bile Podcast'i kapatıyor. İlke #5.                                                                                                                                |

## 2.3 (b) Yeni özellik önerileri (Ö13–Ö22)

Her öneri: **kullanıcı ne görür / hangi metrik / efor / mevcut altyapı /
risk**.

---

### Ö13 — Arka planda dinleme + kilit ekranı denetimi (+ uyku zamanlayıcı)

- **Kullanıcı ne görür:** ses çalarken uygulamadan çıkınca ses devam
  ediyor; kilit ekranında kapak, hikâye adı, oynat/duraklat ve 15 sn
  ileri/geri. Ayarlarda "şu kadar sonra dur" (15/30/60 dk).
- **Metrik:** oturum başına dinleme süresi, D7/D30 retention, premium
  dönüşümü. **Premium'un en somut satır maddesi bu olur** — "kulaklıkla
  yolda dinle" tek cümlede anlaşılıyor, "stüdyo kalitesi" anlaşılmıyor.
- **Efor: M.** `app.json`'a `UIBackgroundModes: ["audio"]`,
  `expo-audio` ile `Audio.setAudioModeAsync({ staysActiveInBackground: true })`,
  Now Playing bilgisi. Bulut sesi için doğrudan çalışır.
  **Uyarı:** cihaz TTS'i (`expo-speech`) arka planda çalışmaz — yani bu
  özellik doğal olarak yalnızca stüdyo sesi olan 63 hikâyede mümkün.
  Bu, kilidi **teknik bir gerçeğe** dayandırıyor, yapay bir kısıta
  değil — Guideline 2.3.1 ve algı açısından en temiz konumlandırma.
- **Altyapı örtüşmesi:** yüksek. `useChapterAudio` zaten `expo-audio`
  `useAudioPlayer` kullanıyor.
- **Risk:** arka plan modu App Review'da "gerçekten ses çalıyor mu"
  kontrolüne tabi; gerçekten çaldığı için sorun değil. Vurgu
  senkronizasyonu arka planda anlamsızlaşır → uygulamaya dönünce
  `findWordIndexAtTime` ile yeniden hizalanmalı (kod bunu zaten
  yapabiliyor).

---

### Ö14 — Kütüphanede "🎧 Sesli" filtresi ve rafı

- **Kullanıcı ne görür:** kütüphane sekmesinde seviye filtrelerinin
  yanında kulaklık filtresi; ana sayfada "Stüdyo sesiyle" rafı.
- **Metrik:** 63 özgün hikâyenin keşfedilme oranı (bugün 109 kitabın
  içinde kayboluyorlar), kitap detayı → paywall dönüşümü.
- **Efor: S.** `chapters`'ta `audio_url` var; `books` düzeyinde
  `has_audio` türetilmiş bir alan/`view` gerekiyor (migration 025'teki
  `book_section_counts` deseni).
- **Altyapı örtüşmesi:** yüksek; filtre altyapısı `library`'de mevcut.
- **Risk:** düşük. Tek dikkat: rozet **bilgi**, kilit değil — kilitli
  kitap da listede görünür ve okunabilir (ilke #2).

---

### Ö15 — Kelime kartında telaffuz (SRS + kelime defteri + WordSheet)

- **Kullanıcı ne görür:** kelime sayfasında/kartında küçük bir hoparlör;
  dokununca kelime İngilizce telaffuz edilir. Tekrar ekranında kart
  açılırken otomatik seçeneği.
- **Metrik:** SRS oturum tamamlanma oranı, kelime tutma oranı, D30.
  Kelimeyi duymak, hatırlamayı destekleyen ikinci bir kanal
  (§2.2 literatürü).
- **Efor: S.** `Speech.speak(word)` — tek satır; `voiceCatalog.ts`
  seçili sesi zaten veriyor. `lemmas.audio_url` beklemeye gerek yok.
- **Altyapı örtüşmesi:** çok yüksek. `WordSheet.tsx` ve `srs` mevcut.
- **Risk:** cihazda "compact" ses kuruluysa kalite düşük. Mevcut
  `voiceUpgradeHint` ipucu buraya da konulabilir. **Ücretsiz kalmalı**
  — cihaz TTS'i, ADR-011.

---

### Ö16 — "Cümleyi dinle" (SentenceSheet içinde)

- **Kullanıcı ne görür:** cümleye uzun basınca açılan mevcut sayfada,
  AI çevirisinin yanında bir "🔊 Dinle" ve "0,7×" yavaş seçeneği.
  Stüdyo sesi varsa o cümlenin gerçek kaydından, yoksa cihaz sesiyle.
- **Metrik:** cümle sayfası açılma → kapanma süresi, tekrar açılma
  oranı; dolaylı olarak AI çeviri kotasına baskıyı azaltır (kullanıcı
  bazen anlamadığı için değil, duymak için açıyor).
- **Efor: S** (cihaz sesiyle) / **M** (stüdyo kaydından kesit: zaman
  damgaları `chapterAudioTimings.ts`'te zaten var, `seek` + `stop at`
  gerekir).
- **Altyapı örtüşmesi:** yüksek.
- **Risk:** düşük. **İlke #1 kontrolü:** bu bir durum/araç, teklif
  değil — stüdyo kesiti kilitliyse cihaz sesine düşer, promosyon
  gösterilmez.

---

### Ö17 — "Dinleme serisi" değil, **günlük dinleme dakikası** hedefi

- **Kullanıcı ne görür:** ana sayfadaki seri kartının altında ikinci bir
  halka: "bugün 7/10 dk dinledin". Ayarlanabilir hedef (5/10/20 dk).
- **Metrik:** DAU, oturum uzunluğu, D7. Duolingo'nun günlük hedef +
  seri kombinasyonu yayınlanmış en güçlü retention kaldıracı
  ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
- **Efor: S.** `record_reading_session` (migration 026) zaten oturum
  yazıyor; dinlenen saniye alanı eklenmeli.
- **Altyapı örtüşmesi:** yüksek.
- **Risk:** Ö6 (günlük hedef + seri kurtarma) ile **çakışabilir**. İkisi
  ayrı halka olmamalı; **tek bir günlük hedef** olmalı ve dinleme
  dakikası ona sayılmalı. Aksi hâlde iki rakip hedef kullanıcıyı böler.

---

### Ö18 — Bölüm sonu "duyduğun kelimeler" köprüsü

- **Kullanıcı ne görür:** `ChapterCompleteCard`'da (bölüm sonu, reader
  içi ama **teklif değil, içerik**) o bölümde kaydettiği kelimeler
  hoparlör ikonuyla listelenir; "3 kartı şimdi tekrar et" düğmesi
  tekrar ekranına götürür.
- **Metrik:** okuma → SRS geçiş oranı (bugün ~sıfır; Ö7'nin ses
  destekli hâli), SRS D7.
- **Efor: S** (Ö7 yapıldıysa **XS**).
- **Altyapı örtüşmesi:** yüksek.
- **Risk:** ilke #1. Bu ekran reader'ın içinde — **hiçbir premium
  ifadesi girmemeli.** Kullanıcı 100 kelime sınırına dayandıysa bile
  burada nötr mesaj (migration 024 deseni).

---

### Ö19 — Ses hızı hafızası ve hikâye başına devam noktası

- **Kullanıcı ne görür:** seçtiği okuma hızı tüm hikâyelerde
  hatırlanıyor; bir hikâyeye döndüğünde ses **bıraktığı yerden** devam
  ediyor ("2. bölüm, 4:12'den devam et").
- **Metrik:** yarım kalan hikâyenin tamamlanma oranı, kitap bitirme
  sayısı — ki kitap bitirme bizim **en güçlü paywall tetikleyicimiz**
  (`BookFinishedScreen`). Yani bu doğrudan conversion işi.
- **Efor: S.** `useReaderSettings` hızı zaten tutuyor; ses pozisyonu
  için bölüm+milisaniye kaydı gerekiyor (AsyncStorage yeterli, ADR-004).
- **Altyapı örtüşmesi:** yüksek.
- **Risk:** çok düşük.

---

### Ö20 — Paywall'da A/B karşılaştırmalı ses örneği

- **Kullanıcı ne görür:** paywall'da tek bir düğme: aynı cümlenin önce
  cihaz sesiyle sonra stüdyo sesiyle çalınması, altında iki etiket.
- **Metrik:** paywall görüntüleme → satın alma. Sektör verisi
  paywall'da somut/etkileşimli öğelerin metin listelerini yendiğini
  gösteriyor
  ([RevenueCat paywall testleri](https://www.revenuecat.com/blog/growth/paywall-tests-grow-app-revenue)).
  Bizim durumumuzda özellikle önemli: **"stüdyo sesi" yazıyla
  anlaşılmayan, ancak duyulunca anlaşılan bir fayda.**
- **Efor: S.** İki küçük mp3 (~200 KB), paywall reader'ın dışında.
- **Altyapı örtüşmesi:** yüksek.
- **Risk:** paywall'a ses eklemek dikkat dağıtabilir; sessiz modda
  hiçbir şey duyulmaz → görsel dalga formu + "sesi aç" uyarısı gerek.

---

### Ö21 — "Bu hafta dinlediklerin" haftalık özete ses satırı

- **Kullanıcı ne görür:** Ö9'daki haftalık özete iki satır: dinleme
  dakikası ve "en çok duyduğun 5 yeni kelime".
- **Metrik:** bildirim → uygulama açılış oranı, haftalık geri dönüş.
- **Efor: XS** (Ö9 yapıldıysa).
- **Altyapı örtüşmesi:** tam.
- **Risk:** yok.

---

### Ö22 — Onboarding'de tek dokunuşluk ses tanıtımı

- **Kullanıcı ne görür:** seviye testi sonrası, ilk hikâye önerilirken
  tek ekran: "Bu hikâyeyi dinleyerek de okuyabilirsin" + 10 saniyelik
  örnek + "Dinleyerek başla / Sessiz oku".
- **Metrik:** ilk oturumda ses kullanım oranı → tadımlık kullanım oranı
  → D1. Tadımlığın (S2) hiç kullanılmaması S2'nin en büyük başarısızlık
  senaryosu; bu ekran onu doğrudan hedefliyor.
- **Efor: S.**
- **Altyapı örtüşmesi:** yüksek (onboarding feature mevcut).
- **Risk:** onboarding uzuyor. Tek ekran ve **atlanabilir** olmalı.

---

## 2.4 Etki / efor matrisi

Etki ölçeği: conversion + retention birleşik, [TAHMİN] — telemetri
yoksa hepsi tahmindir.

```
        YÜKSEK ETKİ
            │
   S1 ●     │  ● Ö13 (arka plan dinleme)
   (ön koşul)│  ● S2 (tadımlık)
            │  ● Ö19 (devam noktası)
            │  ● Ö14 (sesli filtre/raf)
   ─────────┼─────────────────────────────  EFOR →
            │  ● Ö20 (paywall ses örneği)
            │  ● Ö15 (kelime telaffuzu)
   Ö21 ●    │  ● Ö18 (bölüm sonu köprü)
   Ö22 ●    │  ● Ö16 (cümleyi dinle)
            │  ● Ö17 (dinleme dakikası)
        DÜŞÜK ETKİ
        S (düşük efor)          M/L (yüksek efor)
```

Tablo hâli:

| #       | Öneri                    | Efor | Etki (conv.) | Etki (ret.) | Bağımlılık            |
| ------- | ------------------------ | ---- | ------------ | ----------- | --------------------- |
| **S1**  | İmzalı ses URL'i         | M    | —            | —           | **Hepsinin önkoşulu** |
| **S2**  | Tadımlık (Varyant B)     | M    | Yüksek       | Orta        | S1                    |
| **Ö13** | Arka planda dinleme      | M    | **Yüksek**   | **Yüksek**  | S1                    |
| **Ö19** | Ses devam noktası + hız  | S    | Orta         | Yüksek      | —                     |
| **Ö14** | Sesli filtre/raf         | S    | Orta         | Orta        | —                     |
| **S3**  | Durum etiketleri + rozet | S    | Orta         | —           | S1, S2                |
| **Ö20** | Paywall ses örneği       | S    | Orta         | —           | —                     |
| **Ö15** | Kelime telaffuzu         | S    | Düşük        | Orta        | —                     |
| **Ö18** | Bölüm sonu köprü         | S    | Düşük        | Orta        | Ö7                    |
| **Ö16** | Cümleyi dinle            | S/M  | Düşük        | Orta        | —                     |
| **Ö22** | Onboarding ses tanıtımı  | S    | Orta         | Düşük       | S2                    |
| **Ö17** | Günlük dinleme dakikası  | S    | Düşük        | Orta        | Ö6 ile birleştir      |
| **Ö21** | Haftalık özette ses      | XS   | Düşük        | Düşük       | Ö9                    |

## 2.5 İlk üç — gerekçeli

**1. S1 — imzalı ses URL'i.** Tercih değil, sıralama zorunluluğu.
Bugün paywall'a "stüdyo sesi" yazmak, migration 029'un düzelttiği
hatanın aynısını tekrar etmek olur: satılan fayda herkeste açık
(Guideline 2.3.1). Ayrıca S2/S3/Ö13'ün hepsi buna dayanıyor.

**2. Ö13 — arka planda dinleme.** Premium'un tek en anlaşılır satır
maddesi, ADR-011'in belgelenmiş tek sınırını kaldırıyor ve kilidi
**yapay değil teknik** bir gerçeğe oturtuyor (cihaz TTS'i arka planda
çalışamaz). Türk kullanıcının en büyük kullanım anını — yol — bugün
tamamen kaçırıyoruz. Rakip tablosunda (§2.1) dil öğrenme kategorisinde
ses satan yok; ama **arka planda dinlenebilir ses** satmak sesli kitap
kategorisinin standardı ve kullanıcı bunu anlıyor.

**3. S2 — Varyant B tadımlığı.** §1.2'deki Headway modelinin bizdeki
karşılığı: tam deneyim, tek birim. Maliyeti kullanıcı başına
$0,00015; kilit doğal olarak onaylı bir paywall yüzeyinde
(`BookFinishedScreen`) beliriyor; algı "hediye", "kayıp" değil.
Ö22 ile paketlenmeli, yoksa tadımlık kullanılmadan ölür.

---

## 3. Bilinçle ÖNERMEDİKLERİM

| Fikir                                            | Neden hayır                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Telaffuz puanlama / konuşma tanıma               | Yeni bulut bağımlılığı + mikrofon izni + gerçek API maliyeti + Speak'in çekirdek işi. İlke #5. Ses altyapısı oturduktan sonra ayrı bir round.                                  |
| Klasiklere de stüdyo sesi üretmek                | 12,79M karakter, hiçbir ücretsiz kotaya sığmıyor (betiğin kendi hesabı); ~$205 tek seferlik + ~7 GB depolama. Cihaz TTS'i klasiklerde zaten çalışıyor. Talep ölçülmeden hayır. |
| Salt-dinleme (metinsiz) modu                     | Ürünü zayıf bir sesli kitap uygulamasına çevirir, kelimeye dokunma döngüsünü öldürür. Ö13 bu ihtiyacı zaten karşılıyor.                                                        |
| Cihaz TTS'ini kısıtlamak (ör. günde 20 dk)       | ADR-011 ve ilke #2 ihlali. Marjinal maliyeti sıfır olan bir yeteneği kısıtlamak yapay kısıttır ve rating'i doğrudan vurur.                                                     |
| Reklamlı ücretsiz katman (Beelinguapp/Cake gibi) | İlke #1 (okuma ekranında reklam yok) ürünün kimliği. Ayrıca reklam SDK'sı = bundle + gizlilik beyanı + ATT.                                                                    |
| Ses için ayrı bir "Audio" abonelik katmanı       | İki katman, iki fiyat, iki paywall = karmaşıklık. RevenueCat entitlement adı `premium` tek; ikinciye geçmek webhook zincirini (ADR-009) karmaşıklaştırır.                      |
| Kazanılan tadımlık (Varyant E, seri ödülü)       | Premium'un değerini aşındırır ve "seriyi sürdür" ile "premium al" mesajlarını yarıştırır. S2 telemetrisi kötü çıkarsa ikinci tur deneyi.                                       |
| Stüdyo sesini 1.0'da ücretsiz yayınlamak         | Sonradan kilitlemek gerçek bir "geri alma" olur ve grandfathering borcu doğurur. Kilit kararı alındıysa **hiç ücretsiz doğmamalı**.                                            |

---

## 4. CLAUDE.md'ye önerilen değişiklikler

Bu belgenin kararları uygulanırsa proje anayasası şu üç yerde
güncellenmeli — aksi hâlde belge kodla çelişir (ADR-004/ADR-007'de
yaşanan durum):

1. **ADR-011 revize edilir.** Gerekçe maliyetten değere kaydırılır
   (§1.5, Risk 4'teki cümle). "Sesli okuma ÜCRETSİZ" ifadesi
   **"cihaz-üstü sesli okuma ücretsiz"** olarak netleştirilir.
2. **Yeni ADR-012: Reader içinde durum evet, teklif hayır.** §1.4'teki
   kural. İlke #1'in uygulanabilir bir tanımı; migration 024'ün
   yorumunda zaten var olan ayrımı genelleştirir.
3. **Ürün tanımı bölümü:** premium fayda listesine
   _"63 özgün hikâyede stüdyo seslendirmesi ve arka planda dinleme"_
   satırı eklenir — **ama yalnızca S1 dağıtıldıktan sonra.** Kural
   zaten yazılı: "bir fayda önce üründe çalışır, sonra paywall'a
   yazılır."

---

## Kaynaklar

- [Apple App Review Guidelines (2.3.1, 3.1.1, 3.1.2)](https://developer.apple.com/app-store/review/guidelines/)
- [RevenueCat — State of Subscription Apps 2026, özet](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- [RevenueCat — Freemium tier design (taster/split/hybrid, Bill of Rights)](https://www.revenuecat.com/blog/growth/freemium-tier-design)
- [RevenueCat — Paywall testleri](https://www.revenuecat.com/blog/growth/paywall-tests-grow-app-revenue)
- [Airbridge — Hard paywall vs freemium 2026 (75K uygulama)](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026)
- [Airbridge — Hard vs soft paywalls (Adapty karşıt verisi)](https://www.airbridge.io/en/blog/hard-vs-soft-paywalls)
- [Adapty — App ratings and reviews](https://adapty.io/blog/app-ratings-and-reviews/)
- [Unstar — App Store review management (Hypic vakası)](https://unstar.app/blog/app-store-reviews)
- [Supabase pricing (depolama/egress)](https://supabase.com/pricing)
- [LingQ — Free vs Premium](https://www.lingq.com/blog/lingq-free-vs-premium/)
- [Actual Fluency — Beelinguapp incelemesi](https://actualfluency.com/beelinguapp-review/)
- [Nibble — Blinkist vs Headway](https://nibble-app.com/blog/blinkist-vs-headway)
- [befreed — Blinkist pricing 2026](https://www.befreed.ai/blog/blinkist-pricing-2026)
- [Lingtuitive — Speak incelemesi](https://lingtuitive.com/blog/speak-review)
- [Cake — Google Play listesi](https://play.google.com/store/apps/details?id=me.mycake)
- [TechCrunch — Duolingo ileri içeriği ücretsize açıyor (2026-04)](https://techcrunch.com/2026/04/22/duolingo-is-now-giving-users-access-to-advanced-learning-content/)
- [duoplanet — Duolingo Podcasts rehberi](https://duoplanet.com/duolingo-podcasts-guide/)
- [Webb & Chang (2015) — Sesli destekli extensive reading ve kelime kazanımı](https://journals.sagepub.com/doi/abs/10.1177/1362168814559800)
- [Springer — Dinleme vs okuma girdisinden kelime kazanımı](https://link.springer.com/article/10.1007/s10936-020-09690-y)
- [Lenny's Newsletter — Duolingo retention vakası](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)

### Kaynak bulunamayanlar

- Tadımlık birim sayısının (1 vs 3 vs "günde 1") conversion'a etkisine
  dair yayınlanmış A/B verisi: **[VERİ YOK]**
- Beelinguapp'in "seri ile premium hikâye açma" mekaniğinin ölçülmüş
  lift'i: **[VERİ YOK]**
- Dil öğrenme uygulamalarında arka planda dinlemenin retention etkisi:
  **[VERİ YOK]**
- Headway/Blinkist ücretsiz katman tasarımlarının dönüşüm rakamları:
**[VERİ YOK]**
</content>

</invoke>
