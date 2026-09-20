# İngilizce Hikaye — Proje Anayasası

Bu dosya, üzerinde çalışan her katkıcının (insan veya AI) uyması gereken
kararları ve kuralları tanımlar. Ürün özelliklerini değil, **nasıl inşa
edildiğini** anlatır.

## Ürün Tanımı

Türk kullanıcıların İngilizce hikaye okuyarak kelime ve cümle bilgisi
geliştirmesini sağlayan bir iOS uygulaması. Kitaplar her zaman ücretsizdir;
klasikler public domain, seviyeli hikâyeler kendi ürettiğimiz özgün
metinler. Gelir premium abonelikten geliyor.

**Premium bugün ne sunuyor** (paywall'da yalnızca bunlar yazılabilir):
**stüdyo seslendirmesi**, sınırsız kelime çevirisi (ücretsizde günde 15 --
migration 038), sınırsız kelime defteri, yüksek AI cümle çevirisi kotası,
ikinci dil çifti.

**AŞAĞIDAKİLER PREMIUM DEĞİL** ve paywall'a yazılamaz (2026-09-14 denetim
bulgusu): aralıklı tekrar (SRS'te hiçbir yetki kontrolü yok, ücretsiz
kullanıcı sınırsız tekrar yapıyor) ve istatistikler (`/statistics`
kontrolsüz açılıyor). İkisi de bir süre paywall'da yazıyordu; bu, ücretsiz
bir özelliği premium diye satmak demekti (Guideline 2.3.1). Gerçekten
premium yapılmaları ücretsiz katmandan değer almak demek -- ayrı bir ürün
kararı.

**Dinlemek premium'dur** (bkz. ADR-012). Bölüm seslendirmesi önceden
üretilmiş stüdyo kaydıyla yapılıyor ve özgün 63 hikâyede var; klasiklerde
yok. Erişimi olmayan kullanıcıda seslendirme düğmesi hiç görünmüyor —
kilit ikonu ya da "yükselt" düğmesi değil, düğmenin kendisi yok.

**Kelime telaffuzu ÜCRETSİZ ve öyle kalacak.** Sözlük kartındaki hoparlör
cihazın kendi motoruyla (`expo-speech`) tek kelimeyi okuyor. Bu bir dinleme
özelliği değil, sözlük akışının parçası; ücretli yapmak öğrenme döngüsünün
ortasını kesmek olurdu.

Kural (denetimden kalan): bir fayda önce üründe çalışır, sonra paywall'a
yazılır — tersi yanıltıcı metadatadır (App Store Guideline 2.3.1).

### Hedef Kullanıcı

İngilizcesi A2–B2 seviyesinde, okuyarak öğrenmeyi seven, İngilizce metin
üzerinde anlık kelime/cümle desteği isteyen Türk kullanıcı. Teknik olmayan,
sade ve akıcı bir mobil deneyim bekliyor.

### Ürün İlkeleri

1. **Okuma ekranı kutsaldır.** Reader içinde asla reklam, paywall
   promosyonu, banner veya dikkat dağıtıcı UI olmaz. Premium teklifi
   okuma akışının dışında, kullanıcının kendi seçtiği bir anda gösterilir.
2. **Ücretsiz katman gerçekten kullanılabilir olmalı.** Tüm kitaplar
   herkese açık; premium, "daha fazla" sunar, "temel işlevi" kilitlemez.
3. **İçerik kaynağı her zaman doğrulanabilir public domain'dir.** Pipeline
   dışında hiçbir yerden içerik eklenmez.
4. **Türkçe arayüz, İngilizce içerik.** Uygulama dili kullanıcının ana
   dilinde (i18n zorunlu); okunan hikaye metni İngilizcedir.
5. **Basitlik önce gelir.** Yeni bir bağımlılık veya soyutlama, somut bir
   ihtiyaç olmadan eklenmez.

## Klasör Yapısı

```
app/                  Expo Router — sadece route tanımı ve ekran
                       kompozisyonu. İş mantığı burada YAŞAMAZ.
src/
  features/            Feature-sliced organizasyon (bkz. ADR-002)
    reader/            Hikaye okuma akışı
    library/            Kitap listesi, filtre, arama
    vocabulary/        Kaydedilen kelimeler, kelime defteri
    srs/                Spaced repetition (tekrar) motoru
    onboarding/         İlk açılış, seviye tespiti
    paywall/            Abonelik teklif ekranları, RevenueCat entegrasyonu
    profile/            Kullanıcı profili, ayarlar, istatistik
    reminders/          Yerel bildirim hatırlatmaları (tekrar, seri, yarım kitap)
    completion/         Kitap bitirme kutlaması (paywall'un reader dışı tetikleyicisi)
    <feature>/
      components/       O feature'a özel UI bileşenleri
      hooks/            O feature'a özel hook'lar
      api/              Supabase/RevenueCat çağrıları, TanStack Query hook'ları
      types.ts          O feature'ın tipleri
      index.ts          Public barrel — dışarıya sadece burası export eder
  components/          Feature'a bağlı olmayan, paylaşılan UI bileşenleri
  lib/                 Üçüncü parti istemciler ve altyapı (supabase.ts,
                       storage.ts, queryClient.ts, env.ts)
  hooks/               Feature'a bağlı olmayan, paylaşılan hook'lar
  i18n/                i18next kurulumu + locales/{tr,en}.json
  theme/                Renk, spacing, radius token'ları
  types/                Global/paylaşılan tipler
supabase/
  migrations/           SQL migration dosyaları (sıralı, geri alınabilir)
  functions/            Edge Functions (Deno)
pipeline/               Python 3.12 içerik pipeline'ı. app/ ve src/'den
                       tamamen izole — aralarında import YOK.
docs/                   ROADMAP.md ve diğer proje dokümanları
.claude/                Claude Code proje ayarları
```

**Bağımlılık yönü:** `app/` → `src/features/*` → `src/{lib,components,hooks,theme,i18n,types}`.
Bir feature başka bir feature'ın `components/`, `hooks/` veya `api/`
klasörüne asla doğrudan import atmaz — yalnızca o feature'ın `index.ts`
barrel'ından. Paylaşılan bir şeye ihtiyaç varsa `src/components` veya
`src/hooks`'a taşınır.

## Mimari Kararlar (ADR)

### ADR-001: Expo Managed Workflow

**Karar:** React Native + Expo (managed), bare workflow değil.
**Gerekçe:** Tek geliştirici/küçük ekip hızı, OTA update, EAS Build ile
CI karmaşıklığı olmadan App Store dağıtımı. Native modül ihtiyacı
(RevenueCat, SQLite) config plugin'lerle managed workflow içinde
karşılanabiliyor; bare'e geçiş gerekirse `expo prebuild` her zaman kaçış
kapısıdır.

### ADR-002: Feature-Sliced, katman bazlı değil

**Karar:** `src/` teknik katmana (örn. `components/`, `screens/`,
`services/`) göre değil, ürün özelliğine (`features/reader`,
`features/library`, ...) göre organize edilir.
**Gerekçe:** Bu uygulamanın karmaşıklığı özellik sayısıyla büyüyecek,
katman sayısıyla değil. Bir özelliği silmek/taşımak tek bir klasörü
silmek anlamına gelmeli. Katman bazlı yapı, büyüdükçe "hangi component
hangi ekrana ait" sorusunu zorlaştırır.

### ADR-003: Sunucu verisi TanStack Query, lokal durum Zustand

