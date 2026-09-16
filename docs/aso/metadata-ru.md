# App Store Metadata — Rusça (ru)

**Tarih:** 15 Eylül 2026
**Pazar:** Rusça konuşulan App Store bölgeleri (KZ, AM, GE, IL, DE/US
diasporası). **Rusya Federasyonu App Store'unda ödeme altyapısı sorunlu
olduğu için premium dönüşümü bu dilde düşük beklenmelidir** — ama ücretsiz
katman tamamen çalışıyor ve dil çifti mimarisi (ADR-013) zaten Rusça'yı
kapsıyor, yani lokalizasyonun marjinal maliyeti sıfıra yakın.

---

## 1. Anahtar kelime araştırması — ru pazarına özgü

1. **`английский` (İngilizce) tek başına devasa bir terim** — Rusça'da
   "İngilizce öğren" demeden sadece "английский" aramak çok yaygın. Busuu
   ve Beelinguapp ikisi de Rusça başlıklarını bu kelime etrafında yeniden
   yazmış (`Busuu: учи английский и другие`, `Beelinguapp: учи английский`).
2. **`по книгам` / `по фильмам` kalıbı** ("kitaplarla", "filmlerle")
   Rusça'da yöntem belirten yerleşik bir arama biçimi ve doğrudan bizim
   konumlandırmamız. Diğer dillerde bu kalıbın karşılığı yok.
3. **Kiril dışı arama nadir** — Latin harfli `english` araması Rusça
   kullanıcıda düşük; alanı Kiril'e ayırmak doğru.
4. **LingQ, Rusya pazarında galerisini lokalize ETMEMİŞ** (ölçüldü:
   `ru` için varsayılan İngilizce kareler) — okuma odaklı en yakın rakip
   bu pazarda görsel olarak zayıf.

| Terim                  | Rekabet                     | Alaka | Karar                            |
| ---------------------- | --------------------------- | ----- | -------------------------------- |
| `английский по книгам` | Çok düşük                   | 1,00  | **Başlıkta**                     |
| `читать на английском` | Düşük                       | 1,00  | **Altyazıda**                    |
| `английский язык`      | Aşırı                       | 0,70  | Kısmen (başlıktaki `английский`) |
| `книги на английском`  | Düşük                       | 1,00  | Alan                             |
| `слова английский`     | Orta                        | 0,85  | Alan                             |
| `словарь`              | Yüksek                      | 0,85  | Alan                             |
| `классика`             | Düşük                       | 1,00  | Alan                             |
| `изучение языков`      | Aşırı (Busuu, EWA başlıkta) | 0,60  | **Hedeflenmiyor**                |

---

## 2. Başlık — 30 karakter

```
Английский по книгам
```

**20/30 karakter.**

Kiril karakterler Latin'e göre daha geniş render ediliyor; arama sonucu
şeridinde 20 karakter zaten kesilmeden görünen üst sınıra yakın. Daha uzun
bir başlık okunabilirlik kaybettirirdi.

## 3. Altyazı — 30 karakter

```
Читай и переводи по словам
```

**26/30 karakter.**

"Kelime kelime oku ve çevir" — ürünün çekirdek mekaniğinin birebir tarifi.

## 4. Anahtar kelime alanı — 100 karakter

```
чтение,рассказы,истории,слова,словарь,классика,роман,уровень,перевод,a1,a2,b1,b2,c1,офлайн,аудио
```

**96/100 karakter.**

`английский`, `книгам`, `читай`, `переводи` başlık/altyazıda olduğu için
tekrarlanmadı. Seviye kodları (`a1`–`c1`) bilinçli Latin — CEFR kodları
Rusça'da da Latin yazılıyor.

## 5. Promosyon metni — 170 karakter

```
Теперь на 10 языках. Читай рассказ на английском, нажми на незнакомое слово и увидь перевод на русском. Все книги бесплатны, во время чтения нет рекламы.
```

