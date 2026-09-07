# Roadmap

> **ESKİMİŞ BELGE — 2026-09-07 itibarıyla.** Bu dosyanın içeriği gerçeği
> yansıtmıyor (örn. "migrations klasörü boş", "5 kitap", "auth yazılmadı"
> ifadeleri artık doğru değil: 19+ migration, 47 kitap, çalışan auth var).
> Güncel durum için `CLAUDE.md` içindeki "Mevcut Durum ve Sonraki Adımlar"
> bölümüne bakın. Bu dosya tarihsel kayıt olarak duruyor; yeni karar
> almadan önce buna değil CLAUDE.md'ye güvenin.

Bu prompt serisinin adımları ve her adımın "bitti" tanımı. Sıra
bağımlılığa göredir; bir sonraki adıma geçmeden öncekinin "bitti"
kriterleri sağlanmış olmalı.

> **Güncel durum özeti (bkz. tarih: bu bölüm her önemli oturumdan sonra
> güncellenir):** Adım 0 tamam. Adım 3 (Reader) fiilen büyük ölçüde
> yazıldı ama Adım 1'in (şema migration'ları, auth) resmi olarak
> tamamlanmasından ÖNCE yapıldı — sıra dışına çıkıldı. Adım 2
> (Kütüphane) gerçek veriye bağlandı. Adım 4 (Pipeline) hâlâ boş
> iskelet; veritabanındaki 5 kitabın 1'er bölümü pipeline'dan değil,
> elle hazırlanmış tek seferlik bir script + manuel SQL ile yüklendi.
> Detaylar aşağıdaki ilgili bölümlerde.

## 0. İskelet + Anayasa (bu oturum)

**Kapsam:** Klasör yapısı, tooling, boş ama çalışan uygulama, `CLAUDE.md`.

**Bitti tanımı:**

- [x] `app/`, `src/` (feature-sliced), `supabase/`, `pipeline/`, `docs/` klasörleri var
- [x] TypeScript strict, path alias (`@/`), ESLint + Prettier + husky pre-commit kurulu
- [x] `.env.example` var, `.env` gitignore'da, service_role key sadece `pipeline/.env`'de
- [x] 4 sekmeli (Ana Sayfa, Kütüphane, Kelimelerim, Profil) placeholder uygulama açılıyor
- [x] `CLAUDE.md` yazıldı: ilkeler, klasör sorumlulukları, ADR'ler, konvansiyonlar, ASLA YAPMA listesi

## 1. Supabase Şeması ve Auth

**Kapsam:** Veritabanı şeması, RLS politikaları, Apple Sign-In dahil auth akışı.

**Bitti tanımı:**

- [ ] ~~`books`, `chapters`, `words`, `user_vocabulary`, `srs_cards`,
      `subscriptions` tabloları migration olarak yazıldı~~ — **kısmen
      ve düzensiz.** Canlı Supabase projesinde (`hikaye`) gerçek bir
      şema VAR: `books`, `book_sections`, `book_paragraphs`,
      `book_sentences`, `book_tokens`, `lemmas`, `user_saved_words`,
      `user_lemma_state`, `user_book_progress`, `user_entitlements`,
      `srs_cards`, `srs_reviews`, `collections`, `profiles`, `ai_cache`,
      `ai_usage` — isimlendirme yukarıdaki plandan farklı ve şema
      doğrudan canlı projede oluşturulmuş, **repo'daki
      `supabase/migrations/` klasörü hâlâ boş (`.gitkeep` dışında hiçbir
      migration dosyası yok).** Yani şema var ama versiyonlanmamış;
      şemayı elle veya `supabase db pull` ile migration dosyalarına
      dökmek gerekiyor.
- [ ] RLS: canlı tablolarda RLS aktif ve `user_id = auth.uid()` desenli
      policy'ler doğrulandı (bkz. `pg_policies` sorgusu), ama bu
      policy'ler de migration dosyası olarak repoda değil — sadece
      canlı projede.
