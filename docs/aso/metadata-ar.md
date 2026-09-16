# App Store Metadata — Arapça (ar)

**Tarih:** 15 Eylül 2026
**Pazar:** Suudi Arabistan, BAE, Mısır, Ürdün ve diğer Arapça App Store bölgeleri

---

## 0. En büyük fırsat bu dilde

`rakip-arastirmasi.md` §1'de ölçüldü: **incelenen 7 rakibin 7'si de** (
Duolingo, Busuu, Memrise, LingQ, Beelinguapp, Readle, EWA) Arapça pazarda
**ne başlığını ne de galeri görsellerini lokalize etmiş.** Hepsi varsayılan
İngilizce metadatayı gösteriyor.

Bizim için bunun anlamı: **Arapça başlık + Arapça altyazı + Arapça galeri
ile bu kategoride ilk uygulamalardan biri olacağız.** Ve maliyeti sıfıra
yakın, çünkü arayüz zaten Arapça ve RTL gerçek onboarding akışında devrede
(CLAUDE.md, 2026-09-14 oturumu).

**Bu, 10 dil içinde ASO getirisi/maliyet oranı en yüksek olan dildir.**

---

## 1. Anahtar kelime araştırması — ar pazarına özgü

Arapça arama davranışının dört ayırt edici özelliği:

1. **Harekeler (تشكيل) asla yazılmıyor.** Arama terimleri harekesiz
   yazılmalı — aşağıdaki metinlerin hiçbirinde hareke yok.
2. **`ال` (belirlilik takısı) arama eşleşmesini bozuyor.** `الإنجليزية` ve
   `إنجليزية` ayrı terim gibi davranıyor; anahtar kelime alanında **takısız**
   form tercih edildi, başlıkta doğal olan takılı form kullanıldı.
3. **Hemze varyasyonu (`إ` / `ا` / `أ`).** Kullanıcılar sıklıkla `انجليزي`
   diye sade elif ile yazıyor. Bu, Türkçe'deki şapkasız yazım sorununun
   birebir karşılığı ve ayrı terim gibi davranıyor — **iki varyant da**
   alana yazıldı.
4. **`تعلم الإنجليزية` mutlak baskın kalıp**, ama rakipler Arapça'da hiç
   metadata yazmadığı için bu terimde bile rekabet düşük.

| Terim                                 | Rekabet                         | Alaka | Karar              |
| ------------------------------------- | ------------------------------- | ----- | ------------------ |
| `تعلم الإنجليزية` (İngilizce öğren)   | Düşük (rakipler lokalize değil) | 0,80  | **Başlıkta**       |
| `قراءة بالإنجليزية` (İngilizce okuma) | Çok düşük                       | 1,00  | **Başlık+altyazı** |
| `قصص إنجليزية` (İngilizce hikâyeler)  | Çok düşük                       | 1,00  | Alan               |
| `انجليزي` (sade elif varyantı)        | Düşük                           | 0,80  | Alan               |
| `ترجمة` (çeviri)                      | Yüksek                          | 0,85  | Altyazıda          |
| `قاموس` (sözlük)                      | Yüksek                          | 0,85  | Alan               |
| `مفردات` (kelime dağarcığı)           | Orta                            | 0,90  | Alan               |
| `روايات` (romanlar)                   | Düşük                           | 1,00  | Alan               |

---

## 2. Başlık — 30 karakter

```
تعلم الإنجليزية بالقراءة
```

**24/30 karakter.** ("Okuyarak İngilizce öğren")

Baskın kalıbı (`تعلم الإنجليزية`) alıp yöntemi (`بالقراءة` = okuyarak)
ekliyor. Rakipler Arapça başlık yazmadığı için bu kalıpta doğrudan
yarışacak kimse yok.

## 3. Altyazı — 30 karakter

```
قصص متدرجة وترجمة فورية
```

**23/30 karakter.** ("Seviyeli hikâyeler ve anında çeviri")

## 4. Anahtar kelime alanı — 100 karakter

```
انجليزي,مفردات,قاموس,روايات,كلاسيكيات,مستوى,كلمات,نطق,a1,a2,b1,b2,c1,صوتي,بدون انترنت,مجاني
```

**91/100 karakter.**

- `انجليزي` bilinçli **sade elif** ile (başlıktaki `الإنجليزية` hemzeli ve
  takılı formdur, ayrı eşleşiyor).
- `قصص`, `ترجمة`, `متدرجة`, `القراءة` başlık/altyazıda olduğu için
  tekrarlanmadı.
- CEFR kodları Latin — Arapça'da da Latin yazılıyor.

> **Yükleme uyarısı.** Arapça karakterler UTF-8'de 2 bayt. Apple'ın anahtar
> kelime alanı **karakter** sayıyor (bayt değil), yani 91 karakter geçerli
> olmalı. Yine de App Store Connect yükleme anında sayacı **gözle
> doğrulanmalı** — alan reddederse `كلاسيكيات` (9 karakter) çıkarılacak ilk
> terimdir, çünkü `روايات` zaten benzer niyeti yakalıyor.

## 5. Promosyon metni — 170 karakter

```
الآن بعشر لغات. اقرأ قصة بالإنجليزية، انقر على أي كلمة لا تعرفها وشاهد معناها بالعربية. كل الكتب مجانية ولا توجد إعلانات أثناء القراءة.
```

