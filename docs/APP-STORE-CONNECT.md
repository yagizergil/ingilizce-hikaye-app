# App Store Connect — gönderim formu cevapları

> Bu dosya App Store Connect'te elle doldurulması gereken her alanın
> **kopyalanabilir** cevabını içerir. Cevaplar uydurma değil; her biri
> koddan doğrulandı ve nereden geldiği yazıyor.
>
> Son güncelleme: 7 Eylül 2026 · Uygulama Apple ID: `6809447042`

---

## 1. Gönderimi engelleyen hatalar ve karşılıkları

Gönderim sayfasındaki "Unable to Add for Review" listesi:

| Hata                        | Çözüm                                                            | Durum                              |
| --------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| Privacy Policy URL gerekli  | `https://yagizergil.github.io/ingilizce-hikaye-app/privacy.html` | Sayfa hazır, GitHub Pages açılmalı |
| You must choose a build     | `eas build` + `eas submit`                                       | Derleme gerekiyor                  |
| Contact Information eksik   | Bölüm 4                                                          | Aşağıda                            |
| App Privacy doldurulmamış   | Bölüm 3                                                          | Aşağıda                            |
| Price tier seçilmemiş       | Bölüm 5                                                          | Aşağıda                            |
| English (U.S.) Support URL  | `https://yagizergil.github.io/ingilizce-hikaye-app/support.html` | Sayfa hazır                        |
| Turkish Support URL         | Aynı URL                                                         | Sayfa hazır                        |
| Screenshot dimensions wrong | `store/iap-promo-*.png` (1024×1024)                              | Üretildi                           |

---

## 2. Metin alanları

**Support URL** (hem Turkish hem English (U.S.) için aynı):

```
https://yagizergil.github.io/ingilizce-hikaye-app/support.html
```

**Marketing URL** (isteğe bağlı ama boş bırakmayın, ürün sayfasında görünür):

```
https://yagizergil.github.io/ingilizce-hikaye-app/
```

**Copyright** (200 karakter sınırı — sadece yıl ve sahip):

```
2026 Yağız Ergil
```

**Version**: `1.0` (App Store Connect'te zaten böyle; `app.config.ts`
içindeki `version` da `1.0.0` yapıldı, ikisi eşleşiyor.)

---

## 3. App Privacy — soru soru cevaplar

App Store Connect → App Privacy → "Get Started".

### 3.1 Veri topluyor musunuz?

**Evet** ("Yes, we collect data from this app").

### 3.2 Toplanan veri türleri

Aşağıdaki beş kutuyu işaretleyin, diğerlerini BOŞ bırakın.

#### Contact Info → Email Address

- Toplanıyor mu: **Evet**
- Neden: **App Functionality**
- Kimlikle ilişkili mi: **Evet** (Linked to the user)
- Takip için kullanılıyor mu: **Hayır**

> Gerekçe: e-posta yalnızca kullanıcı isteğe bağlı olarak e-posta ya da
> Google ile kaydolursa saklanıyor. Apple ile girişte kullanıcı e-postasını
> gizlerse gerçek adres hiç gelmiyor. Anonim kullanımda e-posta yok — ama
> Apple "hiç toplanmıyor" demenizi kabul etmiyor, isteğe bağlı toplama da
> toplamadır.

#### Identifiers → User ID

- Toplanıyor mu: **Evet**
- Neden: **App Functionality**, **Analytics**
- Kimlikle ilişkili mi: **Evet**
- Takip için kullanılıyor mu: **Hayır**

> Gerekçe: uygulama ilk açılışta anonim bir Supabase hesap kimliği
> oluşturuyor (okuma ilerlemesi cihazlar arasında kaybolmasın diye) ve
> telemetri olayları bu kimlikle yazılıyor.

> **Device ID işaretlemeyin.** Uygulama IDFA/IDFV okumuyor; reklam kimliği
> hiç kullanılmıyor.

#### Purchases → Purchase History

- Toplanıyor mu: **Evet**
- Neden: **App Functionality**
- Kimlikle ilişkili mi: **Evet**
- Takip için kullanılıyor mu: **Hayır**

> Gerekçe: RevenueCat abonelik durumunu tutuyor ve webhook `user_entitlements`
> tablosuna yazıyor. Kart bilgisi hiç gelmiyor — ödeme tamamen Apple'da.

#### Usage Data → Product Interaction

- Toplanıyor mu: **Evet**
- Neden: **Analytics**, **App Functionality**
- Kimlikle ilişkili mi: **Evet**
- Takip için kullanılıyor mu: **Hayır**