**153/170 karakter.**

## 6. Açıklama — 4000 karakter sınırı

```
Приложение для чтения тем, кто учит английский.
Нажми на незнакомое слово — перевод откроется сразу.
Задержи палец на предложении и увидишь перевод целиком.

НАЧНИ СО СВОЕГО УРОВНЯ
Если только начинаешь, есть короткие рассказы уровня A1 и A2, которые
дочитываешь за один раз: по 6-8 минут, написанные для этого приложения.
Дальше идут рассказы B1 примерно на 20 минут, а оттуда — классика мировой
литературы. Ступень нигде не обрывается. Короткий тест на словарный запас
в начале подскажет, откуда начать.

УЧИТЬСЯ ВО ВРЕМЯ ЧТЕНИЯ
Нажми на слово — появится перевод. Послушать произношение слова всегда
бесплатно. Сохраняй слова, которые хочешь запомнить: приложение вернёт их
в тот день, когда ты начинаешь их забывать, вместе с предложением, где ты
встретил слово впервые. Вспоминать, а не зубрить.

КНИГИ ВСЕГДА БЕСПЛАТНЫ
Все книги, все главы, чтение без ограничений. Без рекламы. Во время чтения
ты никогда не увидишь ни прерывания, ни баннера, ни предложения подписки.

ЧТО ВХОДИТ В БЕСПЛАТНУЮ ВЕРСИЮ
- Все 119 книг, чтение без ограничений
- 15 переводов слов в день
- 10 переводов предложений с ИИ в день
- Словарная тетрадь на 100 слов
- Интервальное повторение, без ограничений
- Статистика чтения
- Произношение слов, без ограничений
- Чтение офлайн

ЧТО ДОБАВЛЯЕТ PREMIUM
- Студийная озвучка для 63 оригинальных рассказов, произносимое слово
  подсвечивается в тексте. У классики озвучки нет.
- Переводы слов без ограничений (дневной лимит в 15 снимается)
- Словарная тетрадь без ограничений
- 200 переводов предложений с ИИ в день
- Вторая языковая пара (первая пара всегда бесплатна)

НА 10 ЯЗЫКАХ
Интерфейс и значения слов работают на русском, английском, турецком,
немецком, французском, итальянском, испанском, арабском, китайском и
японском. На каком бы языке ты уже ни говорил, ты можешь читать
английский через него.

ЧТО ВНУТРИ
- 119 книг и рассказов
- из них 63 оригинальных рассказа по уровням (A1, A2 и B1)
- 56 классических произведений (от B1 до C2)
- Английский словарь на 26 000 слов
- Перевод предложений
- Чтение офлайн
- Тёмная тема, шрифт и размер текста настраиваются

Классические произведения взяты из источников, срок авторских прав на
которые истёк и которыми каждый может свободно пользоваться. Рассказы по
уровням написаны для этого приложения.
```

## 7. "Yenilikler" — ilk sürüm

```
Первая версия. 119 книг, словарь на 26 000 слов и 63 оригинальных
рассказа от A1 до B1, чтобы начать со своего уровня.
```

## 8. Kategori ve yaş

| Alan              | Değer       |
| ----------------- | ----------- |
| Birincil kategori | Образование |
| İkincil kategori  | Книги       |
| Yaş sınırı        | 4+          |

## 9. Dürüstlük sınırları

- Seslendirme 63 özgün hikâyede, klasiklerde YOK — açıkça yazıldı.
- SRS, istatistik ve telaffuz ücretsiz listede.
- "10 языках" arayüz/karşılık dili; "10 dilde kitap" denmedi.
- Sosyal kanıt ve sayısal etkinlik iddiası yok.
- Ödeme altyapısı kısıtı bir metadata sorunu değil; premium vaatleri
  yazıldığı gibi doğru, yalnızca dönüşüm beklentisi düşük tutulmalı.
