# Dil çiftleri v2 — tasarım ve yol haritası

**Tarih:** 2026-09-13
**Durum:** Mimari uygulandı (şema, edge function'lar, onboarding, profil,
paywall). İçerik üretimi (yeni hedef diller) başlamadı — bkz. "İçerik yol
haritası" bölümü.
**İlgili araştırma:** `docs/research/2026-09-13-cok-dilli-icerik-arastirmasi.md`
(kaynak linkli, ~950 satır — burada yalnızca kararları etkileyen sonuçlar
özetleniyor).

## 1. İstenen ürün

Uygulama tek bir yönden (İngilizce içerik, Türkçe arayüz) 11 dilin
herhangi ikisi arasında çalışan bir sisteme geçiyor: en, de, fr, ru, zh,
ja, it, uk, tr, ar, es. Bir Alman kullanıcı Türkçe okuyabilmeli, bir
Fransız Rusça, bir İngiliz Fransızca — 110 yönlü çiftin hepsi teorik
olarak mümkün olmalı.

**Ticarileştirme (ürün sahibinin kararı, değiştirilmedi):** İlk dil çifti
her zaman ücretsiz. İkinci bir çift eklemek ya da ilk seçimi değiştirmek
premium gerektiriyor. Zaten sahip olunan çiftler arasında geçiş her zaman
ücretsiz.

## 2. Kritik mimari karar: "N hedef dil" ≠ "N×N çift"

Bu ayrım tüm tasarımın temeli, o yüzden en başta:

- **Hedef dil sorunu** ("Almanca kitap içeriği"): bir kitabın hangi dilde
  yazıldığı sorusu. Kelime sınırları, lemmatizasyon, seviyelendirme
  çerçevesi (CEFR/HSK/JLPT), TTS sesi — hepsi HEDEF dile bağlı ve HER
  YENİ hedef dil için ayrı bir pipeline kurulumu gerektiriyor (spaCy
  modeli, kelime frekans listesi, kamu malı kaynak taraması, TTS ses
  envanteri doğrulaması). Bu, dil başına haftalarca süren bir iş.
- **Çift sorunu** ("Alman biri Türkçe okusun"): bir kelimenin hangi dile
  ÇEVRİLDİĞİ sorusu. Bu, kitaptan bağımsız ve ucuz: mevcut
  `translate-lemma` runtime LLM fallback'i zaten bunu yapıyor, tek eksik
  "Türkçe" sabitinin parametreye dönmesiydi.

**Sonuç:** hedef dil sayısını ARTIRMADAN (bugün: yalnızca en, tr), çift
sayısını 110'a çıkarmak MÜMKÜN ve neredeyse ücretsiz. Bir Alman kullanıcı
BUGÜN Türkçe'yi hedef seçip okuyabilir; ya da (daha olası) İngilizce'yi
hedef seçip karşılıkları Almanca alabilir. Yeni bir hedef dil (örn.
gerçek Almanca KİTAP içeriği) ayrı, bilinçli bir sonraki proje.

## 3. Şema (migration 033)

```
languages                 -- 11 dilin statik referansı (RTL, TTS kodu, vb.)
books.target_language      -- kitabın yazıldığı dil (backfill: 'en')
profiles.native_language   -- artık languages'e FK (önceden serbest metindi)
lemma_translations         -- genel (target, lemma, pos, native) → gloss önbelleği
user_language_pairs        -- kullanıcının açtığı çiftler, en fazla 1 aktif
set_language_pair() RPC    -- tek yazar; ücretsiz/premium kuralı BURADA
```

**`lemmas` tablosuna DOKUNULMADI.** 26.100 kelimelik bu tablo (en→tr)
üretimde kanıtlanmış; onu (target, native) çiftini taşıyacak şekilde
genişletmek her tüketiciyi (useBookLemmaDictionary, useGlobalLemmaLookup,
sample_level_test_words, lemma_canonical view) aynı anda değiştirmek
demekti — sıfır fayda karşılığında büyük risk. `lemma_translations`
yalnızca DİĞER 9 ana dil için devreye giriyor, sparse başlıyor, talep
üzerine `translate-lemma`'nın runtime LLM fallback'iyle doluyor.

**Ücretsiz/premium kuralı `set_language_pair()` içinde, RLS'de değil**
(ADR-009 deseniyle birebir aynı desen: `user_language_pairs` üzerinde
insert/update policy YOK, tek yazar SECURITY DEFINER fonksiyon).