- [ ] `features/onboarding` boş iskelet (`onboarding/api`,
      `onboarding/components` sadece `.gitkeep`). Supabase Auth
      entegrasyonu, Apple Sign-In yok.
- [x] Oturum MMKV üzerinden kalıcı — `src/lib/supabase.ts` +
      `src/lib/storage.ts` (`AsyncStorageLikeMMKV` adaptörü,
      `persistSession: true`).
- [x] `npm run typecheck` ve `npm run lint` hatasız (mevcut kod için).

## 2. Kütüphane (Library) — Gerçek Veri

**Kapsam:** Kitap listesi Supabase'den çekiliyor, arama/filtre var.

**Bitti tanımı:**

- [x] `features/library/api` TanStack Query hook'ları gerçek
      `books`/`book_sections` tablolarını çekiyor (`useBooksQuery.ts`,
      `useBookQuery.ts`, `mapBookRow.ts`) — mock veri (`mockBooks.ts`)
      silindi.
- [x] Kitap kartı, seviye etiketi UI'da (`BookCard.tsx`,
      `LevelBadge.tsx`). Kapak görseli Supabase Storage'dan **değil**,
      `CoverPlaceholder` (renkli baş harf) ile — gerçek kapak görseli
      henüz yok.
- [x] Arama ve seviye filtresi çalışıyor (`SearchBar.tsx`,
      `FilterSheet.tsx`, `useFilteredBooks.ts`, `useLibraryFiltersStore.ts`).
      Not: gerçek veri hepsi "C2" seviyesinde geldiği için `Level` tipi
      tam CEFR skalasına (A1–C2) genişletildi.
- [ ] Boş/loading/hata state'leri ekranlarda ayrı ayrı doğrulanmadı
      (hook'lar var ama uçtan uca gözden geçirilmedi).
- [ ] Testler: **hiç yok.** Repo'da tek bir Jest test dosyası
      (`*.test.ts(x)`) veya `.maestro/` klasörü bulunmuyor.

## 3. Okuma Deneyimi (Reader)

**Kapsam:** Gerçek okuma ekranı, kelime tıklama, ilerleme kaydı.

**Bitti tanımı:**

- [x] Bölüm metni render ediliyor (`ReaderScreen.tsx`,
      `ParagraphText.tsx`, `FlashList` ile sanallaştırılmış scroll).
- [x] Kelimeye tıklayınca sözlük gösterimi (`WordSheet.tsx`: telaffuz,
      çeviri, bağlam cümlesi, kaydet/biliyorum). AI açıklama (gramer)
      premium'a kilitli ama henüz gerçek bir AI endpoint'e bağlı değil
      — `SentenceSheet.tsx` şu an sadece "yakında geliyor" bildirimi
      gösteriyor (dürüst placeholder, promosyon değil).
- [x] Okuma ilerlemesi kalıcı — `user_book_progress` tablosuna
      debounce'lu upsert (`useReadingProgressMutation.ts`,
      `useReaderProgress.ts`), offline'da MMKV kuyruğuna düşüyor.
- [x] Reader ekranında promosyon/banner/paywall UI'ı yok (denetlendi,
      `src/features/reader/components/` içinde paywall import'u yok).
- [ ] Performans: >5000 kelimelik bölümde donma olmadığı gerçek
      cihazda ÖLÇÜLMEDİ (FlashList kullanıldı ama benchmark yok).
- [x] Font/tema/satır aralığı/kaydırma ayarları kalıcı
      (`ReaderSettingsSheet.tsx`, `useReaderSettings.ts`, MMKV).
- [x] Bölüm bitince kutlama + sonraki bölüm (`ChapterCompleteCard.tsx`);
      bölüm quizi premium'a bırakıldı, henüz yok (roadmap adım 6).
- [x] `app/reader/[chapterId].tsx` route'u var, kütüphaneden
      "Okumaya başla" / bölüm satırına dokunarak gerçekten açılıyor.

