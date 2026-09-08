# Yayına Çıkış — Kalan İşler

Tarih: 2026-09-07 (denetim sonrası revizyon).

Bu belge iki bölüm: önce **dağıtılması gereken kod/veritabanı değişiklikleri**
(komutları burada, senin onayınla çalışacak), sonra **yalnızca senin
hesaplarınla yapılabilecek** işler.

---

## ÖNEMLİ DÜZELTME — önceki sürüm yanlış bir şey söylüyordu

Bu belgenin önceki hâli şöyle diyordu:

> "Şu an `user_entitlements` tablosuna istemci yazıyor. Bu, kararlı bir
> kullanıcının premium'u kendine açabileceği anlamına gelir."

**Bu doğru değildi.** `user_entitlements` migration 002'den beri
select-only RLS ile korunuyor — istemcinin yazma yolu hiç olmadı. Denetimde
canlı veritabanında doğrulandı: tabloda yalnızca bir SELECT politikası var.

Gerçek durum tersineydi ve daha kötüydü: `syncEntitlementToServer()`'ın
upsert'i RLS tarafından sessizce reddediliyor, hata `trackError`'a yazılıp
yutuluyor, `purchasePackage` yine `"success"` dönüyordu. Yani **ödeme yapan
kullanıcı premium alamıyordu.** Bu bir güvenlik açığı değil, doğrudan gelir
kaybı ve App Store red sebebiydi (Guideline 2.1/3.1.1 — satın alma sonrası
içerik açılmıyor).

Düzeltildi: bkz. CLAUDE.md ADR-009 ve aşağıdaki 1. adım.

---

# BÖLÜM A — Dağıtılacak değişiklikler

Hepsi kodda hazır, test edilmiş, typecheck/lint/test temiz. Dağıtım
komutları aşağıda; hiçbiri otomatik çalıştırılmadı.

## A1. Migration'ları uygula

```bash
npx supabase db push
```

Uygulanacak iki yeni migration:

| Migration                 | Ne yapıyor                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `028_entitlement_webhook` | `user_entitlements`'a denetim/idempotans alanları (`product_id`, `store`, `rc_event_id`, `rc_event_ms`, `is_trial`) ve `apply_entitlement_event()` fonksiyonu. RLS'ye DOKUNMUYOR — yazma yolu yalnızca service_role. |
| `029_ai_tier_limits`      | AI cümle çevirisi kotasını katmana bağlar: ücretsiz 10/gün, premium 200/gün. Öncesinde herkes için 30'du. `my_ai_sentence_quota()` ile istemci de kotayı okuyabiliyor.                                               |

> **029 canlı davranışı değiştiriyor:** ücretsiz kullanıcının günlük AI
> çeviri hakkı 30'dan 10'a iniyor. Bu bilinçli — paywall "AI destekli
> açıklamalar"ı premium faydası olarak satıyor ama kota herkes için aynıydı,
> yani satılan fayda gerçek değildi. Sayıları değiştirmek istersen tek yer:
> `public.ai_sentence_daily_limit()`.

## A2. Edge Function'ları dağıt

```bash
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```

```bash
npx supabase functions deploy translate-sentence
```

`revenuecat-webhook` JWT doğrulaması olmadan çalışır (RevenueCat'in Supabase
kullanıcısı yok); doğrulama paylaşılan sırla yapılıyor — bir sonraki adım.

## A3. Webhook sırrını üret ve iki yere yaz

Rastgele bir sır üret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sonra:

1. Supabase'e yaz:

```bash
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<ürettiğin_değer>
```