## 4. İstemci tarafı

- `src/lib/languages.ts` — 11 dilin sabit istemci-taraflı listesi (ağ
  beklemeden seçici ekranları çizebilsin diye; tek doğruluk kaynağı yine
  sunucudaki `languages` tablosu).
- `src/features/languagePair/` — yeni feature slice:
  - `useActiveLanguagePairQuery` / `fetchActiveLanguagePair` — aktif çift,
    hiç seçilmemişse (v2 öncesi hesaplar) `{tr, en}`'e düşer.
  - `useSetLanguagePairMutation` — RPC'yi çağırır, `premium_required`
    sonucunu yorumlar.
  - `LanguagePairScreen` — onboarding'in İLK adımı (seviye testinden
    önce, çünkü test İngilizce kelime gösteriyor).
  - `ManageLanguagePairsScreen` — Profil'den açılan yönetim ekranı;
    sahip olunan çiftler arasında ücretsiz geçiş, yeni çift eklemek
    `premium_required` dönerse paywall'a yönlendiriyor.
- `translate-lemma`/`translate-sentence` edge function'ları artık
  `nativeLanguage`/`targetLanguage` alıyor (varsayılan tr/en — eski
  istemci uyumu). `useLiveWordTranslation`/`useSentenceTranslationQuery`
  aktif çifti okuyup isteğe ekliyor.
- `useBooksQuery` artık aktif çiftin `targetLanguage`'ına göre filtreliyor
  (bugün tüm kitaplar 'en' olduğu için mevcut kullanıcılarda görünür bir
  değişiklik yok; yeni bir hedef dil eklendiğinde otomatik çalışacak).
