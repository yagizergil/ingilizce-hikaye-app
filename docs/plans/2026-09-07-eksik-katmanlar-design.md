# Eksik Üç Katman — Tasarım

Tarih: 2026-09-07
Kapsam: onboarding + seviye tespiti, SRS tekrar motoru, abonelik + paywall.

> Bu belge yayın öncesi denetimin ÜRN-01/02/03 bulgularına cevap veriyor.
> Kararlar burada gerekçesiyle sabitlendi; uygulama bunu takip ediyor.

## Ortak zemin: şema zaten hazır

Üç katmanın da tabloları canlı veritabanında mevcut ve boş. Bu, tasarımı
büyük ölçüde kısıtlıyor — ve iyi yönde, çünkü sıfırdan şema tartışmasına
girmeden mevcut şeklin gerektirdiği kararlar alınabiliyor:

| Katman | Var olan tablo | Ne söylüyor |
|---|---|---|
| Onboarding | `profiles.target_level`, `profiles.onboarding_completed_at`, `profiles.daily_goal_minutes` | Seviye kullanıcıya ait bir tercih; onboarding'in bittiği an kayıtlı |
| Seviye tespiti | `user_vocabulary_estimate(estimated_size, cefr_level, method)` | Ölçüm bir kelime dağarcığı BÜYÜKLÜĞÜ tahmini; `method` alanı birden fazla ölçüm yönteminin bir arada yaşayacağını varsayıyor |
| SRS | `srs_cards(ease, interval_days, repetitions, lapses, stability, difficulty)` | Hem SM-2 (ease/interval/repetitions) hem FSRS (stability/difficulty) alanları var — algoritma seçimi açık bırakılmış |
| Abonelik | `user_entitlements(tier, expires_at, source)` | Yetki sunucuda tutuluyor, `source` sağlayıcıyı ("revenuecat") kaydediyor |

Sonuç: **üç katman için de yeni tablo gerekmiyor.** Yalnızca ücretsiz
katman sınırını sunucuda zorlamak için tek bir kısıt eklenecek.

---

## 1. Onboarding + seviye tespiti

### Değerlendirilen üç yaklaşım

**A. Okuduğunu anlama testi.** Kısa metin + çoktan seçmeli sorular.
En doğru sonucu verir ama her seviye için soru yazılması gerekir, 5-8
dakika sürer ve ilk açılışta terk oranını yükseltir. Reddedildi:
onboarding'in işi kullanıcıyı ölçmek değil, kullanıcıyı ilk kitabına
ulaştırmak.

**B. Kendi beyanı.** "Başlangıç / orta / ileri" üç düğme. 10 saniye sürer
ama Türk kullanıcıların kendi İngilizce seviyesini sistematik olarak
yanlış tahmin ettiği bilinen bir olgu — genelde düşük beyan eder ve
sıkılır, ya da yüksek beyan eder ve bunalır.

**C. Kelime tanıma testi (seçildi).** Ekranda tek tek İngilizce kelimeler;
kullanıcı "Biliyorum / Emin değilim / Bilmiyorum" der. CEFR bantlarından
örneklenmiş 36 kelime, 60-90 saniye. Kelime dağarcığı büyüklüğü tahmini
dil öğretiminde yerleşik bir yöntem (Meara'nın Yes/No testi ailesi) ve
—kritik olarak— **veri zaten elimizde**: `lemma_canonical` içinde 7.135
kelime CEFR seviyesiyle etiketli.

### Neden C, ve bilinen zayıflığı

C'nin bilinen sorunu şişirme: insanlar bilmedikleri kelimeye "biliyorum"
der. Klasik çözüm sözde-kelimeler (pseudowords) serpiştirmektir; bunun
için üretilmiş bir liste yok ve üretmek ayrı bir iş. Bunun yerine:

- Üç seçenekli cevap kullanılıyor ("Emin değilim" ayrı bir sinyal).
- Puanlama muhafazakâr: "Emin değilim" 0,5 ağırlık alıyor.
- Sonuç bir HÜKÜM değil, bir BAŞLANGIÇ NOKTASI olarak sunuluyor —
  kullanıcı sonucu tek dokunuşla değiştirebiliyor.

Bu, spec'lenmiş bir davranışa düşmek demek (ADR-008'in mantığı):
ölçüm yanılırsa kullanıcı düzeltir, uygulama kırılmaz.

### Akış

1. **Karşılama** — ne yaptığımızı bir cümlede söyle, "Başlayalım" ve
   "Şimdi değil" (test atlanabilir; `target_level` boş kalır, kütüphane
   varsayılan sıralamayla açılır).
2. **Test** — 36 kelime, 6 CEFR bandından 6'şar, karışık sırada. Her
   kelime tek başına, büyük punto, üç düğme. İlerleme çubuğu.
3. **Sonuç** — "Tahminimiz: B1 · yaklaşık 2.400 kelime". Seviye bir
   segment kontrolüyle değiştirilebilir.
4. **İlk kitap** — o seviyeye uygun 3 kitap önerisi (`coverage_*`
   sütunlarına göre sıralı). Biri seçilince doğrudan reader'a.

### Puanlama

Her CEFR bandına bilinen kelime oranı hesaplanır. Tahmini dağarcık =
Σ (band oranı × bandın toplam kelime sayısı). Seviye = bilinme oranı
%80'in altına ilk düşen bandın bir altı. Yöntem `method` alanına
`yes_no_v1` olarak yazılır, böylece ileride yöntem değişirse eski
ölçümler ayırt edilebilir.

---

## 2. SRS tekrar motoru