**135/170 karakter.**

## 6. Açıklama — 4000 karakter sınırı

```
تطبيق قراءة لمن يتعلم الإنجليزية.
انقر على كلمة لا تعرفها، فيظهر معناها في الحال.
اضغط مطولًا على جملة لترى ترجمتها كاملة.

ابدأ من مستواك أنت
إن كنت في البداية، هناك قصص قصيرة بمستوى A1 وA2 تنهيها في جلسة واحدة: من
ست إلى ثماني دقائق لكل قصة، كُتبت خصيصًا لهذا التطبيق. ثم تأتي قصص بمستوى
B1 في نحو عشرين دقيقة، ومنها إلى روائع الأدب العالمي. الدرجات متصلة ولا
تنقطع في أي نقطة. اختبار مفردات قصير في البداية يدلّك من أين تبدأ.

تعلّم أثناء القراءة
انقر على كلمة فيظهر معناها. الاستماع إلى نطق الكلمة مجاني دائمًا. احفظ
الكلمات التي تريد الاحتفاظ بها، وسيعيدها التطبيق إليك في اليوم الذي تبدأ
فيه بنسيانها، مع الجملة التي التقيت بها فيها أول مرة. تذكّر، لا حفظ عن
ظهر قلب.

الكتب مجانية دائمًا
كل الكتب، كل الفصول، قراءة بلا حدود. بلا إعلانات. لن ترى أثناء القراءة أي
مقاطعة أو لافتة أو عرض اشتراك.

ما تتضمنه النسخة المجانية
- كل الكتب المئة والتسعة عشر، قراءة بلا حدود
- خمس عشرة ترجمة كلمة في اليوم
- عشر ترجمات جُمل بالذكاء الاصطناعي في اليوم
- دفتر كلمات يتسع لمئة كلمة
- التكرار المتباعد، بلا حدود
- إحصاءات القراءة
- نطق الكلمات، بلا حدود
- القراءة دون اتصال بالإنترنت

ما يضيفه Premium
- تعليق صوتي بجودة الاستوديو على ثلاث وستين قصة أصلية، مع تمييز الكلمة
  المنطوقة داخل النص. الأعمال الكلاسيكية ليس لها تعليق صوتي.
- ترجمة كلمات بلا حدود (يزول حد الخمس عشرة كلمة يوميًا)
- دفتر كلمات بلا حدود
- مئتا ترجمة جملة بالذكاء الاصطناعي في اليوم
- زوج لغات ثانٍ (الزوج الأول مجاني دائمًا)

بعشر لغات
تعمل الواجهة ومعاني الكلمات بالعربية والإنجليزية والتركية والألمانية
والفرنسية والإيطالية والإسبانية والروسية والصينية واليابانية. أيًّا كانت
اللغة التي تعرفها، يمكنك قراءة الإنجليزية من خلالها.

ما في الداخل
- مئة وتسعة عشر كتابًا وقصة
- منها ثلاث وستون قصة أصلية مقسّمة حسب المستوى (A1 وA2 وB1)
- ستة وخمسون عملًا كلاسيكيًا (من B1 إلى C2)
- قاموس إنجليزي يضم ستة وعشرين ألف كلمة
- ترجمة الجمل
- القراءة دون اتصال
- سمة داكنة، وضبط نوع الخط وحجمه

الأعمال الكلاسيكية مأخوذة من مصادر انتهت مدة حقوق النشر فيها ويمكن لأي
شخص استخدامها بحرية. أما القصص المتدرجة فقد كُتبت خصيصًا لهذا التطبيق.
```

## 7. "Yenilikler" — ilk sürüm

```
الإصدار الأول. مئة وتسعة عشر كتابًا، وقاموس بستة وعشرين ألف كلمة، وثلاث
وستون قصة أصلية من A1 إلى B1 لتبدأ من مستواك.
```

## 8. Kategori ve yaş

| Alan              | Değer            |
| ----------------- | ---------------- |
| Birincil kategori | التعليم (Eğitim) |
| İkincil kategori  | الكتب (Kitaplar) |
| Yaş sınırı        | 4+               |

## 9. Dürüstlük sınırları ve RTL notları

- Seslendirme 63 özgün hikâyede, klasiklerde YOK — açıkça yazıldı.
- SRS, istatistik ve telaffuz ücretsiz listede.
- "بعشر لغات" arayüz/karşılık dili; "10 dilde kitap" denmedi.
- Sosyal kanıt ve sayısal etkinlik iddiası yok.
- **Sayılar metinde yazıyla verildi** (`مئة وتسعة عشر`, `ثلاث وستون`).
  Gerekçe: Arapça metin içinde Batı Arap rakamları (119, 63) RTL akışını
  görsel olarak kırıyor ve App Store açıklama alanı çift yönlü metin
  sıralamasını her zaman doğru render etmiyor. CEFR kodları (A1, B1) ise
  Latin bırakıldı — onlar uluslararası kod, çevrilmez.
- **Galeri görselleri için:** `screenshot-plani.md`'deki RTL kuralları
  (cihaz mockup'ı sağdan sola, metin sağa hizalı) uygulanmalı.