- i18n bootstrap 11 dile genelleştirildi (`@formatjs/intl-pluralrules`
  locale-data'sı hepsi için yüklü). Arapça RTL: `I18nManager.forceRTL()`
  yalnızca BİR SONRAKİ native render kurulumunda etkili olduğu için,
  kullanıcıdan `expo-updates` ile gerçek bir yeniden başlatma isteniyor.
- Paywall'a "ikinci bir dil çifti aç" faydası eklendi — bu BUGÜN gerçekten
  çalışan bir özellik (premium kullanıcı ikinci çifti açıp mevcut 119
  kitabı o dilden okuyabiliyor), vaat edilenin ötesine geçmiyor.

## 5. Testler

`src/i18n/__tests__/localeParity.test.ts` tr/en'den 11 dile genellendi:
her dilin `en` ile aynı taban anahtarlara sahip olduğunu, hiçbir değerin
boş kalmadığını, her çoğullu anahtarın en az `_other` hâlinin bulunduğunu
ve interpolasyon değişkenlerinin eşleştiğini doğruluyor (ihtiyaç kadar
esnek: `_zero`/`_one`/`_two` kategorilerinde `{{count}}`'un dilbilgisel
olarak DÜŞÜRÜLMESİ — örn. Arapça "kitabının ilkini bitirdin" — hataya
sayılmıyor, `_few`/`_many`/`_other`'da düşürülmesi sayılıyor). 248 test
geçiyor.

Süreçte bir gerçek çeviri sorununu bu test kendisi yakaladı (Arapça'da
bazı `_one` varyantlarında `{{count}}` eksikti) ve incelemede bunun hata
değil doğru bir dilbilgisi tercihi olduğu görüldü — test buna göre
gevşetildi, kural gevşetilmedi (hâlâ `_few`/`_many`/`_other`'da zorunlu).

## 6. Araştırmadan gelen ve mimariyi doğrudan etkileyen bulgular

Tam rapor: `docs/research/2026-09-13-cok-dilli-icerik-arastirmasi.md`.
Burada yalnızca YAPISAL kararları etkileyenler:

1. **Cihaz-içi lemmatizer (ADR-008) çoğu yeni dilde çalışmaz.**
   `tokenizer.js`'deki kural tabanlı ek-kuralı (suffix-rule) sistemi
   İngilizce morfolojisine özgü (-ed, -ing, doubled consonants). Rusça
   çekim, Arapça kök-kalıp morfolojisi, Japonca/Çince'de kelime
   sınırlarının boşlukla belirtilmemesi — hiçbiri bu yaklaşımla
   çözülemez. **Sonuç:** yeni bir hedef dil eklendiğinde lemmatizasyon
   PIPELINE zamanında (sunucu tarafı, ADR-008'in "gelecek yol" olarak
   bıraktığı `book_surface_lemmas` tablosu) yapılmalı, cihazda değil.
   Bu migration'ın kapsamında DEĞİL çünkü bugün yeni bir hedef dil
   eklenmiyor; ama bir sonraki hedef dil projesinin İLK maddesi bu.
2. **TTS'in en iyi kalitesi (Chirp 3 HD) SSML `<mark>` desteklemiyor.**
   ADR-012'nin dayandığı kelime-kelime vurgu yalnızca Neural2/WaveNet'te
   mümkün. Neural2 Türkçe, Ukraynaca, Arapça'da YOK — bu üç dil WaveNet'e
   (daha düşük kalite) düşmek zorunda. Yeni bir hedef dil eklenirken
   `pipeline/scripts/generate_audio.py`'nin ses seçimi bunu hesaba katmalı.
3. **Pivot dil stratejisi (her şeyi İngilizce üzerinden çevir) YANLIŞ.**
   Çok anlamlılık pivotta sistematik bozuluyor. Doğru model: 11 lemma
   listesi × 10 gloss sütunu, tek AI çağrısında birden fazla ana dilin
   karşılığı üretilebilir. `lemma_translations` şeması buna zaten uygun
   (satır başına tek native_language, toplu üretimde tek çağrıda N satır
   yazılabilir).
4. **Kamu malı içerik son derece dengesiz.** Türkçe ve Ukraynaca için
   pratikte kamu malı klasik YOK — bu iki dil tam özgün üretime bağımlı.
   Japonca (Aozora Bunko, 17.700+) ve İspanyolca (Cervantes Virtual,
   22.000+) çok zengin.
5. **Rakiplerin hiçbiri gerçek N×N yapmıyor** — hepsi tek kaynak dil
   (İngilizce) merkezli. Fiyat bandı $6–14/ay; mevcut ₺79,99/ay (~$2,3)
   bunun altında.

## 7. İçerik yol haritası (araştırmanın önerisi)

**Senaryo A (önerilen): 4 dille başla, ~$2.600, 6-10 hafta.**
Sıra: fr, es, de (kolay üçlü — spaCy + CEFR-eşdeğeri kelime listesi hazır,
kamu malı kaynak bol) → **tr'yi KAYNAK dil yap** (sıfır-kamu-malı
problemini zaten bilinen, kontrol edilen bir dilde çöz, yeni bir dilde
değil) → it, ru (Kiril alfabesi provası) → sonra uk, ja, zh, ar sırasıyla.

**Senaryo B: 11 dilin hepsi, ~~$15-18k, 9-14 ay.** Asıl maliyet AI
üretiminde değil (792 hikâye için ~$50-150) — ana dili konuşan
gözden geçirme (~~$11.000) ve geliştirici zamanında.

**Karar:** Senaryo A'yı seç, ama VERİ MODELİNİ Senaryo B'ye göre kur (bu
migration'ın yaptığı tam olarak bu — `languages.status` alanı 11 dilin
hepsini baştan taşıyor, birer birer `content_target`'a çevrilecek).

## 8. Bu round'da YAPILMAYANLAR (bilinçli kapsam dışı)

- Yeni bir hedef dilde gerçek kitap içeriği (yukarıdaki yol haritası ayrı
  bir proje).
- `book_surface_lemmas` / sunucu-taraflı lemmatizasyon pipeline'ı (yeni
  hedef dil eklenene kadar gerek yok).
- Seviye testinin (36 kelime) hedef dile göre genellenmesi — bugün tek
  hedef dil İngilizce olduğu için testin içeriği değişmiyor.
- RTL'nin TAM görsel QA'sı — `I18nManager` altyapısı kuruldu ve gerçek bir
  yeniden başlatma akışı var, ama reader/kütüphane ekranlarının RTL'de
  piksel piksel doğru göründüğü test edilmedi (Arapça hiçbir hedef dilde
  kitap içeriği barındırmadığı için bugün yalnızca arayüz metinlerini
  etkiliyor).
- Android'e RevenueCat/premium desteği (CLAUDE.md'de zaten bilinen borç,
  bu round'da büyümedi).