### Algoritma: SM-2, FSRS değil

`srs_cards` her ikisinin alanlarını da taşıyor, yani seçim serbest.
**SM-2 seçildi.** Gerekçe: FSRS ölçülebilir biçimde daha iyi planlama
yapar ama parametre uydurma (parameter fitting) için binlerce tekrar
verisi ister — bugün 0 satır var. Veri olmadan FSRS'i varsayılan
parametrelerle çalıştırmak SM-2'ye göre net bir kazanç sağlamaz, ama
karmaşıklığı bugünden ödetir. `stability`/`difficulty` sütunları boş
kalıyor; yeterli tekrar verisi biriktiğinde geçiş yapılabilir ve şema
buna hazır.

### Kart üretimi

Kullanıcı okurken kelime kaydettiğinde (`user_saved_words`) **aynı işlemde**
bir `srs_cards` satırı üretilir, `due_at = now()`. Yani kaydedilen kelime
o gün tekrar kuyruğuna girer. Ayrı bir "karta dönüştür" adımı yok —
denetimde tespit edilen "kaydedilen kelimeler ölü veri" sorununun kaynağı
tam olarak bu eksik bağlantıydı.

### Değerlendirme: 3 düğme

Anki'nin 4 düğmesi yeni kullanıcıyı zorluyor. Üç seçenek:
**Bilmedim (0) · Zor (3) · Kolay (5)**. SM-2 formülü aynen uygulanır;
0 puanda kart başa döner ve `lapses` artar.

### Tekrar ekranı

Kelime → (dokun) → Türkçe karşılık + kelimenin ilk görüldüğü cümle
(`user_saved_words.context_text`). Bağlam kritik: kelimeyi kendi
hikâyesinden hatırlamak, izole ezberden çok daha güçlü.

Günlük hedef `profiles.daily_goal_minutes` üzerinden değil kart sayısı
üzerinden gösterilir; süre hedefi okuma için, kart sayısı tekrar için
doğru birim.

---

## 3. Abonelik ve paywall

### Ücretsiz katmanın sınırı: kayıtlı kelime sayısı

Ürün ilkesi #2 ücretsiz katmanın gerçekten kullanılabilir olmasını
istiyor; ilke #1 okuma ekranında paywall yasaklıyor. İkisini birden
sağlayan tek sınır türü, okuma akışını kesmeyen bir sınırdır.

**Karar: ücretsiz katmanda en fazla 100 kayıtlı kelime.** Tekrar sayısı
sınırlanmıyor — kaydettiğin 100 kelimeyi sınırsız tekrar edebilirsin.
Okuma hiçbir şekilde sınırlanmıyor: tüm kitaplar, tüm bölümler, offline
önbellek dahil ücretsiz.

100 sayısı keyfi değil: bir kullanıcının kelime defteri o boyuta ulaştığında
ürünü düzenli kullanıyor demektir, yani teklifi görmeye hazırdır. Daha düşük
bir sınır ücretsiz katmanı sakatlar, daha yüksek bir sınır teklifi hiç
görünmez kılar. Telemetri (ÖLÇ-01) bu sayıyı ölçümle ayarlamamızı sağlayacak.

### Paywall nerede DURMAZ

- Reader ekranının hiçbir yerinde.
- Kelime kaydetme sheet'inde. Sınır dolduğunda gösterilen şey nötr bir
  bilgi: "Kelime defterin dolu (100/100). Kelimelerim'den yer açabilirsin."
  Yükseltme çağrısı YOK — bu ekran okuma akışının içinde.

### Paywall nerede DURUR

1. **Kelimelerim sekmesi** — defter %80 dolduğunda üstte sakin bir şerit.
2. **Profil** — kalıcı "Premium" satırı.
3. **Kitap bitirme ekranı** — okuma akışının DIŞI, kutlama anı.

### RevenueCat entegrasyonu

- Fiyatlar ve paketler koda gömülmez; RevenueCat "offerings" üzerinden
  gelir. Fiyat değişikliği uygulama güncellemesi gerektirmez.
- Satın alma sonrası `customerInfo.entitlements` okunur ve
  `user_entitlements` tablosuna yazılır (`source = 'revenuecat'`).
- Sunucu tarafı doğrulama RevenueCat webhook'u ile yapılır; istemcinin
  yazdığı satır güvenilir kabul EDİLMEZ — sınır zorlaması sunucuda,
  `user_saved_words` üzerindeki bir tetikleyicide.
- Geri yükleme (restore) düğmesi zorunlu (App Store kuralı).

### Sınırın sunucuda zorlanması

İstemci sayımına güvenilemez. `user_saved_words` üzerine bir `before
insert` tetikleyicisi: kullanıcının `user_entitlements.tier` değeri
`free` ise ve satır sayısı 100'e ulaştıysa hata döner. İstemci bu hatayı
yakalayıp nötr mesajı gösterir.

---

## Uygulama sırası

1. SRS motoru (saf fonksiyon + testler) — bağımlılığı yok.
2. Kelime kaydetme → kart üretme bağlantısı.
3. Tekrar ekranı ve Kelimelerim sekmesine giriş noktası.
4. Seviye testi (veri sorgusu + ekranlar + sonuç yazımı).
5. Onboarding akışı ve ilk kitap önerisi.
6. Ücretsiz katman sınırı (migration + tetikleyici + istemci mesajı).
7. RevenueCat entegrasyonu ve paywall ekranı.

Fiyat kararı 7. adıma kadar gerekmiyor; pazar araştırması o zamana
tamamlanmış olacak.