> Gerekçe: hangi ekranın açıldığı, hangi kitabın okunduğu, bölümün ne
> kadar sürede yüklendiği `telemetry_events` tablosuna yazılıyor
> (`src/lib/analytics.ts`).

#### Diagnostics → Crash Data, Performance Data

- Toplanıyor mu: **Evet**
- Neden: **App Functionality**, **Analytics**
- Kimlikle ilişkili mi: **Evet**
- Takip için kullanılıyor mu: **Hayır**

> Gerekçe: `trackError` beklenmeyen hataları yığın iziyle birlikte
> kaydediyor; reader'ın ilk boyama süresi ölçülüyor.

### 3.3 İŞARETLENMEYECEKLER

Bunların hiçbiri toplanmıyor — kutuları boş bırakın:

- Location (hassas ya da kaba) — konum hiç okunmuyor
- Health & Fitness
- Financial Info — kart bilgisi hiç gelmiyor
- Contacts, Photos, Audio, Videos, Files
- Search History, Browsing History
- Device ID, Advertising Data
- Sensitive Info

### 3.4 Tracking

**"Bu uygulama kullanıcıları takip ediyor mu?" → HAYIR.**

Uygulamada reklam ağı, veri simsarı, üçüncü parti analitik SDK'sı ve IDFA
erişimi yok. Bu yüzden App Tracking Transparency izni de istenmiyor.

---

## 4. Contact Information (App Review)

App Store Connect → App Review Information:

| Alan         | Değer                                      |
| ------------ | ------------------------------------------ |
| First Name   | Yağız                                      |
| Last Name    | Ergil                                      |
| Phone Number | _(kendi numaranız — Apple gerekirse arar)_ |
| Email        | etkinlikyweb@gmail.com                     |

**Sign-in required:** **HAYIR.** Uygulama anonim hesapla açılıyor, giriş
duvarı yok. Bu kutu işaretlenirse Apple demo hesap ister ve olmadığı için
reddedilir.

**Attachment:** `store/review-attachment.png`

**Review Notes** (kopyalayın):

```
The app requires no account. It creates an anonymous session on first
launch and opens straight into the library.

All 85 books are free for every user. Nothing in the reading experience is
behind a paywall: 46 are public-domain works from Standard Ebooks and 39
are original graded stories we wrote ourselves. Content rights are covered
by public domain status and our own authorship.

To test the core loop:
1. Library tab, open any book, open a chapter.
2. Tap an English word: a sheet shows the Turkish meaning, part of speech
   and pronunciation.
3. Long-press a sentence for an AI translation.
4. Save a word, then open the Words tab to review it with spaced repetition.

The subscription is reached from the Profile tab, Subscription row. It is
never shown inside the reading screen. Premium adds unlimited saved words,
unlimited spaced repetition, a higher AI translation quota and detailed
statistics; it unlocks no book and gates no reading.

The interface is Turkish; the reading content is English. This is
intentional: the app teaches English to Turkish speakers.
```

---

## 5. Pricing and Availability

- **Price:** Free (Try 0,00)
- **Availability:** Tüm ülkeler ve bölgeler
- Abonelikler ayrı ürünler olarak zaten tanımlı:
  - `com.ingilizcehikaye.app.premium.yearly` — ₺399,99 / yıl
  - `com.ingilizcehikaye.app.premium.monthly` — ₺79,99 / ay

> Uygulama ücretsiz, gelir abonelikten. Ücretli bir fiyat basamağı seçmek
> ücretsiz katmanı ortadan kaldırır ve ürün ilkesine aykırı olur.

---

## 6. In-App Purchase tanıtım görselleri

App Store Connect → Subscriptions → ilgili abonelik → Promotional Image.

| Abonelik       | Dosya                         |
| -------------- | ----------------------------- |
| Premium Yıllık | `store/iap-promo-yearly.png`  |
| Premium Aylık  | `store/iap-promo-monthly.png` |

Her ikisi de Apple'ın şartlarını sağlıyor: 1024×1024, PNG, 72 dpi, RGB,
düzleştirilmiş (alfa kanalı yok), yuvarlak köşe yok.

---

## 7. GitHub Pages'in açılması (gizlilik ve destek URL'leri için ŞART)

Sayfalar depoda `docs/` altında hazır ama yayında değil. Depo **private**
olduğu sürece GitHub Pages ücretsiz katmanda çalışmaz.

1. `https://github.com/yagizergil/ingilizce-hikaye-app/settings` → en altta
   **Change repository visibility** → **Public**.