**Karar:** Supabase'den gelen her şey (kitaplar, kelimeler, kullanıcı
profili) TanStack Query ile; ekran/UI durumu (aktif filtre, okuma
pozisyonu geçici state'i, modal açık/kapalı) Zustand ile yönetilir.
**Gerekçe:** İkisini karıştırmak (örn. sunucu verisini Zustand store'da
tutmak) cache invalidation, loading/error state ve senkronizasyon
mantığını elle yeniden yazmak anlamına gelir. TanStack Query bunu zaten
çözer.

### ADR-004: Yerel kalıcılık — AsyncStorage (key-value) + expo-sqlite (yapılı veri)

> **Revize edildi (2026-09-07).** Bu ADR başlangıçta MMKV diyordu; kod hiçbir
> zaman MMKV kullanmadı. `react-native-mmkv` bağımlılık listesinde yok,
> `src/lib/storage.ts` doğrudan `@react-native-async-storage/async-storage`
> re-export ediyor ve Supabase auth adaptörü de onu kullanıyor. ADR gerçeğe
> göre düzeltildi; MMKV'ye geçmek isteyen olursa bu ayrı bir karar olmalı.

**Karar:** İkisi birlikte, farklı işler için:

- **AsyncStorage** (`src/lib/storage.ts` üzerinden): auth session,
  tercihler, telemetri kuyruğu, basit key-value veriler.
- **expo-sqlite**: offline bölüm içeriği (`reader/api/chapterCache.ts`),
  sayfalama önbelleği (`reader/pagination/pageCache.ts`), kitap lemma
  sözlüğü, ve ilişkisel sorgu ihtiyacı olan her şey.

**Gerekçe:** İkisi farklı işler için: key-value depo ilişkisel/sorgu
gerektiren veri (SRS zamanlaması, "bu kelime hangi kitaplarda geçiyor")
için uygun değil, SQLite bunun için doğru araç. Tek bir depoyu her şey
için zorlamak yerine her ikisini amacına göre kullanmak uzun vadede daha
az karmaşıklık yaratıyor. AsyncStorage'ın MMKV'ye göre yavaşlığı, bu
uygulamanın key-value kullanım hacminde (oturum + tercihler + küçük bir
olay kuyruğu) ölçülebilir bir sorun oluşturmuyor.

### ADR-005: service_role anahtarı asla istemcide değil

**Karar:** Uygulama sadece Supabase `anon` public key kullanır (RLS
politikalarıyla korunan). `service_role` anahtarı yalnızca
`pipeline/.env` (gitignore'da) ve Supabase proje secrets'ında yaşar.
**Gerekçe:** `service_role` RLS'yi bypass eder; istemci koduna sızması
tüm veritabanını açığa çıkarır. Pipeline sunucu tarafında çalışır ve
içerik yazma/silme yapar — bu ayrıcalık seviyesi sadece orada gereklidir.

### ADR-006: Expo Router (file-based)

**Karar:** React Navigation'ı doğrudan değil, Expo Router üzerinden
kullan.
**Gerekçe:** Deep linking, typed routes ve dosya bazlı route tanımı
elle yazılan navigator konfigürasyonundan daha az hataya açık ve Expo
ekosistemiyle native entegre.

### ADR-007: Reader sayfalama — native ölçüm (WebView kararı geri alındı)

> **Bu ADR 2026-09-07'de tersine çevrildi.** Orijinal karar okuma yüzeyini
> `react-native-webview` içinde CSS multi-column ile sayfalamaktı. Kod bir
> süre önce native ölçüme geçmiş ama ADR güncellenmemişti; WebView yolu
> render edilmediği halde depoda duruyordu. O yol (`ReaderWebView.tsx`,
> `webview/buildReaderHtml.ts`, `pagerRuntime.js`, gömülü base64 fontlar —
> toplam ~710 KB kaynak) ve `react-native-webview` bağımlılığı silindi.

**Karar:** Okuma yüzeyi native React Native ile render ediliyor ve
sayfalama cihazda ölçülerek yapılıyor:

- `pagination/measureChapter.tsx` bölüm metnini gerçek font metrikleriyle
  ölçer, `pagination/paginate.ts` sayfalara böler.
- `components/PaginatedReaderView.tsx` sayfaları render eder;
  `components/ReaderPage.tsx` kelime tokenizasyonunu ve dokunma
  hedeflerini kurar.
- Sonuçlar (`ReaderWordTapPayload`, `ReaderPositionUpdatePayload`)
  `features/reader/types.ts` içinde tanımlı; kelime/cümle etkileşimi
  her zaman native `BottomSheetModal` açar.
- Ölçüm sonuçları `pagination/pageCache.ts` ile SQLite'ta önbelleklenir.

**Gerekçe:** WebView'in layout motoru dizgiyi bedavaya yapıyordu ama
bedeli ağırdı: RN↔WebView mesajlaşma protokolü, HTML template üretimi,
fontların base64 gömülmesi, ayrı bir JS çalışma ortamı ve ayrı bir
tokenizer kopyası. Native tarafta ölçüm bir kez doğru yazıldıktan sonra
tek çalışma ortamı, tek tokenizer, doğrudan erişilebilir dokunma hedefi
ve önbelleklenebilir ölçüm sonucu kaldı — ve `react-native-webview`
native bağımlılığı tamamen düştü.

**Font:** Literata ve diğer yüzler artık `@expo-google-fonts/*` üzerinden
normal RN font yüklemesiyle geliyor (`app/_layout.tsx`); base64 gömme
gerekmiyor.

### ADR-008: Lemmatizasyon — cihazda kural tabanlı, yeni pipeline/migration YOK

**Karar:** Surface-form → lemma çözümlemesi cihazda, native JS içinde
(`src/features/reader/text/tokenizer.js`), deterministik ek-kuralı
(suffix-rule) + düzensiz kelime tablosu ile yapılır. Sunucu tarafında yeni bir `book_surface_lemmas` tablosu /
pipeline (spaCy) değişikliği bu round'da yapılmaz.

**Gerekçe:**

1. `book_tokens` (surface→lemma per-occurrence) migration 009'da
   bilinçli olarak kaldırıldı; migration'ın kendi yorumu tokenizasyon/
   lemmatizasyonun cihazda yapılacağını söylüyor — bunu tersine
   çevirmek küçük bir ekleme değil, mimari bir geri dönüş.
2. Yeni bir per-book surface→lemma export'u pipeline (Python/spaCy)
   değişikliği + yeni Supabase migration + mevcut kitapların
   backfill'ini gerektirir — `pipeline/`e (CLAUDE.md'nin "app/ ve
   src/'den tamamen izole" kuralı) sessizce kapsam genişlemesi olur.
3. Cihazdaki lemmatizer düzensiz/alışılmadık bir formda başarısız
   olduğunda, ürün spec'i zaten doğru fallback'i tanımlıyor: sheet yine
   açılır, "karşılık bulunamadı" der. Eksik kapsama, zaten spec'lenmiş
   bir davranışa düşer — bozuk bir davranışa değil.
4. "Basitlik önce gelir" ilkesi, cihazdaki yaklaşım pratikte yetersiz
   kanıtlanana kadar yeni bir pipeline/migration eklenmemesini destekliyor.

**Gelecek yol (dokümante edilen, şimdi YAPILMAYAN):** Cihaz-içi doğruluk
yetersiz kalırsa, pipeline'ın mevcut spaCy geçişiyle doldurulan
`book_surface_lemmas(book_id, surface, lemma, pos)` tablosu sunucu
tarafı sözlük olarak eklenebilir. Bu, ayrı bir plan/round'dur.

### ADR-009: Aboneliği sunucuya YALNIZCA RevenueCat webhook'u yazar

> **Bu ADR bir denetim bulgusundan doğdu (2026-09-07).** Öncesinde bu
> belge ve `docs/RELEASE.md` "istemci `user_entitlements`'a yazıyor,
> kararlı bir kullanıcı premium'u kendine açabilir" diyordu. Bu YANLIŞTI:
> tablo migration 002'den beri select-only RLS ile korunuyordu, yani
> istemcinin upsert'i hiçbir zaman çalışmadı. Hata `trackError`'a yazılıp
> yutuluyor, `purchasePackage` yine "success" dönüyordu. Gerçek sonuç bir
> güvenlik açığı değil, GELİR kaybıydı: kullanıcı ödüyor, premium hiç
> açılmıyordu.

**Karar:** Yetki zinciri tek yönlü ve tek yazarlı:

```
RevenueCat  →  supabase/functions/revenuecat-webhook  (paylaşılan sır ile doğrulanır)
            →  public.apply_entitlement_event()        (service_role, migration 028)
            →  public.user_entitlements                (select-only RLS, istemci YAZAMAZ)
```

- `user_entitlements` için **insert/update policy'si eklenmez.**
  service_role zaten RLS'yi bypass ediyor; bir policy eklemek istemciye
  yazma yolu açma riskini geri getirir.
- İstemci satın alma sonrası yetkiyi yazmaz, **bekler**
  (`features/paywall/api/waitForServerPremium.ts`). İyimser olarak premium
  göstermek yanlış olurdu: ücretsiz katman sınırını sunucudaki tetikleyici
  zorluyor (migration 024), dolayısıyla istemci "premium" derken sunucu
  hâlâ 'free' diyorsa kullanıcı anlaşılmaz bir hata alır.
- `apply_entitlement_event()` idempotent (`rc_event_id`) ve sıralamaya
  dayanıklı (`rc_event_ms`). Webhook teslimi "at least once" garantisi
  verir ve sırasız gelebilir.

**Gerekçe:** Ödeme doğrulaması istemciye bırakılamaz; App Store da ödeme
sonrası içeriğin açılmamasını (Guideline 2.1/3.1.1) red sebebi sayıyor.
Tek yazarlı zincir ikisini birden çözüyor.

### ADR-010: Hatırlatmalar yerel bildirim, push DEĞİL

**Karar:** Üç hatırlatma (tekrar zamanı, yarım kalan hikâye, seri
kurtarma) cihazda `expo-notifications` ile YEREL olarak planlanıyor
(`src/lib/notifications.ts` + `src/features/reminders/`). APNs sertifikası,
bildirim sunucusu ve cihaz jetonu saklama YOK.

**Gerekçe:** Üç hatırlatmanın ihtiyaç duyduğu her veri zaten cihazda —
vadesi gelen kart sayısı, yarım kalan kitap, seri. Uzak bildirim için
gereken altyapı bu üç mesaja değmiyor ("Basitlik önce gelir"). Yan fayda:
yerel bildirimler Expo Go'da da çalışıyor, akışı test etmek için derleme
beklemek gerekmiyor.

**İzin ne zaman isteniyor:** Kullanıcı Profil > Hatırlatmalar'ı açtığında,
açılışta DEĞİL. iOS izin diyaloğu kullanıcı başına bir kez gösterilebilir;
uygulamayı ilk açan kullanıcıya sormak o tek şansı harcamaktır. Varsayılan
kapalı.

### ADR-011: Cihaz üstü bölüm seslendirmesi (İPTAL EDİLDİ)

> **İptal (2026-09-08).** Bu ADR bölüm seslendirmesinin cihazın konuşma
> motoruyla (`expo-speech`) yapılmasına karar veriyordu. Ürün sahibi
> seslendirmeyi istisnasız premium yapma kararı aldı; cihaz üstü sürücü
> (`tts/useReaderTts.ts`) silindi. Yerine geçen karar ADR-012.
>
> **Neyin kaldığı:** `expo-speech` bağımlılığı duruyor ama artık yalnızca
> KELİME TELAFFUZU için (`components/WordSheet.tsx` → `tts/englishVoice.ts`
> → `tts/voiceCatalog.ts`). O ücretsiz. Okuma ayarlarındaki ses seçici de
> artık yalnızca bunu yönetiyor ve metni bunu söylüyor.
>
> **Kaybedilen:** 56 klasikte dinleme diye bir şey yok, ve ücretsiz
> kullanıcı hiçbir kitabı dinleyemiyor. Bu bilinen ve kabul edilmiş bir
> bedel; ürün ilkesi #2'nin "ücretsiz katman gerçekten kullanılabilir
> olmalı" şartı okuma tarafında karşılanıyor (tüm kitaplar, kelime
> desteği, offline önbellek, kelime telaffuzu sınırsız ve ücretsiz).
>
> **Kararın orijinal gerekçesi tarih olarak duruyor** — cihaz üstü TTS'in
> kapsama avantajı gerçekti; iptalin sebebi teknik değil, ticari.

**Eski karar (artık yürürlükte değil):** Bölüm seslendirmesi ve kelime
kelime vurgu, cihazın kendi konuşma motoruyla yapılıyordu; platform okumak
üzere olduğu kelimenin karakter konumunu bildiriyordu (iOS
`willSpeakRangeOfSpeechString`, Android `onRangeStart`).

### ADR-012: Seslendirme = stüdyo kaydı, istisnasız premium

**Karar:** Bölüm seslendirmesinin tek sürücüsü var: önceden üretilmiş
stüdyo kaydı. Özgün 63 hikâyenin 207 bölümü Google Cloud TTS
(`en-US-Neural2-F`) ile seslendirildi; SSML `<mark>` +
`enableTimePointing` ile kelime zaman işaretleri de üretildi, vurgu oradan
geliyor. Klasikler kapsam dışı ve öyle kalacak. Dinlemek aktif premium
gerektiriyor — ücretsiz "bir hikâye dinle" hakkı 2026-09-08'de kaldırıldı
(migration 032).

**Neden ADR-011 iptal edildi:** Cihaz üstü TTS teknik olarak sorunsuz
çalışıyordu ve her kitabı kapsıyordu. İptalin sebebi kalite ve
konumlandırma: cihaz sesi ile stüdyo kaydı arasındaki fark büyük, ve ikisi
aynı düğmenin arkasında durduğunda kullanıcı hangisini duyduğunu bilmeden
"seslendirme kötü" sonucuna varıyordu. Tek ve iyi bir ses, iki farklı
kalitede sesten daha anlaşılır bir üründür.

**Neden premium:** Cihaz sesinin marjinal maliyeti sıfırdı, bunun değil —
üretim faturası, Supabase depolama (~350 MB) ve her dinlemede çıkış bant
genişliği var.

**Erişim nerede kısıtlanıyor:** `book-audio` deposu herkese açık DEĞİL
(migration 031). Açık kaldığı sürece kilit yalnızca görsel olurdu: dosya
adresleri `book_sections.audio_url` içinde ve o satırları herkes
okuyabiliyor. Bağlantıyı `supabase/functions/chapter-audio` üretiyor —
çağıranın JWT'sini doğruluyor, `can_play_book_audio()`'ya soruyor, sonra
2 saatlik imzalı bağlantı veriyor. Kural TEK yerde: istemci de aynı
fonksiyonu çağırıyor, ikinci bir kopyası yok.

**Reader'da ne görünüyor:** Erişim yoksa seslendirme düğmesi HİÇ
görünmüyor. Kilitli bir düğme koymak okuma ekranına premium promosyonu
sokardı (Ürün İlkesi #1); basıldığında hiçbir şey yapmayan bir düğme ise
arıza gibi görünürdü. Teklif kitap detayında: `BookAudioCard` ve "Dinle"
düğmesi (kilitliyse paywall'a gidiyor).

**Bozulduğunda ne oluyor:** `chapter-audio` 403/404 dönerse düğme
görünmüyor; geçici hatalarda (5xx, ağ) sorgu yeniden deniyor. Artık geri
düşülecek bir cihaz sesi olmadığı için bu ayrım eskisinden daha önemli —
yutulan geçici bir hata, ödeyen kullanıcı için sesin tamamen kaybolması
demek olurdu.

### ADR-013: Dil çiftleri v2 — "N hedef dil" ≠ "N×N çift"

**Karar (2026-09-13):** Uygulama tek dil çiftinden (İngilizce içerik,
Türkçe arayüz) 11 dilin (en, de, fr, ru, zh, ja, it, uk, tr, ar, es)
herhangi ikisi arasında çalışan bir sisteme geçiyor. Tam tasarım ve
gerekçe: `docs/plans/2026-09-13-dil-ciftleri-v2-tasarim.md`. İçerik
kaynağı/maliyet araştırması: `docs/research/2026-09-13-cok-dilli-icerik-arastirmasi.md`.

**Temel ayrım:** bir kitabın hangi dilde YAZILDIĞI (`books.target_language`)
ile bir kelimenin hangi dile ÇEVRİLDİĞİ (`lemma_translations`) bilinçli
olarak ayrı sorunlar. Birincisi dil başına haftalarca süren bir pipeline
işi (spaCy modeli, kelime frekans listesi, kamu malı tarama, TTS ses
envanteri); ikincisi zaten var olan runtime LLM fallback'in ("Türkçe"
sabiti yerine parametre) ANINDA genellenmesiyle çözüldü. Sonuç: hedef dil
sayısı bugün ARTMADAN (hâlâ yalnızca en, tr) çift sayısı 110'a çıktı —
bir Alman kullanıcı bugün İngilizce okuyup karşılıkları Almanca alabilir.

**Şema (migration 033):** `languages` (11 dilin statik referansı),
`books.target_language`, `lemma_translations` (genel target×native
karşılık önbelleği — `lemmas` tablosuna DOKUNULMADI, o hâlâ en→tr'nin
birincil kaynağı), `user_language_pairs` + `set_language_pair()` RPC.

**Ücretsiz/premium kuralı:** ilk çift her zaman ücretsiz (onboarding),
her YENİ ek çift premium gerektiriyor, sahip olunan çiftler arasında
geçiş her zaman ücretsiz. Kural `set_language_pair()` içinde
(SECURITY DEFINER), `user_language_pairs`'ta insert/update policy YOK —
ADR-009'daki "tek yazar" deseninin aynısı.

**Cihaz-içi lemmatizer (ADR-008) genellenmedi, genellenemez.** Rusça
çekim, Arapça kök-kalıp morfolojisi, Japonca/Çince kelime sınırı
belirsizliği — hiçbiri İngilizce'ye özgü ek-kuralı yaklaşımıyla
çözülemez. Yeni bir HEDEF dil eklenirse (bu round'da eklenmedi)
lemmatizasyon sunucu tarafında (pipeline, ADR-008'in "gelecek yol" olarak
bıraktığı `book_surface_lemmas`) yapılmalı.

**Kapsam dışı bırakılan (bilinçli):** yeni bir hedef dilde gerçek kitap
içeriği, seviye testinin dile göre genellenmesi, RTL'nin tam görsel QA'sı.
Detaylar ve önerilen içerik yol haritası (Senaryo A: 4 dil ~$2.600/6-10
hafta vs Senaryo B: 11 dil ~$15-18k/9-14 ay) tasarım dokümanında.

## Kod Konvansiyonları

**Dosya adlandırma**

- Component dosyaları: `PascalCase.tsx` (örn. `BookCard.tsx`)
- Hook dosyaları: `camelCase.ts`, `use` ile başlar (örn. `useReaderProgress.ts`)
- Diğer her şey (api, types, utils): `camelCase.ts`
- Route dosyaları (`app/` içinde): Expo Router kurallarına uyar
  (`(tabs)`, `[id].tsx`, `+not-found.tsx`)

**Component yapısı**

- Fonksiyon component + named export tercih edilir (`export function Foo()`),
  `export default` sadece `app/` route dosyalarında (Expo Router zorunlu kılar).
- Props interface component'in hemen üstünde tanımlanır: `interface FooProps { ... }`.
- Stil: `StyleSheet.create` component dosyasının altında, inline stil yok.
- Bir component dosyası ~150 satırı geçiyorsa alt component'lere bölünür.

**Import sırası** (ESLint tarafından zorlanır, gruplar arası boş satır)

1. React / React Native çekirdek
2. Üçüncü parti paketler
3. `@/` alias importları (lib, theme, features, components)
4. Göreli importlar (`./`, `../`) — sadece aynı feature içinde, mümkünse hiç
5. Tip importları (`import type { ... }`)

**Hata yönetimi deseni**

- Asla boş `catch {}` yok. Her catch ya kullanıcıya görünür bir hata
  state'i set eder ya da loglar ve yeniden fırlatır.
- Beklenen hata durumları (örn. "kelime zaten kayıtlı") exception değil,
  dönüş değeridir (`src/types/index.ts` içindeki `Result<T, E>` gibi bir
  şekil kullanılır).
- Beklenmeyen hatalar (network, Supabase 5xx) TanStack Query'nin
  `error` state'i üzerinden UI'a yansır; sessizce yutulmaz.

**i18n zorunluluğu**

- Kullanıcıya görünen hiçbir string kod içine hardcode edilmez. Her metin
  `t("namespace.key")` üzerinden `src/i18n/locales/{tr,en}.json`'dan gelir.
- Yeni bir string eklerken önce `tr.json`'a, sonra `en.json`'a eklenir
  (uygulama arayüz dili varsayılan olarak Türkçe).

**Async veri deseni**

- Her Supabase okuma/yazma işlemi feature'ın `api/` klasöründe bir
  `useXQuery` / `useXMutation` hook'una sarılır. Component içinde
  doğrudan `supabase.from(...)` çağrısı yapılmaz.
- Query key'leri `[featureName, ...params]` şeklinde, tek bir
  `queryKeys.ts` dosyasında merkezi tanımlanır (feature büyüdükçe eklenir).

**Form deseni**

- Formlar kontrollü component + basit local state ile yazılır; şimdilik
  ayrı bir form kütüphanesi eklenmez (ihtiyaç somutlaşınca — örn.
  onboarding seviye testi karmaşıklaşınca — değerlendirilir).
- Validasyon hatası mesajları da i18n'den gelir, hardcode edilmez.

## Komutlar

| Komut               | Açıklama                             |
| ------------------- | ------------------------------------ |
| `npm start`         | Expo dev server'ı başlatır           |
| `npm run ios`       | iOS simülatöründe açar               |
| `npm run android`   | Android emülatöründe açar            |
| `npm run typecheck` | TypeScript strict tip kontrolü       |
| `npm run lint`      | ESLint kontrolü                      |
| `npm run lint:fix`  | ESLint otomatik düzeltme             |
| `npm run format`    | Prettier ile tüm dosyaları formatlar |
| `npm test`          | Jest unit/component testleri         |
| `npm run test:e2e`  | Maestro uçtan uca testleri           |

## ASLA YAPMA

- **Hardcoded string** — kullanıcıya görünen hiçbir metni doğrudan JSX
  içine yazma, her zaman `t()`.
- **İstemcide API anahtarı** — `service_role` key, üçüncü parti gizli
  anahtarlar asla `app/` veya `src/` içine, asla `EXPO_PUBLIC_*` olarak
  girmez. `EXPO_PUBLIC_*` ile başlayan her şey bundle'a gömülür ve
  herkese açıktır — sadece public/anon anahtarlar için kullan.
- **Boş catch bloğu** — `catch {}` veya `catch (e) {}` asla commit edilmez.
- **`any` tipi** — ESLint `error` seviyesinde engeller. Bilinmeyen tip
  için `unknown` + type guard kullan.
- **RLS'siz tablo** — `supabase/migrations/` içinde oluşturulan her tablo
  aynı migration'da `ENABLE ROW LEVEL SECURITY` ve en az bir policy içerir.
- **Okuma ekranında paywall** — `features/reader` içine premium
  promosyonu, banner, interstitial veya "yükseltmek ister misin" modalı
  eklenmez (bkz. Ürün İlkesi #1). Kilitli görünen bir düğme de buna dâhil:
  erişim yoksa kontrol GİZLENİR, kilitlenmez.
- **Kelime telaffuzunu ücretli yapma** — sözlük kartındaki hoparlör
  ücretsiz kalır. Bölüm seslendirmesi premium, telaffuz değil (ADR-012).

## Mevcut Durum ve Sonraki Adımlar

> Son güncelleme: 2026-09-20 (1.0.3: özel kelime desteleri + dil çifti/ana
> sayfa önbellek hatası). Bu bölüm her önemli oturumdan sonra güncellenir.
> `docs/ROADMAP.md` ve `docs/STATE.md` çok daha eski; çelişki olursa burası
> geçerlidir. Yayın adımlarının tamamı ve dağıtım komutları `docs/RELEASE.md`
> içinde.

### 1.0.3 turu (2026-09-20, özel kelime desteleri + dil çifti bulgusu)

**Kapatılan bug:** premium kullanıcı ikinci dil çiftine geçtiğinde ana
sayfa ("Yeni Kitaplar" vb.) uygulama tamamen kapatılıp açılana kadar ESKİ
dilin kitaplarını göstermeye devam ediyordu. Sebep: ana sayfa
(`homeQueryKeys.extras()`) kütüphaneden (`libraryQueryKeys`) TAMAMEN AYRI
bir önbellek altında; `useSetLanguagePairMutation` yalnızca `["library"]`
ve `["profile"]`'ı invalidate ediyordu, `["home"]` unutulmuştu. Düzeltme:
`src/features/languagePair/api/useSetLanguagePairMutation.ts`.

**Yeni özellik: "Destelerim"** (Faz 1, tasarım:
`docs/plans/2026-09-20-kelimelerim-redesign-design.md`). Kullanıcı artık
kendi kelime destelerini oluşturup çalışabiliyor -- TAMAMEN ÜCRETSİZ,
sınır yok. "Kelimelerim" ekranı iki sekmeye çıktı: mevcut kitap-kelimesi
listesi + yeni "Destelerim" (deste oluştur/yeniden adlandır/sil, kart
ekle/düzenle/sil, deste-taramalı SRS tekrarı). Hazır premium paketler
("Keşfet") ve özel kelimeye AI örnek cümle BİLİNÇLİ OLARAK bu rounda
alınmadı -- gerçek çok-dilli içerik üretimi/çeviri gerektiriyor, ayrı bir
tur.

**Mimari:** `custom_decks` + `custom_deck_cards` (migration 045-048),
kitap kelimelerinin SRS altyapısından (`user_lemma_state`, `srs_cards`)
BİLİNÇLİ OLARAK ayrı -- o şemanın zaten bilinen bir belirsizliği var
(CLAUDE.md "hâlâ açık" notu) ve kullanıcının serbest yazdığı bir ifadeyi
oraya zorlamak onu büyütürdü. Kolon adları `srs_cards` ile birebir aynı,
`src/features/srs/scheduler.ts`teki SM-2 fonksiyonu değişiklik olmadan
tekrar kullanılıyor. Tekrar oturumu (`useDeckReviewSession`) da BİLEREK
`useReviewSession`in (kitap kelimeleri) bir kopyası, ortak bir hook değil
-- o hook daha önce kritik bir üretim hatasına sebep olmuştu, ikisini
birbirine bağlamak o riski geri getirirdi. Kart sayıları istemcide ham
satır saymak yerine bir RPC'de (`custom_deck_counts`, `count(*)::integer`)
toplanıyor -- bu denetimde üç kez bulunan "1000 satır sessiz kesmesi"
hatasının aynı sınıfını baştan önlüyor.

**Kod incelemesinde bulunup düzeltilen gerçek hatalar (canlıya çıkmadan
önce):** RPC'nin `bigint` değil `integer` dönmesi (PostgREST/JSON
serileştirme belirsizliği); yeni form sheet'lerinin uygulamada HİÇBİR YERDE
kullanılmayan, test edilmemiş `components/ui/BottomSheet` sarmalayıcısı
üzerine kurulmuş olması -- her gerçek sheet (`ChapterListSheet`,
`SentenceSheet` vb.) `BottomSheetModal`ı doğrudan kullanıyor, oraya
taşındı; bir sheet içinde düz `ScrollView` kullanılması (sheet'in kendi
`BottomSheetScrollView`ı olması gerekiyordu, yoksa kaydırma/aşağı-çekip-
kapatma el değiştirmesi bozuluyordu); kelime/deste kaydetme hataya
düştüğünde sheet'in yine de kapanıp kullanıcının yazdığı metnin
kaybolması (`onSettled` yerine `onSuccess`); deste listesi henüz
yüklenmemişken deste detay ekranının hiçbir gösterge olmadan bomboş
kalması. `custom_deck_reviews.user_id` için eksik FK indeksi de eklendi
(migration 043'te düzeltilen sınıfın aynısı).

332 test geçiyor (yeni: `useDeckReviewSession`), typecheck ve lint temiz,
Supabase güvenlik/performans denetçisinde yeni tablolardan kaynaklanan
gerçek bulgu yok (anon-erişim uyarıları uygulamanın anonim oturum
kullanmasının doğal sonucu, `auth_rls_initplan` tüm eski tablolarda da
zaten var -- yalnızca yenilere izole bir "düzeltme" tutarsızlık yaratırdı).

### 1.0.2 turu (2026-09-19, çok ajanlı denetim + dönüşüm)

Dört paralel ajan (performans, öğrenme döngüsü, gelir, sunucu/veri) denetim
yaptı; bulgular doğrulanıp düzeltildi. **Gerçek dünya sinyali yok** --
uygulama bir gün önce yayınlandı, TestFlight çökmesi ve App Store yorumu
sıfır, yani denetim tamamen koddan ve canlı veritabanından yürüdü.

**Kapatılanlar**

1. **Tekrar oturumunda kartların YARISI atlanıyordu.** Her puanlamadan sonra
   `srsQueryKeys.all` geçersiz kılınıyor, `useDueCardsQuery` yeniden çekiyor
   ve puanlanan kart (vadesi ileri kaydığı için) diziden düşüyordu; konum
   ise sayaç olarak ilerliyordu. 20 kartın ~10'u hiç gösterilmiyordu. Oturum
   artık sabit bir anlık görüntü üzerinde (`useReviewSession`).
2. **Kitap sözlüğü 1000 kelimeye SESSİZCE kırpılıyordu.** `book_lemmas`
   sayfalanmadan çekiliyordu; PostgREST 1000 satırda kesiyor (HTTP 206).
   Yayındaki 529 kitabın 194'ünde kelime sayısı 1000'in üstünde, yani
   çevrimdışı sözlük dağarcığın %15-40'ını içeriyordu ve eksik her kelime
   ~700 ms'lik bir ağ turuna düşüyordu.
3. **Kelime defterinde kaydı kaldırmanın HİÇBİR yolu yoktu.** Yer imi ikonu
   `Pressable` değil `View`'dı. Ücretsiz katmanda çıkmazdı: sınıra dayanan
   kullanıcı yer açamıyordu.
4. **Gelir yolu:** geri yükleme ödeyen aboneye "abonelik yok" diyordu
   (üç ayrı sonuç tek `false`'a iniyordu); `not_entitled` kararı sunucuya
   değil istemcinin anlık görüntüsüne bakıyordu (ADR-009'un tersi); deneme
   hakkı uygunluk kontrolü olmadan reklam ediliyordu (Guideline 2.3.1);
   premium kullanıcı "Dinle"ye erken basınca kendi aldığı ürün için
   paywall'a gidiyordu.
5. **Bölüm açılışı, sonucu KULLANILMAYAN 25-28 paralel isteğe
   bloklanıyordu.** `unknownLemmas` yalnızca yükleme kapısında ve bir
   telemetri alanında geçiyordu. Sorgu, hook dosyası ve 5.000 elemanlı
   sorgu anahtarı silindi.
6. **Ses çalarken sayfalar saniyede iki kez baştan tokenize ediliyordu.**
   expo-audio 500 ms'de bir durum yayıyor; `handleWordTap` TanStack v5'in
   her render'da yeni döndürdüğü mutation nesnesine bağlı olduğu için hiç
   sabitlenmiyordu. Zincir `renderItem` -> `CellRenderer` -> tokenizasyon
   memo'suna kadar kırılıyordu.
7. `browse` ve `favorites` ekranlarında geri düğmesi yoktu (yığın başlığı
   kapalı, sekme çubuğu görünmüyor -- geriye tek yol kenar kaydırmaydı).
8. Dil ayarlarında UI dili ve yazım yönü sunucu çifti kabul etmeden kalıcı
   yazılıyordu: "premium gerekli" alan kullanıcı ödemediği dile geçiyordu.

**Dönüşüm turu** (ürün sahibi önceliği; tasarım
`docs/plans/2026-09-19-donusum-tasarim.md`): paywall artık kullanıcının
kendi son 7 günüyle açılıyor (kaç gün okudu / kaç kelime çevirdi / kaç
kelime kaydetti) ve günlük kelime hakkı bittiğinde takılınan kelimeyi
adıyla gösteriyor. Geçmişi olmayan kullanıcıda blok hiç gösterilmiyor --
sıfır yazan bir "başarı" bloğu satılan şeyin değersiz olduğunu söylemek
olurdu.

308 test geçiyor, typecheck ve lint temiz.

**İKİNCİ GEÇİŞTE KAPATILANLAR (aynı gün)**

9. **Bölüm metni 1000 paragrafta SESSİZCE kırpılıyordu** -- paragraflar
   `book_sections` sorgusuna gömülü çekiliyordu ve gömülü kaynaklar da
   PostgREST'in sınırına tabi. Yayında 1000 paragrafı aşan dört bölüm var
   (en uzunu 1.473); o bölümleri okuyan kullanıcı metnin SONUNU hiç
   görmüyordu. Aynı sınıf bu turda ÜÇÜNCÜ kez çıktı (`book_lemmas`,
   `book_paragraphs`, `books`).
10. **Kütüphane sorgusunda `.limit()`/sayfalama yoktu** -- 529 yayında
    kitapla sessiz kesmeye 471 kitap kalmıştı. Ayrıca liste, detay ekranıyla
    aynı sütunları çekiyordu: canlı ölçümde `description` tek başına metin
    yükünün 38 kB'ı (toplam 58 kB'ın üçte ikisi) ve liste satırı onu hiç
    göstermiyor.
11. **Çevrimdışı tekrar oturumu sessizce kayboluyordu** (`onError` hiç
    yoktu). Bitiş ekranı artık kaç değerlendirmenin yazılamadığını söylüyor.
    Ayrıca `srs_reviews` yazımı başarısız olunca fırlatılıyordu, oysa kartın
    planı zaten yazılmıştı -- başarılı bir değerlendirme hatalı gösteriliyor
    ve yeniden denemede plan ikinci kez uygulanabiliyordu.
12. **Tek bir kalıcı ret çevrimdışı kelime kuyruğunu sonsuza dek
    tıkıyordu.** Artık yalnızca ÇEVRİMDIŞI hatada duruluyor; deterministik
    ret düşürülüp kuyruk akmaya devam ediyor. Flush sürerken eklenen eylemin
    silinmesi de düzeltildi.
13. **Migration 041-043 ÜRETİME UYGULANDI ve canlıda doğrulandı:**
    - **041 seri:** `get_user_streak()` `words_read > 0`'a bakıyordu ama o
      sütuna hiç yazı yazılmadı (canlı: 17 satırın sıfırı `words_read > 0`,
      17'si `minutes > 0`, 13 kullanıcı). Seri herkeste 0'dı ve
      seri-kurtarma bildirimi hiç ateşlenemiyordu. Koşul `minutes > 0` oldu.
    - **042 `lemma_canonical`:** görünüm bir CTE'yi iki kez referans
      verdiği için Postgres onu materyalize ediyor ve `lemma` filtresi içeri
      itilemiyordu. **453,660 ms -> 0,419 ms** (shared hit 28.756 -> 45).
      Eşdeğerlik uygulamadan önce kanıtlandı: 26.155 satır, iki yönde de
      `EXCEPT` = 0.
    - **043 sınır tetikleyicisi + indeksler:** `enforce_saved_word_limit`
      BEFORE INSERT olduğu ve `saveWord` `ON CONFLICT DO NOTHING` yazdığı
      için tam sınırdaki kullanıcı ZATEN kayıtlı bir kelimeye dokununca hata
      alıyordu. Ayrıca dört gereksiz indeks silindi (~100 MB; yalnızca
      `book_paragraphs_section_id_idx` 88 MB ve unique kısıt indeksiyle
      birebir aynıydı). Silme sonrası bölüm okuma sorgusunun unique kısıt
      indeksini devraldığı EXPLAIN ile doğrulandı.

**ÜÇÜNCÜ GEÇİŞ (aynı gün) -- 1.0.2 kapanışı**

14. **Üç farklı "bugün" tanımı birleştirildi (migration 044).** Aynı soruya
    üç ayrı cevap vardı: okuma süresi UTC gününe YAZILIYOR,
    `get_user_streak` Europe/Istanbul'a göre SAYIYOR, `useProfileStatsQuery`
    cihazın yerel gününü ÇİZİYOR. Türkiye UTC+3 olduğu için 00:00-03:00
    arası okuyanın dakikaları düne düşüyor, "bugün okudun" yanlış söylüyor
    ve gece okuyan hiç seri göremiyordu. Gün artık istemciden geçiyor
    (`src/lib/localDate.ts`, 7 test). Eski imzalar DURUYOR ve davranışları
    değişmedi -- 1.0.1 mağazada ve onları çağırıyor; yanlarına birer
    parametreli kardeş eklendi (`default null` verilemezdi: PostgREST
    adlandırılmış parametrelerle çağırdığı için "function is not unique"
    olurdu). Sunucu, istemci saatinin UTC'den ±1 günden fazla saptığı
    tarihi reddediyor.
15. **Seri-kurtarma bildirimi her gün ateşleniyordu.** `useReminderDataQuery`
    `readToday`ı `words_read > 0` ile hesaplıyordu -- migration 041'de
    kapatılan ölü sütunun okuyan taraftaki son kullanımı. O sütuna hiç yazı
    yazılmadığı için `readToday` DAİMA false'tu: kullanıcı o gün okusa bile
    "serin tehlikede" bildirimi gidiyordu. `minutes`e çevrildi.
16. **Favori düğmesi sunucu hatasında sessizdi.** Üç çağrı yerinde de
    `onError` yoktu; `onSettled` sorguları geçersiz kılınca kalp eski hâline
    dönüyor ve kullanıcı dokunuşunun neden hiçbir şey yapmadığını
    öğrenemiyordu. Artık 10 dilde bir hata bildirimi gösteriliyor.
17. **"Seviyene göre" kartı seviye bilinmiyorken kataloğu FİLTRESİZ
    açıyordu** -- kart adının söylediğini yapmıyor, 529 kitabın tamamını
    listeliyordu. Seviye yoksa kart artık hiç gösterilmiyor; seviye
    öğrenilince kendiliğinden geri geliyor.
18. Onboarding kapakları `expo-image`e geçti (RN `Image` önbelleklemiyordu).
19. **Onboarding kapısı "oturum yok"u "onboarding bitti" diye ÖNBELLEĞE
    YAZIYORDU (kullanıcı bulgusu).** `fetchOnboardingStatus` oturumu
    `supabase.auth.getUser()` ile okuyordu -- o bir AĞ çağrısı ve
    başarısız olduğunda fırlatmıyor, sessizce `user: null` dönüyor. Kod
    `user` yokken `completed: true` dönüyordu, yani "bilmiyorum" cevabı
    BAŞARILI bir cevaba çevriliyor ve `staleTime` gereği 5 DAKİKA taze
    sayılıyordu. Hesap sıfırlama akışı tam o ana denk geliyor (sil -> yeni
    anonim oturum -> önbelleği temizle -> köke dön): kullanıcı onboarding
    yerine ana ekranda, üstelik hiç dil çifti olmayan yeni bir hesapla
    kalıyordu -- "geliştirici sıfırlama düğmesi çalışmıyor"un sebebi buydu.
    Oturum artık YEREL okunuyor (`getSession`), oturum yoksa cevap
    üretilmiyor fırlatılıyor, `retry: 3`. 5 test.
20. **Dil çiftleri ekranının ne boş ne hata durumu vardı.** Sıfır çiftte ya
    da sorgu hatasında gövdenin bütün blokları eleniyor, geriye başlık ve
    ölü bir bölüm etiketi kalıyordu ("bomboş"). Sıfır çift ULAŞILABİLİR:
    `useActiveLanguagePairQuery` satır yokken bilerek bir varsayılana
    düşüyor. Canlıda doğrulandı -- çifti olan her kullanıcıda tam olarak
    bir aktif satır var, yani `activePair === null` yalnızca "hiç satır
    yok" demek. Premium kuralına DOKUNULMADI (`set_language_pair`,
    migration 033). 4 test, eski koda karşı kırmızıya döndüğü doğrulandı.

**HÂLÂ AÇIK**

- Aynı lemma iki farklı `pos` ile iki duruma düşebiliyor
  (`user_lemma_state` PK'sı `(user_id, lemma, pos)`, `user_saved_words` ise
  `(user_id, lemma)`; okuyucular lemma'ya göre Map kuruyor ve sıralama yok).
- **On dil paketi açılışta ayrıştırılıyor** (~350 kB JSON). Tembel yüklemek
  `resources`tan dokuz dili çıkarmak demek; `changeLanguage` yolunun BİR
  tanesi bile paketi yüklemeden geçerse arayüz ham anahtar basıyor
  (`bootstrap.test.ts`in koruduğu regresyonun aynısı). Kazanç ölçüldüğünde
  onlarca milisaniye; yayın öncesi alınacak risk değil, ayrı bir iş.
- **Türkçe büyük harf** ("ŞIMDI DEĞIL" -> "ŞİMDİ DEĞİL"): 10 tasarım
  token'ı, ~29 dosya. Ayrı göreve alındı.
- **Onboarding yönlendirmesi gözle doğrulanmadı.** Kod ve testle doğrulandı;
  web önizlemesinde onboarding'e ULAŞILAMIYOR (`OnboardingGate` sorgu
  hatasında uygulamayı gösteriyor) ve tek sıfırlama yolu hesabı SİLEN
  geliştirici düğmesi.
- **Belge/gerçek ayrışması:** CLAUDE.md "119 kitap" diyor, canlıda **529
  yayında kitap** var (9 hedef dilde). `languages` tablosu ve
  `is_content_target` migration geçmişi DIŞINDA değiştirilmiş -- depodan
  kurulan bir veritabanı üretimle eşleşmiyor.

### Bu oturumda kapatılanlar (2026-09-19, ilk-kullanıcı denetimi -- 3. tur)

Uygulama tarayıcıda GERÇEKTEN yürütülerek (ilk kullanıcı gibi: karşılama →
ana dil → hedef dil → seviye testi → kitap zevki → ilk okuma) denetlendi.
Bulgular ve düzeltmeleri:

1. **ONBOARDING'E GİRİLEMİYORDU (kapatıcı).** Ana dil seçilip "Devam et"e
   basıldığında uygulama kendini yeniden başlatıyor, akış en başa dönüyor,
   aynı adımda aynı şey tekrarlanıyordu -- sonsuz döngü. Telemetride
   `onboarding_rtl_restart {language: tr}`; Türkçe RTL bir dil DEĞİL.
   Altında ÜÇ ayrı hata vardı, üçü de `OnboardingFlow`,
   `ManageLanguagePairsScreen` ve `LanguagePairScreen`'e KOPYALANMIŞTI:
   - `I18nManager.isRTL` her platformda yok (`react-native-web` yalnızca
     `getConstants()` sağlıyor, alan `undefined`), yani
     `isRtlLanguage(dil) !== I18nManager.isRTL` DAİMA "yön değişti" diyordu.
   - `allowRTL(true)` koşulsuz çağrılıp `forceRTL(false)` deniyordu.
     `forceRTL(false)` "LTR ol" demek değil, "zorlama" demek: `allowRTL`
     açıkken yön CİHAZIN diline düşer. Cihaz dili Arapça olan bir telefonda
     Türkçe seçen kullanıcı için yön RTL kalıyor ve döngü orada da kuruluyor.
   - **`DevSettings.reload()` yayın derlemesinde YOK.** Eski kod onu çağırıp
     `return` ediyordu: yayındaki bir Arapça kullanıcıda yeniden başlatma
     sessizce hiçbir şey yapmıyor ve akış bir sonraki adıma HİÇ geçmiyordu --
     "Devam et" kalıcı olarak ölü. Onboarding'i bitiremeyen uygulama App
     Store'da doğrudan red sebebi.
     Kural artık TEK yerde: `src/lib/rtl.ts` (`isLayoutRtl`,
     `applyLayoutDirection`, `reloadApp`). Akış yeniden başlatmanın başarısına
     BAĞLANMIYOR -- önce ilerliyor, sonra deniyor; başarısızsa doğru yön bir
     sonraki soğuk açılışta uygulanıyor. 6 test (`src/lib/__tests__/rtl.test.ts`).
2. **Font yüklenemezse uygulama sonsuza kadar spinner'da kalıyordu.**
   `app/_layout.tsx` yalnızca `fontsLoaded`'ı okuyordu, `useFonts`'un hata
   dönüşünü yok sayıyordu. `useAuthBootstrap`'ta aynı sınıf 2026-09-14'te
   kapatılmıştı; açılış yolunda kalan son koşulsuz kapı buydu. Artık hata
   kaydediliyor ve uygulama sistem yüzüyle açılıyor.
3. **`ProfileScreen`'deki "hesabımı sil" de aynı `DevSettings` hatasını
   taşıyordu** -- yayında hesap siliniyor ama ekran eski oturumun verisiyle
   olduğu yerde kalıyordu. `reloadApp()`'e bağlandı, başarısızsa köke dönüyor.
4. **`npm run web` hiç çalışmıyordu** -- `lottie-react-native`'in web girişi
   `@lottiefiles/dotlottie-react`'i çözemiyordu (kurulu değildi). Paket
   eklendi; iOS paketine GİRMİYOR (Metro platforma göre `index.js`'i
   çözüyor), yalnızca web önizlemesini açıyor. Bu denetim onsuz yapılamazdı.

**Düzeltilmeyen, işaretlenen bulgular:**

- **Türkçe büyük harf**: "ŞIMDI DEĞIL" yazıyor, doğrusu "ŞİMDİ DEĞİL".
  `typography.ts`'teki 10 token `textTransform: "uppercase"` kullanıyor; RN'in
  bu dönüşümü yerel-duyarlı DEĞİL (iOS'ta `NSString uppercaseString`), "i"
  her zaman "I" oluyor. ~29 dosyayı ilgilendiren bir tasarım-sistemi işi,
  ayrı bir göreve alındı.
- **Seviye testi sonucu çelişebiliyor**: seviye "en yüksek ARDIŞIK %80
  geçilen bant" kuralıyla veriliyor, tahmini dağarcık ise tüm bantların
  toplamı. Birkaç kolay kelimeyi ıskalayan ama zor kelimeleri bilen
  kullanıcıda ekran "A1" ve "yaklaşık 3529 kelime biliyorsun" diye iki
  çelişik şey söylüyor. Yöntem kendi içinde tutarlı; sunum değil.
- **`uk` (Ukraynaca) yok**: ADR-013 ve bu belgenin bazı yerleri 11 dil
  diyor, uygulamada 10 var (`src/lib/languages.ts` ve `src/i18n/locales/`).
  Kod tutarlı; ÇELİŞEN belge. ADR-013 düzeltilmeli ya da dil eklenmeli.

### Bu oturumda kapatılanlar (2026-09-19, reader sayfalama turu -- 2. tur)

**Asıl kök sebep bu turda bulundu ve VİDEODAN DOĞRULANDI.** Kullanıcının
gönderdiği kayıt kare kare incelendi (`ffmpeg` ile çıkarılan karelerde aynı
cümle -- "...The phone said six per cent." -- kimi karede bir sayfanın
SONUNDA, kimi karede TEK BAŞINA son sayfada duruyor: sayfalama saniyede
birkaç kez iki durum arasında gidip geliyor).

1. **Footer'ın yüksekliği son sayfada 23 px büyüyordu ve döngüyü bu
   besliyordu.** 2026-09-18'de bu "düzeltilmiş" ve testi de yazılmıştı --
   ama düzeltme `minHeight: 52` idi, yani bir TABAN. Kabın alt dolgusu
   `insets.bottom` olduğu için ana ekran çubuğu olan her iPhone'da (inset
   ~34) iki dal da tabanı aşıyor ve fark geri geliyordu:
   yüzde dalı 8+13+34=55, düğme dalı 8+36+34=78. Testi yazan kurulum
   `insets.bottom: 0` kullandığından tam da farkın kaybolduğu TEK koşulu
   ölçüyordu. Footer artık SABİT yükseklikli bir içerik kabına render
   ediliyor; test gerçekçi insetlerle çalışıyor, `minHeight` tabanını değil
   render edilen yüksekliği ölçüyor ve eski koda geri konduğunda kırmızıya
   döndüğü doğrulandı.
2. **Döngünün KENDİSİ kırıldı (asıl koruma).** Okuma alanının kabul edilen
   yüksekliği artık ZAMANLA AZALAN bir dizi: büyüme yok sayılıyor, yalnızca
   anlamlı küçülme kabul ediliyor (`nextPageContainerSize`). Azalan bir dizi
   eski bir değerine asla dönemez, yani "A -> B -> A" fiziksel olarak
   kurulamaz -- gelecekte hangi kardeş bileşen boy değiştirirse değiştirsin.
   Küçüğü tutmak güvenli yön: kap saklanandan büyükse altta görünmez boşluk
   kalır, küçükse metin kırpılırdı. Genişlik değişimi (döndürme) sıfırlıyor.

Bu ikisi, 1. turdaki üç düzeltmenin (aşağıda) üstüne geliyor -- onlar ayrı
ve gerçek hatalardı, ama kullanıcının bildirdiği git-geli tek başlarına
durdurmuyordu.

### Aynı oturum, 1. tur (2026-09-19)

Kullanıcı videosu: okurken metin kendiliğinden değişiyor, "başka bir cümle
geliyor", son sayfada belirginleşiyor. İki BAĞIMSIZ kök sebep bulundu; her
ikisi de düzeltildi.

1. **Sayfalama, paragraf aralarını hiç saymıyordu -- ve METİN KIRPILIYORDU.**
   `ReaderPage` art arda iki paragraf arasına `{"

"}`basıyordu (bir tam
   satır, ~31 px),`paginate`ise sayfa yüksekliğini hesaplarken yalnızca
   satır yüksekliklerini topluyordu. Yani render edilen sayfa, sayfalamanın
   varsaydığından her paragraf sınırı başına bir satır DAHA UZUNDU; sayfa
   kabı sabit yükseklikte ve`overflow:"hidden"`olduğu için fazlalık
   kırpılıyor, **okuyucu o satırları hiç görmeden bir sonraki sayfaya
   geçiyordu**. Koddaki eski yorum bu tavizi "en kötü ihtimalle biraz boş
   alan kırpılır" diye anlatıyordu; kırpılan boşluk değil metindi.
   Düzeltme: boşluk artık`getReadingTypeScale().paragraphGap`(tasarım
   kaynağı`mockups/reader.html` `.reading p{margin:0 0 20px}`, font
   boyutuyla ölçekleniyor), `paginate`onu bütçeliyor,`ReaderPage`aynı
   koşulla`marginTop`olarak render ediyor. Sayfa önbelleği anahtarına da
   girdi, yani eski (hatalı) yerleşimler otomatik geçersiz.
2. **Yeniden sayfalama okuma konumunu koruyordu -- sanılıyordu.** Görünen
   sayfa yalnızca bir SAYIYDI;`pages`yeniden hesaplandığında o sayı
   yerinde kalıyor ama BAŞKA bir metne denk geliyordu. Önceki oturumlar bunu
   tetikleyicileri tek tek kapatarak çözmeye çalıştı (footer yüksekliği,
  `onLayout` gürültüsü) -- ama yeniden sayfalamanın meşru sebepleri de var:
   yazı tipi/satır aralığı/kenar boşluğu ayarı, ekran döndürme ve **premium
   ses çubuğunun sunucu yanıtı gelince belirmesi** (86 pt, hâlâ açıktı).
   Düzeltme: konum artık metne bağlı bir ÇIPA (`paragraphId`+`charOffset`),
   sayfa numarası ondan türetiliyor. Her yeniden sayfalamada çıpanın düştüğü
   sayfaya `useLayoutEffect`içinde, boyamadan önce, animasyonsuz gidiliyor.
   Yeniden sayfalama artık bir hata değil, görünmez bir yeniden akış.
3. **Yeniden akış sırasında okuma yüzeyi bomboş kalıyordu.** Ölçüm sürerken
  `pages` null oluyor ve FlatList tamamen sökülüyordu. Artık bir önceki
sayfalama yenisi hazır olana kadar gösterilmeye devam ediyor.

Testler: `ReaderFooter.test.tsx` gerçekçi insetlerle yeniden yazıldı,
`__tests__/paginatedReaderAnchor.test.ts`'e "yükseklik asla büyümez"
değişmezi eklendi, `paginate.test.ts`'e paragraf-aralığı bütçesi (sayfa yüksekliğinin
asla aşılmadığı ve hiç metin kaybolmadığı dahil) ve yeni
`__tests__/paginatedReaderAnchor.test.ts`'e çıpanın yeniden sayfalamadan sağ
çıktığı kilitlendi -- sonuncusu eski index tabanlı davranışın gerçekten
kaydığını da ayrıca doğruluyor. 290 test geçiyor, typecheck ve lint temiz.

**Doğrulanamayan:** web önizlemesi bu oturumda çalıştırılamadı --
`lottie-react-native`'in web girişi `@lottiefiles/dotlottie-react`'i
çözemiyor (kurulu değil). Bu değişikliklerle ilgisi yok ve yalnızca web'i
etkiliyor, ama **düzeltmelerin gerçek cihazda/simülatörde gözle
doğrulanması yapılmadı.**

### Bu oturumda kapatılanlar (2026-09-14/15, tasarım + gelir turu)

1. **Referans tasarımına geçiş.** Kitap rafları, seviye rozetleri, ayarlar
   satırları, kitap detayı, paywall ve onboarding'in tamamı referans
   ekran görüntülerinden PİKSEL ÖLÇÜLEREK yeniden yazıldı
   (`scripts/measure-reference.py`, 1pt = 2.4046px). Ölçüler token'a
   dönüştü (`paywallType`, `paywallMetrics`, `coverColumn*.detail`,
   `monoType.levelBadge`) -- koda gömülmediler.
2. **Günlük kelime çevirisi kotası (migration 038).** Ücretsiz 15/gün,
   premium sınırsız. Öncesinde okuma ekranındaki rozet KODA GÖMÜLÜ sabit
   bir "15" yazıyordu ve hiçbir şeyi saymıyordu -- yani vaat edilen sınır
   üründe YOKTU ve paywall hiç tetiklenmiyordu. Sayaç artık sunucuda;
   `consume_word_lookup()` kontrol ve yazmayı tek çağrıda yapıyor.
3. **Cihaza bağlı kalıcı anonim hesap.** Oturum Keychain/Keystore'da
   (`src/lib/authStorage.ts`, 1800 baytlık parçalama + AsyncStorage'dan tek
   seferlik taşıma). Uygulama silinip yeniden kurulsa bile aynı hesap.
   Hesap oluşturma akışı (Apple/Google/e-posta) TAMAMEN KALDIRILDI.
4. **Dil seçimi kalıcı oldu** (`src/i18n/uiLanguage.ts`). Öncesinde seçilen
   dil hiçbir yere yazılmıyordu ve uygulama her açılışta cihaz diline
   dönüyordu. Arapça RTL de artık gerçek onboarding akışında devreye
   giriyor (kod ölü bir ekranda duruyordu).
5. **Paywall denetimi.** "Aralıklı tekrar" ve "istatistikler" ücretsiz
   oldukları hâlde premium diye satılıyordu (Guideline 2.3.1); listeden
   çıkarıldı. Dokuz tetikleyicinin envanteri ve her vaadin sunucudaki
   kapısı artık testli (`src/features/paywall/__tests__/paywallTriggers.test.ts`).
6. **Kitap açıklamaları (migration 039).** Yayındaki 356 kitabın TAMAMI
   artık kendi dilinde 3-5 cümlelik bir tanıtım metni taşıyor; her biri
   kitabın gerçek açılış paragrafları okunarak yazıldı.
7. **Okuma ilerlemesi kaydedilmiyordu.** Bekleyen kayıt, ekran kapanırken
   iptal ediliyordu (gönderilmek yerine) ve yüzde 0..1 oranı olarak
   yuvarlandığı için hep 0 yazılıyordu. İkisi de düzeltildi.
8. **Ses kontrol çubuğu** (geri/duraklat/ileri) -- oklar saniye değil
   KELİME atlıyor; zaman işaretleri zaten kelime kelime elimizde.

### Bu oturumda kapatılanlar (2026-09-13, devam oturumu)

1. **i18n bootstrap regresyon testi eklendi**
   (`src/i18n/__tests__/bootstrap.test.ts`). Önceki oturumda düzeltilen
   `resources` sarmalama hatası (`{ translation: ... }`) `localeParity.test.ts`
   tarafından YAKALANAMIYORDU çünkü o test yalnızca JSON dosyalarını
   karşılaştırıyor, gerçek `i18next.t()` çağrısını hiç çalıştırmıyor. Yeni
   test gerçek `src/i18n/index.ts`'i import edip 11 dilin HEPSİNDE
   `i18n.t("app.name")`'in ham anahtar DÖNMEDİĞİNİ doğruluyor. Bunu mümkün
   kılmak için `jest.config.js`'e `transformIgnorePatterns` eklendi
   (jest-expo'nun varsayılanına `@formatjs` ailesini ekleyerek — o paketler
   saf ESM ve polyfill zincirinin (`intl-pluralrules` →
   `intl-localematcher` → `fast-memoize`) transform edilmesi gerekiyordu).
   Testin regresyonu gerçekten yakaladığı doğrulandı (hata geçici olarak
   geri getirilip test kırmızıya döndü, sonra düzeltme geri konup yeşile
   döndü). 249 test geçiyor (was 248), typecheck/lint temiz.
2. **Gerçek bulgu: "Yazarlar ve Seriler" rafında ham anahtar görünüyordu**
   (`collections.ozSeries.title` ekranda aynen yazıyordu, "Oz Serisi" yerine).
   Sebep `src/features/home/api/useHomeExtrasQuery.ts`'deki
   `fetchSeriesTags()`: `collections.title_key` sütunu (DB) bir i18n anahtar
   yolu taşıyor (`"collections.ozSeries.title"`, JSON dosyalarındaki yapıyla
   birebir eşleşiyor) ama `CategoryTag`'e `label` alanına atanıyordu —
   `label` ÇEVRİLMEDEN gösteriliyor (`CategoryTagCard.tsx`daki
   `labelKey ? t(labelKey) : label` mantığına bakınca `labelKey` YOKSA ham
   metin basılıyor). Düzeltme: aynı satırda `labelKey: collection.title_key`
   de eklendi. Bu, CLAUDE.md'nin "hardcoded string / t() zorunluluğu"
   kuralının veritabanı-kaynaklı bir varyantıydı — kod içinde hardcode
   yoktu, ama DB'deki anahtar hiç `t()`'ye verilmiyordu.
3. **Uygulama `expo start --web` üzerinden gözle test edildi** (kullanıcının
   zaten çalışan `expo-web` launch config'i, port 8082). Dil seçici
   ekranları (native → target) görsel olarak doğru: 11 dil kendi
   alfabesinde render ediliyor, hedef dil ekranında yalnızca İngilizce
   aktif, diğerleri "Yakında" (ADR-013 ile tutarlı). **Doğrulanamayan:**
   dil çifti seçimi sonrası seviye testine geçiş — web preview'da
   `https://<proje>.supabase.co/auth/v1/user` isteği CORS'a takılıyor
   (`Access-Control-Allow-Origin` yok), bu native (iOS/Android) ortamında
   OLMAYAN bir web-preview kısıtlaması olabilir (fetch'in CORS'a tabi
   olması yalnızca tarayıcıya özgü). `set_language_pair` RPC'sinin kendisi
   başarıyla dönüyordu (`result: ok`, analytics doğruladı); sorun akışın
   ondan SONRAKİ bir adımında. **Gerçek cihazda/simülatörde bu akışın
   uçtan uca (dil seçimi → seviye testi → ana sayfa) doğrulanması hâlâ
   YAPILMADI** — bir sonraki oturumun önceliği bu olmalı, CORS'un gerçekten
   yalnızca web'e özgü olduğunu (yoksa `chapter-audio`/`translate-lemma`
   gibi başka edge function çağrılarını da etkileyen gerçek bir CORS
   yapılandırma sorunu olup olmadığını) doğrulamak için.
4. **Diğer devir maddeleri (RTL yeniden başlatma, `WordSheet` çevirisi,
   içerik yol haritası, Android RevenueCat) bu oturumda ELE ALINMADI** —
   yukarıdaki CORS engeli web preview'ı bu testler için güvenilmez kıldı.

**Çalışan:** Expo SDK 57 üzerinde tam bir okuma + öğrenme + gelir döngüsü.

- **İçerik:** 119 yayında kitap. 56 klasik (kamu malı: 17 B1, 27 B2, 6 C1,
  6 C2) + 63 özgün seviyeli hikâye (4 A1, 35 A2, 24 B1). B1 boşluğu
  2026-09-08'de kapatıldı. **Özgün B2: 3 hikâye üretildi, 9'u API kredisi
  bekliyor** (aşağıya bak).
  26.000+ kelimelik İngilizce-Türkçe sözlük (%100 çevirili).
- **Okuma:** native sayfalanan reader, kelime tıklama → Türkçe karşılık,
  cümle uzun-basma → AI çevirisi, offline bölüm önbelleği (SQLite),
  özgün 63 hikâyede kelime kelime vurgulu stüdyo seslendirmesi — premium
  (ADR-012; cihaz üstü seslendirme kaldırıldı, ADR-011 iptal).
- **Öğrenme:** kelime kaydetme, SM-2 aralıklı tekrar motoru ve tekrar
  ekranı, 36 kelimelik seviye tespiti testi ve onboarding akışı.
- **Gelir:** RevenueCat entegrasyonu; yetkiyi yalnızca webhook yazıyor
  (ADR-009). Paywall'da yıllık ön seçili plan seçici, tasarruf rozeti,
  deneme CTA'sı ve Guideline 3.1.2(a) yasal bloğu var. Dört tetikleyici,
  hepsi reader'ın dışında: Profil, kelime defteri şeridi (%60), kitap
  bitirme ekranı, ve defter dolduğunda.
- **Tutundurma:** yerel hatırlatma bildirimleri (ADR-010), ana ekranda seri
  göstergesi, kitap bitirme kutlaması, ikinci kitapta App Store puan isteme.
- **Ölçüm:** Supabase tabanlı telemetri (kalıcı kuyruk, toplu gönderim),
  hata sınırları ve çökme kaydı.
- **Store:** ikon/açılış görselleri marka sisteminden üretildi, `eas.json`
  yazıldı, App Store metinleri karakter sayılarıyla hazır, paywall mockup'ı
  eklendi (`mockups/paywall.html`).
- **Dil çiftleri (v2, 2026-09-13):** mimari kuruldu (bkz. ADR-013). 11 dil
  (en, de, fr, ru, zh, ja, it, uk, tr, ar, es) arayüzde tam çevirili;
  herhangi bir ana dil bugünkü İngilizce içeriği okuyabiliyor (karşılıklar
  runtime LLM ile üretiliyor). İlk çift ücretsiz, ek çiftler premium.
  Yeni bir hedef dilde GERÇEK kitap içeriği henüz yok — bkz. tasarım
  dokümanındaki içerik yol haritası.

33 migration versiyonlanmış, tüm tablolarda RLS aktif. Beş Edge Function
dağıtıldı (`revenuecat-webhook`, `chapter-audio`, `sync-entitlement`,
`translate-lemma`, `translate-sentence`). i18n 11 dile genellendi (eşit
anahtar + interpolasyon + çoğul tutarlılığı testle zorlanıyor, bkz.
`src/i18n/__tests__/localeParity.test.ts`). 256 test geçiyor, typecheck ve
lint temiz. Supabase güvenlik denetçisinde gerçek bulgu yok:
`SECURITY DEFINER` uyarılarının tamamı bilerek istemciye açılan RPC'ler
(hepsi `auth.uid()` kapsamlı, `search_path` kilitli), "anonim erişim"
uyarıları uygulamanın anonim oturum kullanmasının doğal sonucu, ve
"sızmış parola koruması" bu uygulamada konusuz — parola ile giriş yok
(anonim + Apple/Google kimlik jetonu + e-posta OTP).

### Yayına çıkmadan önce yapılması ZORUNLU olanlar

Ayrıntılar ve komutlar `docs/RELEASE.md` içinde. Özet:

1. ~~Migration 028–031'i uygula ve Edge Function'ları dağıt.~~ **YAPILDI
   (2026-09-08).** 31 migration da canlıda; `revenuecat-webhook`,
   `chapter-audio` ve `sync-entitlement` dağıtıldı.
2. **`REVENUECAT_API_KEY` sırrını Supabase'e ekle.** `sync-entitlement`
   bu sır olmadan 500 `not_configured` dönüyor, yani kaçan bir webhook'u
   onaran yol ÖLÜ. RevenueCat > Project Settings > API keys > **secret**
   anahtar (public SDK anahtarı DEĞİL).
3. **RevenueCat webhook'unu kur** (paylaşılan sır + URL) ve entitlement
   adının tam olarak `premium` olduğunu doğrula. 2026-09-07'de gerçek bir
   sandbox satın alması tam olarak bu yüzden kayboldu: yetki adı farklıydı,
   tek webhook teslimi "other_entitlement" sayıldı ve RevenueCat aynı satın
   alma için ikinci bir olay üretmedi (bkz. ADR-009, `sync-entitlement`).
4. **Gizlilik politikasını barındır** ve `EXPO_PUBLIC_PRIVACY_URL`'e yaz —
   paywall'daki yasal bağlantı buradan geliyor, boşsa gönderim yapılmamalı.
5. `eas init` + development build (satın alma Expo Go'da test edilemiyor).
6. RevenueCat/App Store Connect ürün tanımları (aylık ₺79,99 / yıllık
   ₺399,99, paket kimlikleri `$rc_annual`/`$rc_monthly`, entitlement adı tam
   olarak `premium`).
7. Ekran görüntüleri (hiç yok).

### İçerik: B1 boşluğu

Denetimde katalogda sert bir kopukluk bulundu: A1/A2'de 39 kısa özgün
hikâye (ortalama 6–8 dakika), sonra B1'de **özgün içerik sıfır** ve doğrudan
ortalama 197 dakikalık klasiklere geçiş. Hedef kullanıcı (A2–B2) tam orada
duvara çarpıyordu.

Çözüm: `pipeline/prompts/generate_story_b1.md` (B1 seviye kuralları, cümle
uzunluğunda hem tavan hem TABAN) + `pipeline/scripts/generate_stories.py`
(kapalı döngü üretim: üret → pipeline'ın kendi STRICT doğrulayıcısından
geçir → geçemezse gerekçelerle yeniden yazdır).

**Sonuç (2026-09-08):** 24 özgün B1 hikâyesi üretildi ve yayınlandı,
ortalama 2.811 kelime (~20 dk). Basamak artık sürekli: A1 3 dk → A2 8 dk →
**B1 20 dk** → B1/B2 klasikler.

**Yayınlarken çıkan ve düzeltilen tuzak:** `publish` seviyeyi metinden
ÇIKARIYORDU (`inferred_level`) ve kontrollü kelime dağarcığıyla yazılmış
metinlerde bu çıkarım sistematik olarak aşağı sapıyor — 24 B1 hikâyesinin
tamamı A2, A2 hikâyelerinin 5'i A1 olarak etiketlenmişti. Uygulama kütüphane
sekmelerini `cefr_level` ile filtrelediği için B1 hikâyeleri A2 rafında
görünüyordu, yani doldurmak için yazıldıkları boşluk yerinde duruyordu.
Artık özgün içerikte seviye = `target_level`; çıkarım yalnızca seviyesi
bilinmeyen klasikler için (gerekçe `pipeline/src/publish.py` içinde).

Betik `stories/` altına yazıyor, veritabanına DOKUNMUYOR. Yayınlama ayrı ve
bilinçli bir adım:

```
cd pipeline
.venv/Scripts/python.exe -m src.cli ingest --file stories/<slug>.md
.venv/Scripts/python.exe -m src.cli run --book <slug>
.venv/Scripts/python.exe -m src.cli publish --book <slug>
```

### İçerik: B2 basamağı (devam ediyor)

B1 kapandıktan sonra sıradaki boşluk B2: katalogda 27 klasik var ama özgün
içerik yoktu, yani basamak yine 20 dakikalık B1'den 200 dakikalık klasiğe
atlıyordu.

**Üretim yolu B1'inkiyle aynı** (`--level B2`), iki ek korumayla:

1. **Cümle uzunluğu TABANI** (`LEVEL_MIN_AVG_SENTENCE`). STRICT
   doğrulayıcı yalnızca TAVAN koyuyor (B2 için ort. ≤24). B2'nin asıl
   derdi taban: ortalaması 15 olan bir metin tavandan rahatça geçer ama
   yapısal olarak B1'dir. Taban `pipeline check`'in bastığı **spaCy**
   ortalamasını okuyor — kendi cümle bölücüsüyle ölçmek bir ara denendi ve
   sistematik olarak yüksek saptı (`?"` sonrası ve kısaltmalarda
   bölemiyor), yani taban tavanla farklı bir cetveldeydi.
2. **`force_frontmatter()`** — seviye/yazar/etiket alanları modele
   sorulmuyor, yazılıyor. İlk B2 denemesi künyeye `target_level: B1`
   yazmıştı; özgün içerikte yayın seviyesi doğrudan oradan geldiği için
   tek kelimelik bir sapma kitabı yanlış rafa koyuyor ve bunu hiçbir
   doğrulayıcı yakalamıyor (metin o seviyede zaten geçerli).

**Durum (2026-09-08):** 12 konudan **3'ü** üretildi ve doğrulayıcıdan
geçti (ort. cümle 20,3 / 21,3 — hedef bant 17-21; ~5.000 kelime, ~35 dk).
Kalan 9'u **Anthropic API kredisi bitince** yarıda kaldı; kredi
yüklendiğinde aynı komut kaldığı yerden devam ediyor (var olan dosyaları
atlıyor):

```
cd pipeline
.venv/Scripts/python.exe scripts/generate_stories.py --level B2 --count 12
```

Üretilen hikâyeler `stories/` altında ve **henüz yayınlanmadı**.

### Ses: kelime zamanlaması (çözülmüş hata, 2026-09-08)

**Belirti:** 2. sayfadan sonra vurgu sesin önüne geçiyor, fark sayfa
ilerledikçe açılıyordu.

**Sebep:** SSML 5.000 bayt sınırı yüzünden bölüm sesi parçalar hâlinde
sentezlenip birleştiriliyor (851 parça / 207 bölüm ≈ bölüm başına 4).
Sonraki parçanın zamanları önceki parçaların toplam süresi kadar
ötelenmeli; bu süre `max(timepoint) + 0.4` diye TAHMİN ediliyordu.
`max(timepoint)` son kelimenin BAŞLANGICI — ondan sonra o kelimenin
söylenmesi ve sondaki sessizlik geliyor. Ölçüldü: gerçek kuyruk ~0,7–1,5
saniye, yani varsayılan 0,4 sistematik olarak KÜÇÜKTÜ ve fark her parça
sınırında birikiyordu.

**Kanıt (yeniden üretim öncesi/sonrası, "ses süresi − son kelime"):**

| Bölüm                                          | Önce    | Sonra                                |
| ---------------------------------------------- | ------- | ------------------------------------ |
| the-guest-who-never-left #0 (696 kelime)       | 4,46 sn | —                                    |
| the-wrong-bus-to-the-interview #0 (680 kelime) | 3,15 sn | —                                    |
| 20 bölümlük rastgele örneklem (331–906 kelime) | —       | ort. **1,12** / en fazla **1,52** sn |

Kritik olan şu: kuyruk artık bölüm uzunluğuyla BÜYÜMÜYOR. Büyümesi zaten
birikimin imzasıydı.

**Çözüm:** öteleme `src/mp3_duration.py` ile ÖLÇÜLÜYOR (MPEG Layer III kare
başlıkları toplanıyor; yeni bağımlılık yok). Ayrıca uygulama tarafında
sayfa çevirme eşiği sabit gecikme yerine bir sonraki sayfanın ilk
kelimesinin gerçek zamanı (`pageTurnTimeAfter`).

**207 bölüm 2026-09-08'de yeniden üretildi.** Yeni bölüm eklenirse betik
zaten doğru ötelemeyi kullanıyor; `--force` yalnızca var olanları yeniden
üretmek için gerekli (maliyet: 706.286 karakter, ücretsiz kota 1M/ay).

### Bilinen teknik borç

- Bundle 7.05 MB; 1.5 MB'ı RevenueCat SDK'sı (abonelik için zorunlu).
- SDK 57'nin yeni react-hooks kuralları 6 yerde gerekçeli
  `eslint-disable` ile susturuldu; düzgün refactor ayrı bir iş.
- `.npmrc` içinde `legacy-peer-deps=true` — react-i18next@15 TS 6 peer'ini
  kabul etmiyor. react-i18next@17'ye geçmek i18next 23→26 sıçraması demek.
- Sözlükte `cefr_level` %27 dolu, `ipa`/`audio_url`/`frequency_rank` boş.
- Android'de premium çalışmaz: `configurePurchases()` yalnızca iOS
  anahtarını okuyor. iOS-önce lansman için sorun değil.
