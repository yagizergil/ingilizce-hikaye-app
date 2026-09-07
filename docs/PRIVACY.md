# Gizlilik Politikası

Son güncelleme: 7 Eylül 2026

Bu politika **İngilizce Hikaye** uygulaması için geçerlidir.

> Bu metin barındırılmalı ve URL'i App Store Connect'e girilmelidir.
> Bkz. `docs/RELEASE.md` madde 5.

---

## Kısaca

- Uygulamayı kullanmak için hesap açman gerekmiyor.
- Kişisel veri satmıyoruz, reklam ağlarıyla paylaşmıyoruz.
- Üçüncü parti analitik ya da reklam SDK'sı kullanmıyoruz.
- Verilerin Avrupa Birliği'nde (Frankfurt) barındırılıyor.
- Hesabını uygulama içinden tek dokunuşla kalıcı olarak silebilirsin.

---

## Topladığımız veriler

### Hesap

Uygulamayı ilk açtığında sana **anonim** bir hesap kimliği oluşturulur.
Bu kimlik bir isim, e-posta ya da telefon numarası içermez; yalnızca
ilerlemenin cihazlar arasında kaybolmaması içindir.

İsteğe bağlı olarak Apple ile giriş, Google ile giriş ya da e-posta ile
kayıt olabilirsin. O durumda ilgili sağlayıcının bize verdiği kimlik ve
(varsa) e-posta adresin saklanır. Apple ile giriş kullanırken e-postanı
gizlemeyi seçersen gerçek adresini hiçbir zaman görmeyiz.

### Kullanım verileri

- Hangi kitabı ve bölümü okuduğun, ne kadar ilerlediğin
- Kaydettiğin kelimeler ve bunların tekrar takvimi
- Seviye testi sonucun ve tahmini kelime dağarcığın
- Uygulama içi olaylar: hangi ekranı açtığın, hangi düğmeye bastığın,
  bir bölümün ne kadar sürede yüklendiği
- Beklenmeyen hatalar: hata mesajı ve teknik yığın izi

Bu veriler uygulamayı geliştirmek, hataları bulmak ve sana uygun kitapları
önermek için kullanılır.

### Toplamadığımız veriler

- Konum
- Rehber, fotoğraflar, takvim ya da cihazdaki diğer dosyalar
- Reklam kimliği (IDFA) — reklam göstermiyoruz, takip etmiyoruz
- Ödeme bilgileri — abonelik satın alırsan ödeme tamamen Apple üzerinden
  yapılır, kart bilgin bize hiçbir zaman ulaşmaz

---

## Verinin nerede tutulduğu

Veriler Supabase üzerinde, Amazon Web Services'in Frankfurt (eu-central-1)
bölgesinde barındırılır. Her kullanıcı yalnızca kendi satırlarına
erişebilir; bu kısıt veritabanı seviyesinde (row level security) uygulanır.

## Üçüncü taraflar

| Hizmet | Ne için | Ne paylaşılıyor |
|---|---|---|
| Supabase | Veritabanı, kimlik doğrulama | Yukarıdaki tüm veriler |
| Apple | Giriş ve abonelik | Apple'ın kendi kimlik doğrulaması |
| Google | İsteğe bağlı giriş | Google'ın kendi kimlik doğrulaması |
| RevenueCat | Abonelik durumunun takibi | Anonim hesap kimliği ve abonelik durumu |
| Anthropic | Kelime çevirisi ve AI açıklamaları | Yalnızca çevrilecek kelime/cümle metni |

Anthropic'e gönderilen metin uygulamanın kendi kitaplarından gelir;
kimliğinle ilişkilendirilmez.

Reklam ağı, veri simsarı ya da analitik satıcısı kullanmıyoruz.

## Çocuklar

Uygulama 4 yaş ve üzeri için derecelendirilmiştir ve içeriğinde yetişkin
tema bulunmaz. 13 yaşından küçük çocuklardan bilerek kişisel veri
toplamayız.

## Haklarınız

- **Silme:** Profil → Hesabı sil. Hesabın ve tüm verilerin kalıcı olarak
  silinir; geri alınamaz.
- **Erişim ve taşınabilirlik:** Verilerinin bir kopyasını istemek için
  aşağıdaki adrese yaz.
- **Düzeltme:** Seviyeni, tercihlerini ve kayıtlı kelimelerini uygulama
  içinden istediğin zaman değiştirebilirsin.

KVKK ve GDPR kapsamındaki haklarını kullanmak için bize yazabilirsin.

## Değişiklikler

Bu politika değişirse tarihi güncelleriz ve önemli değişiklikleri uygulama
içinde bildiririz.

## İletişim

<!-- LANSMAN ÖNCESİ DOLDUR: destek e-posta adresi -->
E-posta: ornek@ornek.com
