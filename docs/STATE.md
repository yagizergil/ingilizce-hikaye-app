# STATE.md — Kod ve Şema Denetimi

> **ESKİMİŞ BELGE — 2026-09-07 itibarıyla.** Bu dosyanın içeriği gerçeği
> yansıtmıyor (örn. "migrations klasörü boş", "5 kitap", "auth yazılmadı"
> ifadeleri artık doğru değil: 19+ migration, 47 kitap, çalışan auth var).
> Güncel durum için `CLAUDE.md` içindeki "Mevcut Durum ve Sonraki Adımlar"
> bölümüne bakın. Bu dosya tarihsel kayıt olarak duruyor; yeni karar
> almadan önce buna değil CLAUDE.md'ye güvenin.

> Bu belge tespit amaçlıdır, hiçbir kod değiştirilmedi. Tarih: 2026-08-05.
> Yöntem: canlı Supabase şeması (proje `hikaye`, `lzewiwkwcshwxsfwybml`) doğrudan MCP
> ile sorgulandı; kod tarafı iki paralel Explore agent + kendi Grep/Read
> taramalarımla incelendi. Her bulgu dosya:satır veya sorgu sonucu kanıtına
> dayanıyor, tahmin yürütülmedi.

---

## 1. Canlı Supabase Şeması (tam döküm)

**Proje:** `hikaye` (`lzewiwkwcshwxsfwybml`), `eu-central-1`, Postgres 17.6.

### Tablolar (24 tablo, hepsinde RLS aktif)

| Tablo | Satır | Not |
|---|---|---|
| `books` | 5 | Frankenstein, Pride and Prejudice, The Count of Monte Cristo, Meditations, The Odyssey |
| `book_sections` | 249 | bölüm metadata'sı (Monte Cristo tek başına 118 section) |
| `book_paragraphs` | 217 | **sadece ilk bölümler dolu** — bkz. §2 |
| `book_sentences` | 544 | aynı sınırlama |
| `book_tokens` | **0** | kelime tıklama verisi tamamen boş |
| `book_lemmas` | **0** | kitap-lemma frekans tablosu boş |
| `lemmas` | **0** | Türkçe çeviri sözlüğü tamamen boş |
| `collections` | 4 | |
| `collection_books` | 5 | |
| `profiles` | 0 | |
| `user_saved_words` | 0 | |
| `user_lemma_state` | 0 | |
| `user_book_progress` | 0 | |
| `user_entitlements` | 0 | |
| `srs_cards` / `srs_reviews` | 0 / 0 | |
| `user_vocabulary_estimate` | 0 | |
| `user_reading_sessions` / `user_reading_stats` | 0 / 0 | |
| `ai_cache` / `ai_usage` | 0 / 0 | |
| `user_book_coverage_cache` | 0 | |

Tüm `user_*` ve `ai_*` tablolarında **0 satır** — hiç kayıtlı kullanıcı yok, çünkü auth akışı hiç yazılmadı (bkz. §3).

### Fonksiyonlar

`get_book_coverage`, `get_library_coverage`, `get_user_streak` — üçü de `SECURITY DEFINER`, `authenticated` role'e `EXECUTE` açık (advisor uyarısı, aşağıda). `mark_coverage_cache_stale` (trigger, DEFINER), `set_updated_at` (trigger, INVOKER).

### RLS Politikaları (tam liste, `pg_policies` sorgusu ile doğrulandı)

