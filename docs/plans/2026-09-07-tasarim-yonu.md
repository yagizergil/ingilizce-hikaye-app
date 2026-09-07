# Tasarım Yönü — "Gür Raf, Sessiz Sayfa"

Tarih: 2026-09-07
Kapsam: tasarım sistemi ve tüm ekranların yeniden tasarımı.

> Kararlar `cct-ui-ux-pro-max` skill'inin stil/tipografi/renk aramalarıyla
> ve `docs/aso/` altındaki rakip araştırmasıyla alındı.

---

## 1. Mevcut tasarımın sorunu

Geri bildirim: *"çok kötü, bayık, iç boğan"*. Bu doğru bir teşhis ve sebebi
tek cümleyle söylenebilir:

**Okuma ekranı için doğru olan stil, uygulamanın tamamına uygulanmış.**

Skill'in stil veritabanında bu stilin adı var: **E-Ink / Paper** — mat
kâğıt, yüksek kontrast, tek renk, hareketsiz. "Reading apps, minimal
journals, distraction-free writing" için ideal. Ama aynı kural kütüphaneye,
ana sayfaya, profile ve kelime defterine de uygulanınca ortaya cansız bir
liste yığını çıkıyor.

Ölçülebilir belirtiler:

| Belirti | Kanıt |
|---|---|
| Renk var ama kullanılmıyor | `levelAccent` altı renk tanımlıyor, `categoryTagColors` altı renk daha — hepsi yalnızca 20 piksellik rozetlerde |
| Dolgu yok | Her ayrım `border.hairline`; kart, blok, dolu yüzey yok |
| Accent kilitli | `colors.ts` yorumu: *"Reserved for status/progress only... NEVER decorative"* — kendi kendine konmuş bu kural tasarımın enerjisini alıyor |
| Tipografik kontrast düşük | Ekran başlığı 30px, bölüm başlığı 20px, kitap adı 21px — hepsi birbirine yakın, hiyerarşi düz |
| Hareket yok | Basma durumu, ilerleme animasyonu, kutlama anı yok |

Skill'in eğitim/dil kategorisi için listelediği **anti-pattern'ler tam
olarak bunlar: "Boring design", "No motivation"**.

---

## 2. Yeni yön

**Gür raf, sessiz sayfa.**

Kütüphane, ana sayfa, kelime defteri ve profil **gür**: renkli bloklar,
büyük tipografi, dolu yüzeyler, ilerleme enerjisi. Okuma ekranı **sessiz**
kalıyor: kâğıt, mürekkep, hiçbir şey.

Bu zıtlık kusur değil, ürünün imzası. Kullanıcı canlı bir raftan bir kitap
seçiyor ve sessiz bir sayfaya giriyor — fiziksel kitapçı deneyiminin
karşılığı. Ayrıca ürün ilkesi #1'i (okuma ekranında dikkat dağıtıcı yok)
ihlal etmek yerine **güçlendiriyor**: reader'ın sessizliği artık bir eksik
değil, bilinçli bir kontrast.

Skill'in karşılığı: raf tarafında **Exaggerated Minimalism** (devasa
tipografi, yüksek kontrast, tek canlı vurgu, cömert boşluk) + **Vibrant &
Block-based** (blok düzen, yüksek renk kontrastı, ilerleme göstergeleri);
sayfa tarafında **E-Ink / Paper** aynen kalıyor.

---

## 3. Renk

