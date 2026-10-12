# Dönüşüm hunisi analizi (2026-10-12)

Salt okunur analiz. Kaynak: `analytics_events`, `profiles`, `user_entitlements`,
`ai_usage`, `user_language_pairs` (Supabase lzewiwkwcshwxsfwybml). Kod/veri değiştirilmedi.

## Varsayımlar

- **Kohort** = son 30 günde oluşturulan `profiles` satırları (anonim hesap = kurulum/ilk açılış vekili). n=205; son 7 gün n=80.
- **Hariç tutulanlar:** `user_entitlements.source in ('manual_dev_grant','manual_grant')`, `display_name ilike 'elif%'`, ve `app_version` içinde `dev` geçen olay gönderen her kullanıcı (1.0.0-dev / 0.1.0-dev).
- Olaylar kullanıcı bazında tekilleştirildi (bool_or). `purchase_completed` deneme başlangıçlarını da içeriyor (16 = 11 deneme + 5 doğrudan).
- Apple/Meta/TikTok kurulum sayıları DB'de yok; profil oluşmadan kopanlar görünmez (huni "auth"tan başlar).
- Ülke verisi kaydedilmiyor; dil çifti vekil olarak kullanıldı. App version kırılımı kohort için anlamlı değil (30 günde 139 kullanıcı 1.0.7'de, 1.0.9/1.0.10 yeni).
- Edge function logları yalnızca 24 saatlik pencerede sorgulanabildiği için 30 günlük çeviri hata oranı çıkarılamadı.

## 1. Huni (kohort, kullanıcı)

| Adım                                 | 30 gün | % kohort | 7 gün              | %   |
| ------------------------------------ | ------ | -------- | ------------------ | --- |
| Profil (auth)                        | 205    | 100      | 80                 | 100 |
| Ana dil seçildi                      | 178    | 87       | 67                 | 84  |
| Hedef dil seçildi                    | 171    | 83       | 61                 | 76  |
| Favori kitaplar kaydedildi           | 120    | 59       | –                  | –   |
| Onboarding tamamlandı                | 132    | 64       | 48                 | 60  |
| Onboarding paywall'u görüldü         | 121    | 59       | 48 (tüm kaynaklar) | 60  |
| Paywall reddedildi (dismiss)         | 94     | 46       | –                  | –   |
| Plan seçildi                         | 20     | 9.8      | 8                  | 10  |
| Satın alma denendi (tamam+iptal)     | 29     | 14       | ~13                | –   |
| Satın alma iptal (StoreKit sheet'te) | ~14    | –        | 7                  | –   |
| purchase_completed (deneme dahil)    | 16     | 7.8      | 6                  | 7.5 |
| trial_started                        | 11     | 5.4      | 3                  | 3.8 |

`user_entitlements` (dahili hariç, tüm zamanlar): ücretli aktif 7 (5 aylık, 2 yıllık), aktif deneme 3, sona ermiş/dönmemiş deneme 6 (5 trial=true free + 1 premium-expired), 1 iptal yıllık.

Paywall görünmesi medyan **2 dakika** (onboarding sonunda).

## 2. Aktivasyon (30 gün kohort, n=205)

| Davranış                                | Kullanıcı | %   |
| --------------------------------------- | --------- | --- |
| Ana sayfa                               | 129       | 63  |
| Kitap detayı                            | 92        | 45  |
| Okuyucu açtı (chapter_first_paint)      | 83        | 40  |
| Bölüm sonuna ulaştı                     | 20        | 9.8 |
| Kelime çevirisi (word_lookup, ai_usage) | 54        | 26  |
| Cümle çevirisi                          | 90        | 44  |
| Günlük 15 kelime kotasını doldurdu      | 16        | 7.8 |

Tutunma (herhangi bir olay, kohorta göre uygun olanlar): **D1 23/194 = %11.9, D3 9/180 = %5.0, D7 2/133 = %1.5**; kayıttan sonra herhangi bir gün geri dönen 41 (%20).

## 3. Paywall

Görüntüleme (kullanıcı, 30 gün, dahili hariç): onboarding 122, audio 27, word_quota 16 (79 görüntüleme), profile 15, word_quota_badge 9, language_pair 8, reader_listen 4.

| Kaynak     | Plan seçti | Tamamlandı    | İptal |
| ---------- | ---------- | ------------- | ----- |
| onboarding | 15         | 10 (8 deneme) | 9     |
| audio      | 3          | 1             | 5     |
| word_quota | 3          | 2             | 1     |
| profile    | 2          | 3             | 1     |

- Plan seçimi: aylık 18 kullanıcı / yıllık 10 (yıllık ön seçili olmasına rağmen); tamamlanan: yıllık 11 (çoğu deneme), aylık 5.
- Restore: 2 kullanıcı; `paywall_packages_retry`: 2 kullanıcı (3).
- Okuyucuyu açıp onboarding dışında **hiç paywall görmeyen 40 kullanıcı** (okuyucu açanların ~%48'i).
- Hatalar: "payment is pending/deferred" 4 kullanıcı; RevenueCat "issue with your configuration" 4 kullanıcı / 45 olay; "problem with the App Store" 1.

## 4. Kota

Kullanıcı-gün dağılımı (word_lookup): 1–3: 24, 4–9: 19, 10–14: 6, 15 (limit): 17. Limiti dolduran 16 kullanıcının **16'sı** sonrasında word_quota paywall'unu gördü; bu kaynaktan 2 satın alma (+1 deneme).
Cümle çevirisi (kotasız): 90 kullanıcı, 520 çağrı — kelime kotasına takılan kullanıcıdan fazla kişi sınırsız AI cümle çevirisini ücretsiz kullanıyor. Ayrıca `live_word_translation` 89 kullanıcı / 585 çağrı, `word_lookup` ise yalnızca 54 kullanıcı: canlı çeviri yolunun kota sayacına girip girmediği doğrulanmalı (olası kota kaçağı).

## 5. Değeri engelleyen hatalar

| Hata (client_error)                             | Kullanıcı | Olay |
| ----------------------------------------------- | --------- | ---- |
| `[object Object]` (serileştirilmemiş hata)      | 15        | 69   |
| `missing_ios_api_key` (RevenueCat anahtarı yok) | 10        | 122  |
| Notifications.cancelAll... not available        | 9         | 113  |
| RevenueCat configuration error                  | 4         | 45   |
| payment pending/deferred                        | 4         | 4    |
| homeMetrics / quizMetrics is not defined        | 1+1       | –    |

`missing_ios_api_key` gerçek kullanıcılarda: bu kişiler için paketler yüklenemez, satın alma imkânsız. Hangi build'ten geldiği kontrol edilmeli (web/Expo Go olabilir). `onboarding_rtl_restart` 23 kullanıcı (Arapça yön değişimi; Arapça kohort 10+4+3).

## 6. Dil çifti

Aktif çift (kohort): tr>en 73 (%~47), ja>en 13, ar>en 10, tr>de 8, zh>en 5, ar>fr/en>fr/tr>es 4'er, kalan ~40 dağınık. Ücretli/deneme dönüşümü kohortta yalnızca tr>en'de ve birkaç tekil çiftte; ja/ar/zh>en kullanıcılarından dönüşüm yok. Reklamlar TR hedefli olsa da kohortun yarısı Türkçe olmayan arayüzle geliyor (organik/yanlış hedef).

## En büyük 5 sızıntı (tahmini etki)

1. **Onboarding paywall'u: 121 görüntüleme → 20 plan seçimi (%17).** ~100 kullanıcı daha uygulamayı denemeden 2. dakikada teklif reddediyor. Değer gösterilmeden sert teklif; %5 iyileşme ≈ +6 deneme/ay.
2. **Tutunma çöküşü: D1 %12, D7 %1.5.** Paywall'u reddeden 94 kişinin neredeyse hiçbiri geri dönmüyor, dolayısıyla ikinci teklif şansı yok. Etki: ~150 kullanıcı/ay ilk günden sonra kayıp.
3. **Okuyucuya giriş ve bölüm bitirme:** onboarding'i bitiren 132'nin 83'ü okuyucuyu açıyor, yalnızca 20'si bir bölümü bitiriyor. Ana değer (okuma) deneyimlenmiyor → ~110 kullanıcı aktivasyon öncesi kayıp.
4. **StoreKit sheet'inde iptal: 29 denemeden ~14 iptal (%48); audio kaynağında 5 iptal / 1 tamamlanma.** Fiyat şoku veya deneme bilgisinin sheet'te görünmemesi (aylık seçenler denemesiz). Plan seçimlerinin çoğu aylık (18) → deneme yok. ~10–14 sıcak alıcı kaybı.
5. **Ücretsiz katmanın premium'u ikame etmesi + teknik engeller:** 90 kullanıcı kotasız cümle çevirisi alıyor, kota yalnızca 16 kişiye değiyor; okuyucu kullananların 40'ı hiç paywall görmüyor. Buna ek olarak `missing_ios_api_key`/config hataları 10–14 kullanıcıda satın almayı imkânsız kılıyor. ~10–15 potansiyel dönüşüm.

Diğer: kohortun ~%50'si Türkçe-dışı çift; bu trafik dönüşmüyor (reklam/ASO hedefleme kontrolü).