Roadmap'in iddia ettiği gibi "policy'ler sadece canlı projede, doğrulanmadı" değil — **ben doğrudan sorguladım, gerçekten var ve doğru desende**:
- İçerik tabloları (`books`, `book_sections`, `book_paragraphs`, `book_sentences`, `book_tokens`, `book_lemmas`, `collections`, `collection_books`): `anon, authenticated` rollerine `status = 'published'` filtreli `SELECT` — herkese açık okuma doğru kurulmuş.
- Kullanıcı tabloları (`profiles`, `srs_cards`, `srs_reviews`, `user_*`): `authenticated` role'e `auth.uid() = user_id` desenli `ALL`/`SELECT`/`UPDATE` — desen doğru.
- `lemmas`: herkese açık `SELECT` (sözlük verisi, mantıklı).
- `ai_cache`: `authenticated` role'e **tüm satırları** gösteren `ai_cache_select_all` policy'si (`qual: true`, satır filtresi yok) — cache içeriği kullanıcı bazlı ayrılmamış, kritik değil ama not edilmeli.

### Güvenlik Advisor Bulguları (canlı, `get_advisors` ile çekildi)

- **[orta]** 3 fonksiyon (`get_book_coverage`, `get_library_coverage`, `get_user_streak`) `SECURITY DEFINER` olarak `authenticated` role'e açık RPC — kasıtlı mı gözden geçirilmemiş kadar mı belirsiz, ADR-005 ruhuna aykırı olmasa da doğrulanmalı.
- **[düşük]** 13 tabloda "anonymous access" uyarısı — bunların hepsi zaten `auth.uid() = user_id` desenli, `anon` rolü aslında policy'de yer almıyor (advisor `authenticated` rolünü "anon sign-in aktifse teorik olarak riskli" diye işaretliyor genel kural gereği); gerçek bir açık değil.
- **[düşük/bilgi]** ~25 index hiç kullanılmamış (`unused_index`, INFO seviyesi) — beklenen, çünkü sistemde henüz gerçek kullanıcı trafiği yok.

### Boyut

En büyük içerik tablosu `book_sentences` (304 kB), toplam DB küçük — üretim ölçeğinde değil, beklenen.

---

## 2. Repo ↔ Canlı Şema Farkı [KRİTİK — Roadmap'in iddiasından farklı ve daha ciddi]

Roadmap `supabase/migrations/` için "boş, `.gitkeep` dışında hiçbir şey yok" diyor — bu doğru (`ls supabase/migrations/` → sadece `.gitkeep`). **Ancak** canlı projede migration geçmişi **var ve düzenli**:

```
20260805084436  001_content
20260805084543  001_content_tables
20260805084609  002_user
20260805084624  003_learning
20260805084707  004_analytics
20260805084834  005_lint_fixes
20260805084855  006_function_authz
20260805085001  007_function_grants
```

Yani şema "elle/rastgele" kurulmamış — 8 adet isimlendirilmiş, sıralı migration olarak **doğru şekilde** uygulanmış. Sorun roadmap'in söylediği gibi "şema düzensiz" değil: **sorun bu 8 migration'ın SQL içeriğinin repoya hiç `git`'lenmemiş olması.** `supabase/migrations/` klasörü ile canlı `supabase_migrations.schema_migrations` tablosu arasında tam bir kopukluk var — bu, projeyi başka bir makinede/ortamda `supabase db reset` ile yeniden kuramayacağınız anlamına geliyor, ve mevcut haliyle bu migration dosyaları geri getirilebilir (Supabase CLI ile `db pull` yapılırsa), ama şu an hiç yapılmamış.

**Öncelik:** [kritik] — `supabase db pull` (veya `db diff`) çalıştırıp bu 8 migration'ı repoya committlemek, roadmap'in kendi 2. öncelik maddesiyle uyumlu, ama kapsamı daha net: iş "şema yazmak" değil "zaten var olan şemayı repoya çekmek".

---

## 3. Feature Durumu (src/features/*)

*(Kaynak: paralel Explore agent taraması, dosya:satır kanıtlı)*