**Not:** Bu adım, Adım 1 (şema/auth) resmen bitmeden yazıldı — sıra
dışına çıkıldı çünkü istek doğrudan reader ekranı içindi. Auth
olmadığı için `useSavedWordsQuery`/`useReadingProgressMutation`
`supabase.auth.getUser()` boş dönerse sessizce no-op oluyor (kullanıcı
login değilse kelime kaydı/ilerleme kalıcı olmuyor).

## 4. İçerik Pipeline (Python)

**Kapsam:** Public domain kaynaktan gerçek kitap ekleme akışı.

**Bitti tanımı:**

- [ ] Bir kaynaktan (örn. Project Gutenberg) metin çekme scripti
      çalışıyor — **yok.** `pipeline/` hâlâ tamamen boş iskelet:
      `pyproject.toml`, `README.md`, `.env.example`, boş `src/__init__.py`,
      boş `tests/.gitkeep`. Tek satır gerçek scraping/temizleme/seviyeleme
      kodu yok.
- [ ] Metin temizleme, seviye tahmini — yok (yukarıdakiyle aynı sebep).
- [ ] Supabase'e `service_role` ile yazma — yok, pipeline hiç çalıştırılmadı.
- [x] ama [ ] **En az 3 gerçek kitap canlı Supabase'de mevcut** —
      kısmen doğru ve önemli bir uyarıyla: `books` tablosunda 5 gerçek
      kitap var (Frankenstein, Pride and Prejudice, The Count of Monte
      Cristo, Meditations, The Odyssey — gerçek public-domain metin,
      GITenberg/Project Gutenberg kaynaklı), ve her birinin **sadece
      ilk bölümünün** paragraf+cümle metni gerçek ve tam olarak
      yüklü. **Bunlar pipeline'dan geçmedi** — bir oturumda elle
      yazılmış tek seferlik bir Python script + Supabase MCP üzerinden
      manuel SQL INSERT ile yüklendi. `book_tokens` (kelime tıklama
      verisi) ve `lemmas` (Türkçe çeviri sözlüğü) tabloları **tamamen
      boş (0 satır)** — yani şu an hiçbir kitapta kelimeye dokunma
      çalışmıyor, sadece düz okuma + cümleye uzun basma çalışıyor.
      Kitapların geri kalan bölümleri (`book_sections` tablosunda
      metadata olarak zaten var, ör. Monte Cristo'nun 100+ bölümü) hiç
      içerik içermiyor.
- [ ] Pipeline'ın kendi testleri (`pipeline/tests`) — yok, klasör boş.

**Yapılacak:** Gerçek bir Python pipeline yaz (Gutenberg/GITenberg'den
indirme → temizleme → bölüm/paragraf/cümle/token ayrıştırma → lemma
sözlüğü + çeviri → Supabase'e `service_role` ile yazma), sonra bunu 5
kitabın TÜM bölümleri için ve yeni kitaplar için çalıştır. Şu anki 5
kitap + 1'er bölümlük veri bir başlangıç noktası, pipeline'ın
kendisi değil.

## 5. Kelime Defteri ve SRS

**Kapsam:** Kelime kaydetme, aralıklı tekrar (spaced repetition) motoru.

**Bitti tanımı:**

- [x] ama farklı yerde: Reader'dan kelime "kaydet" çalışıyor —
      ama `user_vocabulary` değil, gerçek şemadaki `user_saved_words` +
      `user_lemma_state` tablolarına yazıyor
      (`src/features/reader/api/useSavedWordsQuery.ts`). Bu mantık
      `features/vocabulary` içinde değil, reader'ın kendi `api/`
      klasöründe yaşıyor — geçici bir çözüm, `docs/ROADMAP.md`'de not
      düşülmüştü, henüz taşınmadı.
- [ ] `features/vocabulary` boş iskelet (`.gitkeep` + `types.ts`/`index.ts`
      dışında hiçbir şey yok) — kaydedilen kelimeleri listeleyen bir
      ekran yok.
- [ ] `features/srs` boş iskelet — zamanlama algoritması (SM-2 vb.) yok.
      `srs_cards`/`srs_reviews` tabloları canlı şemada var ama hiç
      kullanılmıyor.
- [ ] SQLite offline tekrar verisi — yok (SQLite şu an sadece reader'ın
      bölüm cache'i için kullanılıyor, `src/features/reader/api/chapterCache.ts`,
      SRS için değil).
- [ ] Ücretsiz/premium kelime limiti — yok, gating hiç yazılmadı.

## 6. Paywall ve Abonelik

**Kapsam:** RevenueCat entegrasyonu, premium teklif ekranı, feature gating.

**Bitti tanımı:**

- [ ] RevenueCat SDK **kurulu ama hiç kullanılmıyor** —
      `react-native-purchases` `package.json`'da bağımlılık olarak var,
      ancak `src/`/`app/` içinde `Purchases`/`react-native-purchases`
      import eden tek bir satır yok.
- [ ] `features/paywall` boş iskelet, teklif ekranı yok.
- [ ] `user_entitlements` tablosu canlı şemada var ama hiçbir yerden
      okunmuyor/yazılmıyor; reader'daki `isPremium` şu an route'ta
      hardcoded `false` (bkz. `app/reader/[chapterId].tsx` geçmişi —
      gerçek entitlement kontrolüne henüz bağlanmadı).
- [ ] Restore purchases — yok.

## 7. Profil ve İstatistikler

**Kapsam:** Kullanıcı profili, öğrenme istatistikleri (premium).

**Bitti tanımı:**

- [ ] `features/profile` boş iskelet. `app/(tabs)/profile.tsx` hâlâ
      sadece `<PlaceholderScreen title={t("tabs.profile")} />` render
      ediyor — kullanıcı bilgisi, ayarlar, çıkış yapma yok.
- [ ] İstatistik ekranı yok.
- [ ] Dil değişikliği (tr/en) ayarlardan yapılamıyor — i18n altyapısı
      hazır (`src/i18n/`) ama kullanıcıya açık bir toggle yok, sadece
      cihaz dilini otomatik algılıyor.

## 8. Sertleştirme ve Yayına Hazırlık

**Kapsam:** Test kapsamı, performans, App Store gönderim hazırlığı.

**Bitti tanımı:**

- [ ] Maestro e2e testleri — yok, `.maestro/` klasörü repoda bulunmuyor.
- [ ] EAS Build — yok, `eas.json` repoda bulunmuyor.
- [ ] Crash/analytics entegrasyonu — sadece stub. `src/lib/analytics.ts`
      `__DEV__` altında `console.warn` yapan, gerçek bir sağlayıcıya
      (PostHog, Amplitude vb.) henüz bağlanmamış bir no-op.
- [ ] App Store gizlilik formu — henüz uygulanacak bir aşamaya
      gelinmedi.

## Önümüzdeki en kritik 3 iş (öncelik sırasıyla)

1. **Gerçek içerik pipeline'ı yaz (Adım 4).** Şu an DB'deki 5 kitap +
   1'er bölüm tamamen elle yüklendi; bu ölçeklenmiyor ve `book_tokens`/
   `lemmas` boş olduğu için kelimeye dokunma hiçbir kitapta çalışmıyor.
2. **Şemayı migration dosyalarına dök (Adım 1).** Canlı proje ile repo
   arasında versiyon farkı var; başka biri/ortam bu şemayı
   yeniden kuramaz çünkü `supabase/migrations/` boş.
3. **Auth'u bağla (Adım 1).** Login olmadan kelime kaydetme ve okuma
   ilerlemesi sessizce hiçbir şey yapmıyor (RLS `auth.uid()`'a bağlı,
   kullanıcı yoksa satır yazılmıyor) — bu reader'ın en temel iki
   özelliğini fiilen devre dışı bırakıyor.
