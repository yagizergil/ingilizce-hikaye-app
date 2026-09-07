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
sınırsız kelime defteri, sınırsız aralıklı tekrar (SRS), yüksek AI cümle
çevirisi kotası, ayrıntılı öğrenme istatistikleri.

**Planlanan ama HENÜZ YOK:** sesli okuma (TTS). Bir dönem paywall'da
satılıyordu ama özellik yazılmamıştı; denetimde kaldırıldı. Kural: bir
fayda önce üründe çalışır, sonra paywall'a yazılır — tersi yanıltıcı
metadatadır (App Store Guideline 2.3.1).

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
  eklenmez (bkz. Ürün İlkesi #1).

## Mevcut Durum ve Sonraki Adımlar

> Son güncelleme: 2026-09-07 (yayın öncesi denetim oturumu). Bu bölüm her
> önemli oturumdan sonra güncellenir. `docs/ROADMAP.md` ve `docs/STATE.md`
> çok daha eski; çelişki olursa burası geçerlidir. Yayın adımlarının tamamı
> ve dağıtım komutları `docs/RELEASE.md` içinde.

**Çalışan:** Expo SDK 57 üzerinde tam bir okuma + öğrenme + gelir döngüsü.

- **İçerik:** 85 yayında kitap. 46 klasik (kamu malı) + 39 özgün A1/A2
  hikâye. Ayrıca özgün **B1** hikâyeler üretiliyor (bkz. aşağıdaki içerik
  notu). 26.071 kelimelik İngilizce-Türkçe sözlük (%100 çevirili).
- **Okuma:** native sayfalanan reader, kelime tıklama → Türkçe karşılık,
  cümle uzun-basma → AI çevirisi, offline bölüm önbelleği (SQLite).
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

29 migration versiyonlanmış, tüm tablolarda RLS aktif. i18n tam (tr + en,
eşit anahtar — artık testle zorlanıyor). 142 test geçiyor, typecheck ve lint
temiz.

### Yayına çıkmadan önce yapılması ZORUNLU olanlar

Ayrıntılar ve komutlar `docs/RELEASE.md` içinde. Özet:

1. **Migration 028 + 029'u uygula ve iki Edge Function'ı dağıt.** Kod
   hazır; `user_entitlements`'a yazan zincir bunlar dağıtılmadan çalışmaz.
2. **RevenueCat webhook'unu kur** (paylaşılan sır + URL). Bu yapılmadan
   ödeme yapan kullanıcı premium alamaz.
3. **Gizlilik politikasını barındır** ve `EXPO_PUBLIC_PRIVACY_URL`'e yaz —
   paywall'daki yasal bağlantı buradan geliyor, boşsa gönderim yapılmamalı.
4. `eas init` + development build (satın alma Expo Go'da test edilemiyor).
5. RevenueCat/App Store Connect ürün tanımları (aylık ₺79,99 / yıllık
   ₺399,99, paket kimlikleri `$rc_annual`/`$rc_monthly`, entitlement adı tam
   olarak `premium`).
6. Ekran görüntüleri (hiç yok).

### İçerik: B1 boşluğu

Denetimde katalogda sert bir kopukluk bulundu: A1/A2'de 39 kısa özgün
hikâye (ortalama 6–8 dakika), sonra B1'de **özgün içerik sıfır** ve doğrudan
ortalama 197 dakikalık klasiklere geçiş. Hedef kullanıcı (A2–B2) tam orada
duvara çarpıyordu.

Çözüm: `pipeline/prompts/generate_story_b1.md` (B1 seviye kuralları, cümle
uzunluğunda hem tavan hem TABAN) + `pipeline/scripts/generate_stories.py`
(kapalı döngü üretim: üret → pipeline'ın kendi STRICT doğrulayıcısından
geçir → geçemezse gerekçelerle yeniden yazdır).

Betik `stories/` altına yazıyor, veritabanına DOKUNMUYOR. Yayınlama ayrı ve
bilinçli bir adım:

```
cd pipeline
.venv/Scripts/python.exe -m src.cli ingest --file stories/<slug>.md
.venv/Scripts/python.exe -m src.cli run --book <slug>
.venv/Scripts/python.exe -m src.cli publish --book <slug>
```

### Bilinen teknik borç

- Bundle 7.05 MB; 1.5 MB'ı RevenueCat SDK'sı (abonelik için zorunlu).
- SDK 57'nin yeni react-hooks kuralları 6 yerde gerekçeli
  `eslint-disable` ile susturuldu; düzgün refactor ayrı bir iş.
- `.npmrc` içinde `legacy-peer-deps=true` — react-i18next@15 TS 6 peer'ini
  kabul etmiyor. react-i18next@17'ye geçmek i18next 23→26 sıçraması demek.
- Sözlükte `cefr_level` %27 dolu, `ipa`/`audio_url`/`frequency_rank` boş.
- **Sesli okuma (TTS) yok.** Paywall bir zamanlar onu premium faydası
  olarak satıyordu; denetimde kaldırıldı çünkü özellik yazılmamıştı
  (`expo-speech` yalnızca tek kelime telaffuzu için ve o ücretsiz). Geri
  eklenecekse önce özellik yazılmalı, sonra paywall'a konmalı.
- Android'de premium çalışmaz: `configurePurchases()` yalnızca iOS
  anahtarını okuyor. iOS-önce lansman için sorun değil.