2. `Settings → Pages` → Source: **Deploy from a branch**, Branch: `main`,
   Klasör: `/docs` → Save.
3. Birkaç dakika sonra doğrulayın:
   - `https://yagizergil.github.io/ingilizce-hikaye-app/privacy.html`
   - `https://yagizergil.github.io/ingilizce-hikaye-app/support.html`

> Depoyu public yapmadan önce gizli anahtar taraması yapıldı: `.env` ve
> `pipeline/.env` gitignore'da, depoda gerçek bir JWT / `sk-ant-` /
> `appl_` anahtarı yok. Supabase anon anahtarı zaten herkese açık olacak
> şekilde tasarlanmış (RLS ile korunuyor) ve bundle'a gömülü.
>
> Depoyu private tutmak isterseniz sayfaları başka bir yerde barındırmak
> gerekir (Netlify/Vercel ücretsiz katmanı ya da GitHub Pro).

---

## 8. RevenueCat webhook sırrı — GELİR BLOKÖRÜ

**Bu adım yapılmadan kullanıcı ödeme yapar ama premium AÇILMAZ.**

Doğrulandı (7 Eylül 2026): `revenuecat-webhook` Edge Function dağıtılmış
durumda ama beklediği `REVENUECAT_WEBHOOK_SECRET` ortam değişkeni
tanımlı değil. Fonksiyona atılan her istek şu anda `500 not_configured`
dönüyor — yani RevenueCat'in gönderdiği bütün satın alma bildirimleri
reddediliyor.

Zincir neden böyle kurulu (ADR-009): `user_entitlements` tablosunda
**hiçbir yazma politikası yok** (doğrulandı: 1 policy, 0 write policy).
İstemci premium'u kendine açamaz; yalnızca service_role ile çalışan
webhook açabilir. Bu, ödeme doğrulamasının istemciye bırakılmaması için
bilinçli bir tasarım — ama zincirin ilk halkası kurulmazsa hiç premium
verilmiyor.

### Yapılacaklar

Aşağıdaki sır bu oturumda üretildi; iki yere de AYNI değeri yazın.

```
rcwh_hec-wn6ss7l_TBuBO7hnQCHHaOxFlHPcihLmA1RSRGXzKD6y
```

**1. Supabase tarafı**

Supabase Dashboard → Project Settings → Edge Functions → Secrets →
Add new secret:

| Name                        | Value            |
| --------------------------- | ---------------- |
| `REVENUECAT_WEBHOOK_SECRET` | yukarıdaki değer |

**2. RevenueCat tarafı**

RevenueCat Dashboard → Project Settings → Integrations → Webhooks → Add:

| Alan                 | Değer                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| Webhook URL          | `https://lzewiwkwcshwxsfwybml.supabase.co/functions/v1/revenuecat-webhook` |
| Authorization header | yukarıdaki değer                                                           |
| Event types          | Tümü (fonksiyon ilgilenmediklerini zaten yok sayıyor)                      |

**3. Doğrulama**

Sır yazıldıktan sonra:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://lzewiwkwcshwxsfwybml.supabase.co/functions/v1/revenuecat-webhook" -H "Content-Type: application/json" -d "{}"
```

- `500` dönerse: sır hâlâ tanımlı değil.
- `401` dönerse: **doğru** — sır tanımlı ve yetkisiz istek reddediliyor.

Ardından RevenueCat'teki "Send test event" ile gerçek bir olay gönderip
`user_entitlements` tablosuna satır düştüğünü kontrol edin.

---

## 9. Kalan manuel adımlar — özet

| #   | Adım                                                                         | Kim           |
| --- | ---------------------------------------------------------------------------- | ------------- |
| 1   | `REVENUECAT_WEBHOOK_SECRET` (Supabase + RevenueCat)                          | Siz — bölüm 8 |
| 2   | Depoyu public yapıp GitHub Pages'i aç                                        | Siz — bölüm 7 |
| 3   | `npx eas-cli build --platform ios --profile production` (Apple girişi ister) | Siz           |
| 4   | App Privacy formu                                                            | Siz — bölüm 3 |
| 5   | Contact Information + Review Notes                                           | Siz — bölüm 4 |
| 6   | Pricing: Free                                                                | Siz — bölüm 5 |
| 7   | Support/Marketing URL + Copyright                                            | Siz — bölüm 2 |
| 8   | IAP tanıtım görselleri                                                       | Siz — bölüm 6 |
| 9   | Kalan 2 ekran görüntüsü (8/10 yüklü)                                         | Siz           |
