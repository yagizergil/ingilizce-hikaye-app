# Onboarding tasarımı — ölçülmüş spec

**Tarih:** 2026-09-14
**Referans:** Bookvo onboarding akışı (`docs/reference/bookvo-*.jpeg`)
**Kural:** Bookvo'nun AKIŞI ve ÖLÇÜLERİ; bizim RENKLERİMİZ ve FONTLARIMIZ.

## Ölçüm yöntemi

Ölçüler `scripts/measure-reference.py` ile piksel olarak çıkarıldı, gözle
tahmin edilmedi. Bu araç tam olarak şu yüzden yazıldı: `WordSheet.tsx`
içindeki "FAZ 5 DÜZELTMESİ" / "FAZ 9 DÜZELTMESİ" yorumları, ölçülerin daha
önce gözle tahmin edilip sonra düzeltildiğini gösteriyor.

**Ölçek:** görüntüler 945×2048 px. Kart kenarı 38–41 px ölçüldü; bu
yalnızca 393 pt genişlikte (iPhone 15/16 Pro) yuvarlak bir değer veriyor
(16 pt). Dolayısıyla **1 pt = 2.4046 px**.

| Öğe | Ölçülen | Uygulanan | Not |
| --- | --- | --- | --- |
| Ekran kenar boşluğu | 38–41 px → 15.8–17.1 pt | **16 pt** | Kart dış kenarı |
| Üst ilerleme çubuğu yüksekliği | 10 px → 4.2 pt | **4 pt** | Track `#E9E9E9` → bizde `border.hairline` |
| İlerleme çubuğu üst konumu | y=161 px → 67 pt | safe area + 8 pt | |
| Kart köşe yarıçapı | 29 px → 12.1 pt | **12 pt** | `radius.md` |
| Kart iç padding | 39 px → 16.2 pt | **16 pt** | |
| Kartlar arası boşluk | 25–28 px → 10.4–11.6 pt | **12 pt** | |
| Rozet boyutu | 105 px → 43.7 pt | **44×44 pt** | |
| Rozet köşe yarıçapı | 24 px → 10.0 pt | **12 pt** | Ölçüm 10; token skalasında 12 en yakın (`radius.md`) |
| Rozet → metin boşluğu | 38 px → 15.8 pt | **16 pt** | |
| Alt düğme yüksekliği | 116 px → 48.2 pt | **48 pt** | |
| Alt düğme köşesi | yarıçap ≈ yükseklik/2 | **pill (24 pt)** | +38 px'te hâlâ kavisli → tam pill |
| Alt düğme alt boşluğu | 121 px → 50.3 pt | safe area + 16 pt | 34 (home indicator) + 16 |
| Kart yüksekliği | DEĞİŞKEN (190–205 px) | içerik + 16 pt padding | Sabit yükseklik YOK — alt başlık 1 ya da 2 satır olabiliyor |

**Kart yüksekliğinin sabit olmaması önemli:** ölçümde kart aralıkları
221–236 px arasında değişiyordu; sabit bir satır yüksekliği verseydik
uzun alt başlıklar kırpılırdı.

## Renk eşlemesi (Bookvo → bizim)

Bookvo açık tema + mor vurgu kullanıyor; biz koyu temamızı ve terracotta
vurgumuzu koruyoruz. Eşleme:

| Bookvo | Bizde |
| --- | --- |
| Sayfa zemini `#F8F8F8` | `theme.bg.primary` (`#12151C`) |
| Kart `#FFFFFF` | `theme.bg.surface` (`#1E222C`) |
| Kart kenarı (açık gri hairline) | `theme.border.hairline` (`#2A2E3A`) |
| Vurgu / seçili / dolu çubuk `#5F62E7` | `theme.accent` (`#C77B4A`) |
| Başlık koyu metin | `theme.text.primary` |
| Alt başlık gri | `theme.text.secondary` |
| Pasif düğme `#8C8C8C` | `theme.bg.surface` + `text.secondary` |

Fontlar: başlık/etiket **Nunito** (mevcut `type`/`monoType` skalası),
okuma metni **Literata** (değişmedi).

## Akış

Referans sıralaması (`bookvo-04` … `bookvo-15` dosya adlarındaki numara):

1. **Splash** — referansta yok, bizim eklediğimiz. Marka, kısa.
2. **Karşılama** — referansta yok. Kısa tanıtım + "Başla".
3. **Ana dil seçimi** — bizim eklediğimiz (Bookvo tek dilli).
4. **Hedef dil seçimi** — bizim eklediğimiz.
5. **Seviye seçimi** (`bookvo-04`) — kendi beyanıyla seviye.
6. Kitap zevki (`bookvo-05`)
7. İlk okuma (`bookvo-06`, `06b`)
8. Kelime kartı (`bookvo-07`)
9. Kelime alıştırması (`bookvo-08`)
10. İlk 3 kelime kutlaması (`bookvo-09`)
11. Günlük hedef (`bookvo-10`)
12. İlerleme grafiği (`bookvo-11`)
13. Plan oluşturuluyor (`bookvo-12`)
14. Sosyal kanıt (`bookvo-13`)
15. Paywall (`bookvo-14`) → başarılı (`bookvo-15`)

### Bu turda yapılanlar

1–5 (splash, karşılama, ana dil, hedef dil, seviye) + ayarlardaki
geliştirici düğmesi.

### Bu turda YAPILMAYANLAR ve nedenleri

- **6–10 (kitap zevki, ilk okuma, kelime alıştırması):** her biri yeni bir
  etkileşim mekaniği; ayrı bir tur.
- **14 (sosyal kanıt):** referansta gerçek kullanıcı yorumları, isimleri ve
  fotoğrafları var. Bunları UYDURMAK olmaz — sahte yorum, sahte puan ve
  sahte kullanıcı fotoğrafı hem yanıltıcı hem App Store Guideline 2.3.1
  ihlali. Gerçek yorumlarımız olduğunda eklenir.
- **12–13 (grafik, plan animasyonu):** 11'e kadar olan adımlar oturmadan
  yapılırsa boşa iş olur.