| Feature | Durum | Kanıt |
|---|---|---|
| **reader** | Gerçek, en olgun feature | `useChapterQuery.ts` (173 satır), `WordSheet.tsx` (190), `ReaderSettingsSheet.tsx` (270), `useReadingProgressMutation.ts`, `useSavedWordsQuery.ts` — hepsi gerçek Supabase çağrıları içeriyor |
| **library** | Gerçek, çalışıyor | `useBooksQuery.ts`, `mapBookRow.ts`, `FilterSheet.tsx` vb. dolu |
| **home** | Gerçek | `useHomeDataQuery.ts` (86 satır) |
| **vocabulary** | [kritik] Tamamen iskelet | `index.ts`/`types.ts` = `export {};`, diğer klasörler sadece `.gitkeep` |
| **srs** | [yüksek] Tamamen iskelet | aynı durum, SM-2 algoritması yok |
| **onboarding** | [kritik] Tamamen iskelet | aynı durum, ilk açılış akışı yok |
| **paywall** | [kritik] Tamamen iskelet | `env.ts` RevenueCat key okuyor ama `Purchases`/`react-native-purchases` import eden **sıfır** satır (grep doğrulandı) |
| **profile** | [orta] Tamamen iskelet | tab placeholder'a bağlı |

### Auth [KRİTİK]

`src/lib/supabase.ts` gerçek bir client kuruyor (persist + autoRefresh), ama repo genelinde `signIn`, `signUp`, `onAuthStateChange` için **sıfır eşleşme**. Tek kullanılan çağrı `supabase.auth.getUser()` — kullanıcı hiç login olamıyor, bu yüzden `user_saved_words`/`user_book_progress` gibi tüm `user_*` tabloları canlıda 0 satır (§1 ile tutarlı, kanıtlanmış). Roadmap'in 3. öncelik maddesini doğrudan doğruluyor.

### analytics.ts [kritik]

`src/lib/analytics.ts` tamamı 11 satır, tek fonksiyon `trackEvent`, gövdesi sadece `if (__DEV__) console.warn(...)`. Dosyanın kendi yorumu bunu "gerçek sağlayıcı seçilince değiştirilecek stub" olarak tanımlıyor — production'da hiçbir event gitmiyor. Roadmap Adım 8'de zaten biliniyor, doğrulandı.

### Sahte/hardcoded gating taraması

`isPremium`, `hardcoded`, `TODO`, `FIXME`, `yakında` için repo genelinde grep — **sıfır eşleşme**. Yani "gerçek sanılıp kullanılan bir stub" (örn. hep `true` dönen sahte bir entitlement kontrolü) yok — çünkü entitlement kontrolü hiç yazılmamış (paywall boş). Reader'daki tek bilinçli placeholder: `ReaderScreen.tsx` içindeki "Quiz'e başla" butonu, yorumla açıkça "premium ile gelecek, henüz no-op" diye işaretli — dürüst placeholder, gizli stub değil.

---

## 4. Tasarım Tutarlılığı Denetimi

*(Kaynak: paralel Explore agent taraması)*

- **Token'lar tanımlı:** `src/theme/colors.ts` (light/dark, 8 key), `spacing.ts` (spacing + radius), `typography.ts` (`fontSizes`: sm/md/lg/xl + reader ölçek katsayıları).
- **[orta] Renk:** 7 farklı hardcoded hex/rgba değeri, 6 dosyada. En dikkat çekici: `#FFFFFF` sabit beyaz olarak 4 dosyada (`WordSheet.tsx:188`, `SentenceSheet.tsx:106`, `ReaderSettingsSheet.tsx:41,268`, `ChapterCompleteCard.tsx:82`) — dark mode'da bunlar tema rengini değil sabit beyazı kullanıyor, **dark mode'u kısmen bozuyor**. `CoverPlaceholder.tsx:11` kendi `PALETTE` dizisini tanımlıyor, ikisi tema rengiyle çakışıyor ama import etmek yerine yeniden tanımlanmış.
- **[orta] fontSize:** Tanımlı `fontSizes` token'ı (`sm/md/lg/xl` = 13/15/17/22) **hiçbir dosyada import edilip kullanılmıyor**. ~70 `fontSize:` kullanımının tamamı ham literal. 13 farklı değer tespit edildi (`11,12,13,14,15,16,17,18,20,22,24,28,40`), bunların sadece 4'ü token skalasıyla çakışıyor — geri kalan 9'u gelişigüzel.
- **Adoption oranı:** 34 `.tsx` dosyasının 29'u (~%85) `@/theme`'den en az bir şey import ediyor (çoğunlukla `colors`/`spacing`), ama bu dosyaların bir kısmı aynı anda hardcoded renk de içeriyor (sızıntılı adoption). `fontSizes` token adoption'ı fiilen **%0**.

