# Devir promptu — dil çiftleri v2, sonraki oturum

Aşağıdaki metni yeni oturumun ilk mesajı olarak kullan.

---

Bu proje "İngilizce Hikaye" (Türk kullanıcılar için dil öğrenme uygulaması,
Expo/React Native + Supabase). Önceki oturumda **dil çiftleri v2**
mimarisi kuruldu: uygulama tek dil çiftinden (İngilizce içerik, Türkçe
arayüz) 11 dilin (en, de, fr, ru, zh, ja, it, uk, tr, ar, es) herhangi
ikisi arasında çalışan bir sisteme geçti. Detaylı tasarım ve gerekçe:
`docs/plans/2026-09-13-dil-ciftleri-v2-tasarim.md`. İçerik kaynağı ve
maliyet araştırması: `docs/research/2026-09-13-cok-dilli-icerik-arastirmasi.md`.
Mimari kararlar `CLAUDE.md`'de ADR-013 olarak yazılı — **önce CLAUDE.md'yi
ve bu iki dokümanı oku**, sonra işe başla.

Bu oturumda ayrıca bir regresyon bulunup düzeltildi: i18next bootstrap'i
(`src/i18n/index.ts`) 11 dile genellenirken `resources` nesnesindeki
`{ translation: ... }` sarmalaması düşmüştü, bu da TÜM dillerde ham
anahtarların (`app.name`, `home.empty.title` vb.) ekranda görünmesine yol
açıyordu. Düzeltildi ve push edildi (commit `65f858e`). **Bunu tekrar test
edecek bir jest testi YAZILAMADI** — `@formatjs/intl-pluralrules` ve
transitive bağımlılığı `@formatjs/fast-memoize` saf ESM paketler ve
jest-expo'nun `transformIgnorePatterns`'ına eklemek bir ESM zincirini
açıyor (`intl-localematcher` → `fast-memoize` → ...), token bütçesi
yetmediği için o test denemesi geri alındı. **İlk yapılacak iş budur**
(aşağıdaki 0. madde).

## Kullanacağın araçlar (ZORUNLU)

- **`cct-brainstorming` skill'i** — herhangi bir yeni özellik/karar öncesi
  çalıştır. Kullanıcı önceki oturumda "bana sorma, kendi kararını ver"
  demişti; aynı tarzda devam et: soru sormak yerine kod tabanını incele,
  2-3 seçeneği kendi içinde tart, en iyisini seç ve GEREKÇESİYLE
  uygula/belgelendir.
- **`cct-ui-ux-pro-max` skill'i** — herhangi bir yeni ekran/bileşen
  tasarlarken (özellikle RTL ve çok dilli metin uzunluğu farklarını
  gözeterek).
- **`codebase-memory` (graph) araçları** — kod tabanında "bu fonksiyonu
  kim çağırıyor", "bu tabloyu nerede okuyoruz" gibi sorularda `grep`
  yerine önce bunu dene, çok daha az token harcıyor.
- **Genel amaçlı agent'lar (Agent tool, `general-purpose`, arka planda)**
  — paralelleştirilebilir araştırma/çeviri işlerini önceki oturumdaki gibi
  arka plana ver (örn. "X dili için Y'yi araştır" gibi bağımsız işler).
  Kendi ana iş akışını bloklamadan ilerlemeye devam et.
- **Supabase MCP araçları** (`apply_migration`, `deploy_edge_function`,
  `execute_sql`, `list_migrations`) — migration ve edge function
  değişikliklerini CANLI projeye (`lzewiwkwcshwxsfwybml`) doğrudan
  uygulamak için. `apply_migration` çağırmadan önce SQL içeriğini
  DOĞRU parametreyle gönderdiğinden emin ol — önceki oturumda bir kez
  yanlışlıkla boş bir yer tutucu içerikle gönderilmiş, hemen fark edilip
  düzeltilmişti ama migration geçmişinde iz bıraktı
  (`20260913181459_033_language_pairs_noop.sql` bunun şeffaf kaydı).

## Yapılacaklar (öncelik sırasıyla)

### 0. i18n bootstrap regresyon testi (küçük ama önemli)

`src/i18n/index.ts`'in gerçek `t()` çağrılarıyla test edilmesi gerekiyor
(yalnızca JSON dosyalarını karşılaştıran `localeParity.test.ts` yeterli
değil — namespace sarmalaması gibi bir hatayı YAKALAYAMAZ). Seçenekler:

- `@formatjs/intl-pluralrules` polyfill'ini test ortamında `jest.mock()`
  ile no-op'a çevirip gerçek `i18n` modülünü öyle içe aktarmayı dene.
- Ya da `transformIgnorePatterns`'a tüm `@formatjs/*` ailesini ekleyip
  transitive zinciri tam çöz (`@formatjs/intl-localematcher`,
  `@formatjs/fast-memoize`, başka biri çıkabilir — `npx jest src/i18n`
  çalıştırıp hata mesajındaki bir sonraki paketi ekleyerek ilerle).
- Hangisi olursa olsun: test, gerçek `src/i18n/index.ts`'i import edip
  `i18n.t("app.name")`'in ham anahtar DÖNMEDİĞİNİ, 11 dilin HEPSİNDE
  `i18n.changeLanguage(code)` sonrası aynı şeyin geçerli olduğunu
  doğrulamalı.

### 1. Uygulamayı gerçekten uçtan uca doğrula

Önceki oturumda typecheck/lint/test (248 test) temizdi ama **hiçbir
ekran gerçek cihazda/simülatörde açılıp gözle kontrol edilmedi**
(sadece statik analiz). Şunu yap:

- `npx expo start` ile aç, onboarding akışını baştan geç: dil seçici
  ekranı (`LanguagePairScreen`) düzgün görünüyor mu, seçim sonrası
  seviye testine geçiyor mu.
- Farklı bir cihaz dili simüle ederek (örn. simülatör dilini Almanca'ya
  çevirip) açılışta doğru dilin seçildiğini doğrula.
- Profil > Dil satırına dokunup `ManageLanguagePairsScreen`'in açıldığını,
  ikinci bir çift eklemeye çalışınca (ücretsiz kullanıcıda) paywall'a
  yönlendirdiğini doğrula.
- Arapça seçip RTL yeniden başlatma isteminin (`Updates.reloadAsync`)
  gerçekten çalıştığını doğrula — Expo Go'da çalışmayabilir, development
  build gerekebilir.
- Kelime sözlüğü kartında (`WordSheet`) bir kelimeye dokunup çevirinin
  hâlâ doğru geldiğini doğrula (bu, `translate-lemma`'nın `tr_gloss`→
  `gloss` alan adı değişikliğinden etkilenen kritik bir yoldu, önceki
  oturumda düzeltildi ama cihazda TEST EDİLMEDİ).

### 2. İçerik yol haritasını başlat (opsiyonel, kullanıcı onayına göre)

Tasarım dokümanındaki "Senaryo A" (fr, es, de → tr'yi kaynak dil yap →
it, ru → uk, ja, zh, ar) — eğer kullanıcı içerik üretimine geçmek
isterse, önce `pipeline/`'da yeni bir hedef dil için ne gerektiğini
(spaCy modeli, CEFR-eşdeğeri kelime listesi, kamu malı kaynak taraması)
araştırma dokümanındaki bulgulara göre planla. Bu BÜYÜK bir iş, tek
oturumda bitmez — brainstorming skill'iyle önce kapsamı netleştir.

### 3. Bilinen teknik borç (CLAUDE.md'de zaten yazılı, tekrar keşfetme)

- Android'de RevenueCat/premium çalışmıyor.
- Cihaz-içi lemmatizer (ADR-008) yalnızca İngilizce'de çalışıyor; yeni
  bir hedef dil eklenirse sunucu taraflı `book_surface_lemmas` gerekiyor.
- 36 kelimelik seviye testi hâlâ İngilizce'ye özgü.

## Dikkat edilmesi gerekenler

- `lemmas` tablosuna DOKUNMA — o hâlâ en→tr'nin birincil, üretimde
  kanıtlanmış kaynağı. Yeni ana diller için `lemma_translations` kullan.
- Paywall'a yeni bir fayda eklerken CLAUDE.md'deki kural geçerli: madde
  BUGÜN üründe çalışıyor olmalı, aksi hâlde Guideline 2.3.1 riski.
- Migration dosyası isimlendirmesi: yerel dosya adındaki timestamp,
  Supabase'e GERÇEKTEN uygulanan versiyonla birebir eşleşmeli
  (`list_migrations` ile kontrol et, uyuşmazsa dosyayı yeniden adlandır —
  önceki oturumda bu yüzden bir "noop" migration dosyası eklendi,
  şeffaflık için silinmedi).