Zemin değişmiyor — sıcak kâğıt (#FAF8F4) hem markanın hem okumanın doğru
zemini. Değişen, o zeminin üstünde ne olduğu.

### Eklenen: yapısal ikinci renk

Tek accent (terracotta) her şeyi taşımaya çalışıyordu. Yanına derin bir
mürekkep-lacivert geliyor:

| Rol | Açık tema | Koyu tema | Ne için |
|---|---|---|---|
| `ink` (mevcut) | `#1E1C19` | `#F3F1EA` | Metin |
| `accent` (mevcut) | `#A6572E` | `#D08A5C` | Birincil eylem, ilerleme |
| **`deep`** (yeni) | `#1F3A5F` | `#8FB4DE` | Yapısal bloklar, öne çıkan yüzeyler |
| **`highlight`** (yeni) | `#F1E4C9` | `#3A3020` | Yumuşak vurgu dolgusu |

### Serbest bırakılan: seviye renkleri

`levelAccent` altı seviye rengi zaten var ve doğru seçilmiş (A1 mavi →
C2 mor, ısınan bir skala). Bunlar artık yalnızca rozet değil, **kitap
kartlarının ve bölüm başlıklarının kimliği**. Kullanıcı kütüphaneye
baktığında seviyeleri renkten okuyabiliyor — rakiplerin hiçbirinde olmayan
bir okunabilirlik (`docs/aso/01-rakipler.md`: hepsi seviyeleme iddia ediyor,
hiçbiri seviyeyi görsel bir sisteme çevirmiyor).

### "NEVER decorative" kuralı kalkıyor

Accent artık dekoratif de kullanılabiliyor. Yerine gelen kural daha
yararlı: **okuma yüzeyinde (reader) accent yok.** Kısıt kalkmadı, doğru
yere taşındı.

---

## 4. Tipografi

Fraunces zaten karakterli bir seçim; sorun küçük kullanılması. Ölçek
yukarı çekiliyor ve kademeler arası fark açılıyor:

| Rol | Eski | Yeni | Not |
|---|---|---|---|
| Ekran başlığı | 30 | **40** | Negatif harf aralığı ile |
| Hero başlık | 28 | **34** | |
| Bölüm başlığı | 20 | **24** | |
| Kitap adı (büyük) | 21 | 21 | Değişmiyor — liste yoğunluğu bozulmasın |
| Eyebrow (mono) | 11 | 11 | Harf aralığı 0.08 → **0.14em** |

IBM Plex Mono kalıyor — veri ve etiket için gerçekten ayırt edici bir
seçim. Ama daha cesur kullanılıyor: büyük harf eyebrow'lar, geniş aralık,
sayılarda `tabular-nums`.

Okuma tipografisi (`readingType`) **hiç değişmiyor**. Literata ve okuma
ölçeği doğru; oraya dokunmak ürünün en iyi parçasını bozmak olur.

---

## 5. Düzen

| Eski | Yeni |
|---|---|
| Hairline ile ayrılmış düz listeler | Dolgulu, yuvarlatılmış kartlar |
| Tek yüzey rengi | Yüzey + seviye renkli bloklar |
| Bölümler arası 28px | Bölümler arası **40px** |
| Gölge yok, radius 6 | Gölge yok (korunuyor), radius **6 / 14 / 20** kademeli |

Gölge bilerek gelmiyor: mockup sisteminin düzlüğü korunuyor, derinlik
gölgeyle değil **renkle** kuruluyor. Bu hem daha az AI-üretimi görünüyor
hem de kâğıt metaforuyla tutarlı.

---

## 6. Hareket

Şu an sıfır. Ekleniyor, ama ölçülü:

- Basma durumu: 150ms opacity + hafif ölçek (kart ve düğmelerde)
- İlerleme çubuğu: değer değişince 300ms yumuşak geçiş
- Bölüm bitirme: tek seferlik kutlama anı
- `prefers-reduced-motion` her yerde saygı görüyor

---

## 7. Değişmeyecek olanlar

- Reader'ın kendisi (yazı tipi, ölçek, renk, sessizlik)
- Okuma ekranında paywall/promosyon yasağı
- i18n zorunluluğu
- Erişilebilirlik: 4.5:1 kontrast, 44px dokunma hedefi, ekran okuyucu
  etiketleri

---

## 8. Uygulanan değişiklikler

### Token katmanı
- `deep` / `onDeep` / `highlight` renk rolleri üç temaya da eklendi
- `accent`'in "ASLA dekoratif değil" kuralı kaldırıldı, yerine "okuma
  yüzeyinde accent yok" kuralı kondu
- Ekran başlığı 30 → **40px**, hero 28 → **34px**, bölüm başlığı 20 → **24px**
- Mono eyebrow/label harf aralığı .06em → **.14em**, ağırlık 400 → 500
- `motion.pressed` (opacity + scale) ve `spacing.sectionGap` (40px) eklendi

### Bileşenler
- **`Card`** — yeni; dolgulu blok, dört ton (surface/highlight/deep/accent)
- **`FilterTab`** — alt çizgiden **dolu hap**a; seçili sekme artık görünür
- **`Button`** — `primary` mürekkep siyahından **accent**e; `neutral` varyantı
  eklendi; köşeler yuvarlatıldı
- **`StatCell`** — kenarlıklı kutudan **dolu bloğa**, `tabular-nums` ile
- **`ProfileAccountRow`** — dokunulabilir satırlara chevron

### Ekranlar
- **Ana sayfa** — `HomeHero` eklendi: derin lacivert blok, seviye noktası,
  büyük başlık, tek net eylem. Gerçek veriyle çalışıyor (yarım kalmış kitap
  ve ilerleme yüzdesi ya da seviyeye göre keşif)
- **Kütüphane / Keşfet** — kitap satırları **karta** dönüştü, sol kenarda
  **seviye rengi şeridi**; hairline ayırıcılar boşluğa dönüştü
- **Kelimelerim** — kelime satırları aynı kart + şerit dilini konuşuyor
- **Profil** — istatistikler dolu 2×2 blok, hesap satırları kart içinde

### Doğrulama
Dört sekme de `expo start --web` üzerinde mobil boyutta (375×812) açık
temada görsel olarak kontrol edildi. Reader'ın sessizliği korunuyor —
metin yüzeyinde accent yok. (Reader gövdesi web'de boş görünüyor; native
metin ölçümüne dayalı sayfalama react-native-web'de çalışmıyor, tasarım
kaynaklı değil.)

typecheck, lint ve 77 test temiz.
