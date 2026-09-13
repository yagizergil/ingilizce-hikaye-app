# App Review yanıtı — Submission 6acaaaa2-27c2-470a-b8ec-c3670e1b6e2e (1.0 build 8, Guideline 2.1(b))

Göndermeden önce App Store Connect'te üçünü de doğrula; aşağıdaki
"We confirmed..." paragrafı ancak üçü de doğruysa gönderilmeli:

1. Business > Agreements: **Paid Apps Agreement = Active** (vergi + banka tamam).
2. Monetization > Subscriptions: `com.ingilizcehikaye.app.premium.monthly` ve
   `com.ingilizcehikaye.app.premium.yearly` durumu **Ready to Submit** ya da
   **Waiting for Review** — "Missing Metadata" / "Developer Action Needed" /
   "Rejected" DEĞİL. Grup yerelleştirmesi de dolu olmalı.
3. Sürüm sayfası (1.0) > "In-App Purchases and Subscriptions": iki abonelik
   de **yeni build ile birlikte gönderime ekli**.

Build numarasını gönderdiğin build'le eşleştir.

---

Hello,

Thank you for the review. We investigated the issue on the reported configuration and uploaded a new binary: version 1.0, build 9.

What we found

Our diagnostics from the review session showed that the App Store returned none of the subscription products to the app, so the purchase screen had nothing to display. The products are configured correctly on our subscription platform; the cause was on the App Store Connect side.

We confirmed that the Paid Apps Agreement is active, that both auto-renewable subscriptions (Premium Monthly and Premium Yearly) are complete and in "Ready to Submit" status, and that both are attached to this submission.

What we changed in the app

While investigating, we also fixed two issues in the purchase flow:

1. On a fresh install, the purchase could be recorded before the user's account was linked to it, which could prevent Premium from unlocking after a successful purchase. The account is now always linked before any purchase or restore.
2. If the store did not respond in time, the purchase screen showed a permanent "no packages" message. The app now retries automatically and offers a "Try again" button.

How to test

Open the app, go to the Profile tab and tap Premium. Both plans are shown with their prices, and a sandbox purchase unlocks Premium features such as studio narration on story detail pages. No login is required; the app creates an anonymous account automatically.

Thank you for your patience.