**Öncelik:** [orta] — kritik değil ama iki somut, ucuz düzeltme: (1) `#FFFFFF` yerine `colors[theme].background`/`surface` kullan, (2) `fontSize` literallerini `fontSizes` token'ına taşı.

---

## Özet — En Kritik Bulgular (roadmap'in 3 önceliğiyle çapraz kontrol)

1. **[kritik] Migration dosyaları repoda yok ama canlıda 8 düzenli migration var** — roadmap "şema düzensiz kuruldu" diyor, gerçek durum "şema düzenli kuruldu ama hiç `git`'lenmedi". Fix: `supabase db pull`.
2. **[kritik] Auth hiç yazılmamış** — client hazır, sign-in/sign-up sıfır. Tüm `user_*` tablolarının 0 satır olması bunun doğrudan kanıtı.
3. **[kritik] Content pipeline yok, `book_tokens`/`lemmas` 0 satır** — 5 kitabın sadece ilk bölümü dolu (Frankenstein 9 paragraf, Monte Cristo 124 paragraf — kitaplar arası kapsama çok tutarsız), kelimeye tıklama hiçbir kitapta çalışmıyor.
4. **[kritik] paywall/vocabulary/srs/onboarding tamamen iskelet** — RevenueCat key okunuyor ama SDK hiç import edilmiyor.
5. **[orta] Tasarım token'ları kısmen es geçiliyor** — özellikle `fontSizes` hiç kullanılmıyor, birkaç yerde sabit `#FFFFFF` dark mode'u bozuyor.

---

## Senin Karar Vermen Gereken 3 Soru

1. **Migration kurtarma yöntemi:** 8 canlı migration'ı repoya çekmek için `supabase db pull` mü kullanılsın, yoksa şema elle (mevcut tabloları tek tek inceleyip) yeniden mi yazılsın? `db pull` daha hızlı ve kesin ama migration dosya adlarını/sırasını olduğu gibi (bazı garip noktalar var, örn. `001_content` ve `001_content_tables` aynı numarayla iki ayrı migration) miras alır — bunları temizlemek ister misin yoksa olduğu gibi mi committlensin?

2. **Auth önce mi, pipeline önce mi?** Roadmap'in kendi önceliği pipeline'ı 1. sıraya koyuyor ama auth olmadan hiçbir `user_*` verisi kalıcı olmuyor (kelime kaydetme, ilerleme — reader'ın iki temel özelliği). Hangisiyle başlanacak: içerik ölçeklemek mi (daha fazla kitap/bölüm, kelime tıklama), yoksa kullanıcı girişini bağlamak mı (mevcut içerikle bile kullanıcı deneyimini tamamlamak)?

3. **`SECURITY DEFINER` fonksiyonları (`get_book_coverage`, `get_library_coverage`, `get_user_streak`) kasıtlı mıydı?** Advisor bunları `authenticated` role'e açık DEFINER fonksiyon olarak işaretliyor. Bu üçü coverage/streak hesaplama için mantıklı bir kullanım gibi görünüyor (RLS'yi bypass edip agregasyon yapmaları gerekiyor olabilir) ama teyit edilmemiş — `SECURITY INVOKER`'a çevrilmeleri mi gerekiyor, yoksa mevcut haliyle mi kalsınlar?
