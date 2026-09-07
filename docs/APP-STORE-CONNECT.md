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
behind a paywall: 47 are public-domain works from Standard Ebooks and 38
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