2. RevenueCat panosunda **Integrations → Webhooks → Add**:
   - **URL:** `https://lzewiwkwcshwxsfwybml.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization header:** aynı değer (birebir, `Bearer` öneki OLMADAN)
   - **Environment:** önce Sandbox ile test et, sonra Production'ı da ekle

Sır tanımlı değilse fonksiyon her çağrıyı 500 ile reddediyor — doğrulanmamış
bir çağrıyı kabul etmektense açıkça reddetmek doğru olan.

## A4. Webhook'u doğrula

RevenueCat panosundaki **Send test event** düğmesi 200 dönmeli.
Fonksiyon günlüğünde şu satırı görmelisin:

```bash
npx supabase functions logs revenuecat-webhook
```

`TEST` olayı bilgilendirici sayılıp `{"status":"ignored"}` ile geçiliyor —
bu beklenen davranış, hata değil.

Gerçek uçtan uca test için A5'teki development build gerekiyor: sandbox'ta
bir satın alma yap, `user_entitlements` satırının `tier='premium'` olduğunu
gör.

## A5. Gizlilik politikası URL'i (kodun beklediği tek yapılandırma)

Paywall'daki yasal blok App Store Guideline 3.1.2(a) gereği zorunlu ve
Gizlilik Politikası bağlantısını `EXPO_PUBLIC_PRIVACY_URL`'den okuyor. Boş
bırakılırsa paywall bağlantı yerine kırmızı bir uyarı gösteriyor (sessizce
gizlemek yerine görünür bir uyarı — bu hâliyle gönderim yapılmamalı).

`docs/PRIVACY.md` metnini herhangi bir statik sayfada barındır ve `.env`'e
ekle:

```
EXPO_PUBLIC_PRIVACY_URL=https://senin-alan-adin/gizlilik
```

Kullanım Koşulları için varsayılan Apple'ın standart EULA'sı; kendi EULA'n
varsa `EXPO_PUBLIC_TERMS_URL` ile değiştirebilirsin.

---

# BÖLÜM B — Senin hesaplarını gerektirenler

## B1. EAS projesini bağla

```bash
npx eas-cli login
```

```bash
npx eas-cli init
```

Bu komut `app.config.ts` içindeki `extra.eas.projectId` ve `updates.url`
alanlarını dolduruyor. Sonra:

```bash
npx eas-cli build --profile development --platform ios
```

**Neden gerekli:** RevenueCat native modülü Expo Go'da çalışmıyor. Satın
alma akışını test etmek için development build şart. Uygulamanın geri kalanı
Expo Go'da çalışmaya devam ediyor (kod bunu bilerek destekliyor) —
hatırlatma bildirimleri dâhil, çünkü yerel bildirim Expo Go'da çalışıyor.

## B2. RevenueCat ürünlerini tanımla

Fiyat kararı pazar araştırmasına dayanıyor (`docs/aso/03-fiyatlandirma.md`).
Kodda hiçbir fiyat gömülü DEĞİL — hepsi RevenueCat "offerings"ten geliyor.

**App Store Connect'te oluşturulacak abonelikler:**

| Ürün   | Fiyat                    | Not                                            |
| ------ | ------------------------ | ---------------------------------------------- |
| Aylık  | ₺79,99                   | Pahalı çapa; ana ürün değil                    |
| Yıllık | ₺399,99                  | Ana ürün, %58 indirim                          |
| Deneme | 7 gün, yalnızca yıllıkta | Paywall'ın birincil eylemi buna göre değişiyor |

**RevenueCat panosunda:**

1. iOS uygulamasını ekle, App Store Connect ile bağla.
2. İki ürünü ekle, tek bir "current offering" altında topla.
3. Paketleri **`$rc_annual` ve `$rc_monthly`** standart tanımlayıcılarıyla
   kur — paywall'daki plan seçici yıllığı bu tanımlayıcıdan tanıyıp ön
   seçili yapıyor ve tasarruf yüzdesini ondan hesaplıyor
   (`src/features/paywall/planModel.ts`).
4. **Entitlement adı tam olarak `premium` olmalı** — hem istemci
   (`src/lib/revenuecat.ts`) hem webhook (`revenuecat-webhook/index.ts`) bu
   adı arıyor.
5. Public SDK anahtarını `.env` içindeki
   `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` alanına yaz.

**Fiyatı kilitlemeden önce:** App Store Connect'te "Proceeds" sütununu
kontrol et. Apple komisyonu ve TR Dijital Hizmet Vergisi sonrası net gelir
orada kesin görünüyor; araştırma bu rakamı doğrulayamadı.

## B3. Kitap kapakları (Higgsfield kredisi)

63 özgün kitabın hepsinde artık uygulamanın kendi tasarım diliyle üretilmiş
**tipografik kapak** var (krem zemin, terracotta vurgu, Fraunces başlık).
Önceki kapaklar rastgele renkli bir dikdörtgen üzerinde başlığın ilk
harfiydi.

Yapay zekâ ile üretilmiş illüstrasyonlu kapaklar denendi ve sonuç iyi —
ama **Higgsfield kredisi bitti** (bakiye: 0,75, starter plan). 12 istekten
yalnızca 2'si geçti; o ikisi uygulandı
(`two-names-on-the-lease`, `the-cat-that-belonged-to-everyone`).

Kredi yüklendikten sonra kalanlar için: bana söyle, aynı palet ve
prompt şablonuyla üretip yüklerim. Elle yapmak istersen tek kitaba görsel
uygulama komutu:

```bash
cd pipeline && .venv/Scripts/python.exe scripts/refresh_covers.py --slug <slug> --image <dosya.png>
```

> **Not:** Supabase Storage CDN kapakları bir süre önbellekte tutuyor.
> Yeni kapak hemen görünmezse bu yüzden; birkaç dakika içinde geçiyor.

## B4. Ekran görüntüleri

Hâlâ yok. App Store en az 3, tercihen 6 istiyor. Önerilen sıra
`docs/aso/05-store-metinleri.md` içinde.

En kritik olan birincisi: reader'da bir kelimeye dokunulmuş ve Türkçe
karşılığı açılmış hâli. Ürünün tamamı o tek ekranda anlatılıyor.

Denetimden sonra çekilmeye değer iki yeni ekran daha var:

- **Kitap bitirme kutlaması** (`/book-finished`) — kaydedilen kelime ve
  okuma süresiyle birlikte.
- **Paywall** — yıllık plan seçili, %58 tasarruf rozeti ve deneme CTA'sı
  görünürken.

## B5. Apple Search Ads hesabı

Anahtar kelime seçimi (`docs/aso/02-anahtar-kelimeler.md`) sonuç sayısı ve
rakip yoğunluğuna dayanıyor, **gerçek arama hacmine değil**. Gerçek hacim
yalnızca Apple Search Ads hesabıyla görülebiliyor.

---

## Gönderim öncesi son kontrol listesi

- [ ] A1–A5 tamamlandı, sandbox'ta bir satın alma `tier='premium'` yazdı
- [ ] Paywall'da Kullanım Koşulları ve Gizlilik Politikası bağlantıları
      açılıyor (kırmızı uyarı görünmüyor)
- [ ] Paywall'daki her fayda maddesi üründe gerçekten çalışıyor
- [ ] "Satın alımları geri yükle" düğmesi çalışıyor
- [ ] `npm run typecheck`, `npm run lint`, `npm test` temiz
- [ ] En az 3 ekran görüntüsü yüklendi
- [ ] Gizlilik politikası URL'i hem App Store Connect'te hem `.env`'de

---

## Denetimde kapatılan işler (referans)

| İş                                                  | Durum                                                |
| --------------------------------------------------- | ---------------------------------------------------- |
| Yetki yazma zinciri (webhook + migration 028)       | Kod hazır, dağıtım bekliyor                          |
| Paywall yasal bloğu (Guideline 3.1.2(a))            | Yazıldı                                              |
| Paywall plan seçici, tasarruf rozeti, deneme CTA'sı | Yazıldı, 13 birim testi                              |
| Var olmayan fayda maddeleri                         | Kaldırıldı; AI maddesi kotayla gerçek yapıldı        |
| AI kotasının katmana bağlanması (migration 029)     | Kod hazır, dağıtım bekliyor                          |
| Yerel hatırlatma bildirimleri                       | Yazıldı, 14 birim testi                              |
| Uygulama içi puan isteme                            | Yazıldı (ikinci kitap bitişinde)                     |
| Kitap bitirme ekranı + 3. paywall tetikleyicisi     | Yazıldı                                              |
| Ana ekranda seri göstergesi                         | Yazıldı                                              |
| Kelime defteri şerit eşiği %80 → %60                | Yapıldı                                              |
| B1 içerik boşluğu                                   | Prompt + üretim betiği yazıldı, hikâyeler üretiliyor |
| Bayat test                                          | Düzeltildi                                           |
