# App Review yanıtı — Submission ID 843665c6-dd45-42b0-8ffe-25b0cb2e0675

Aşağıdaki metin App Store Connect > Resolution Center'a **aynen** kopyalanacak.

**Göndermeden önce:**

1. Açıklamadaki EULA bağlantısının kayıtlı ve canlı olduğunu doğrula.
2. Her iki aboneliğin durumunun "Missing Metadata" OLMADIĞINI doğrula.
3. **Ekran kaydını ekle** — Apple açıkça istedi. Kayıtta şunlar görünmeli:
   uygulama açılışı → Profil sekmesi → Premium ekranı → kaydırmadan
   görünen fiyat, süre, otomatik yenileme metni ve iki bağlantı → bir
   bağlantıya dokunup açıldığını göster.
4. Ürün kimliklerini kendi ASC'ndeki değerlerle değiştir (aşağıda köşeli
   parantez içinde bırakıldı).

---

Hello,

Thank you for the detailed review notes. We have addressed both items and
uploaded a new binary: version 1.0, build 8.

**Guideline 3.1.2(c) — Terms of Use (EULA)**

App Store metadata:

- The App Description now contains a functional link to the standard Apple
  Terms of Use (EULA):
  https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- The Privacy Policy URL field in App Store Connect is filled in with a
  functional link.

Inside the app:

The subscription purchase screen already contained every required element in
the reviewed build, but they were not all visible at once. The screen's
content extended below the visible area on the review device (iPad Air
11-inch) and the scroll indicator was hidden, so the lower portion — which
contained the Terms of Use and Privacy Policy links — could only be reached
by scrolling. We believe this is why the links appeared to be absent.

In build 8, the purchase button and the legal block are no longer inside the
scrollable area. They are pinned to the bottom of the screen and remain
visible at all times, on every device size. Without any scrolling, the
purchase screen now shows:

- The title of each auto-renewing subscription (Yearly and Monthly)
- The length of each subscription
- The price of each subscription, and the price per month for the yearly plan
- A clear statement that the subscription renews automatically until cancelled
- A functional link to the Terms of Use (EULA)
- A functional link to the Privacy Policy

How to reach this screen: launch the app, open the Profile tab in the bottom
tab bar, and tap the Premium row. No account, login, or demo credentials are
required — the app creates an anonymous session on first launch, so the
purchase screen is reachable immediately after installing.

A screen recording of this screen is attached to this message.

**Guideline 2.1(b) — In-App Purchase products**

Both auto-renewable subscriptions have now been completed and submitted for
review, and both are attached to this app version:

- [monthly product ID]
- [yearly product ID]

For both products we have provided the localized display name and
description, pricing, the subscription group configuration, and the required
App Review screenshot. To the best of our knowledge no required field is left
empty and neither product is in a "Missing Metadata" state.

**One request**

Could you please review these in-app purchase products together with this
build? We have run into the same situation with another one of our apps,
where the binary was evaluated while the subscriptions were not reviewed
alongside it, which produced this same 2.1(b) outcome again on resubmission.
Reviewing them together would let us resolve this in a single cycle.

If any required element is still missing after this build, we would be
grateful if you could name the specific element and where you expected to see
it — for example which field in App Store Connect, or which screen in the
app. We will correct it immediately.

Thank you for your time.

Best regards,
Yağız Ergil
