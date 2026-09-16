# App Store Metadata — İngilizce (en)

**Tarih:** 15 Eylül 2026 · **Pazar:** en-US (varsayılan lokalizasyon)
**Not:** `en` aynı zamanda App Store'un **varsayılan** lokalizasyonu.
Lokalize edilmemiş her pazar (ölçüme göre rakiplerin tamamında `sa`, ve
çoğunda `tr`) bu metni görüyor. Yani bu dosya yalnızca ABD/İngiltere için
değil, **fallback** olarak da çalışıyor — en geniş ve en nötr yazılmalı.

---

## 1. Anahtar kelime araştırması — en pazarına özgü

İngilizce arama davranışı Türkçe'den iki noktada ayrışıyor: (a) kullanıcı
"learn english" demek yerine doğrudan **yöntemi** arıyor (`graded readers`,
`comprehensible input`, `extensive reading`), (b) ürün kategorisi terimi
(`reader`, `ebook`) genel e-okuyucularla çarpışıyor ve alaka düşürüyor.

| Terim                               | Rekabet (ölçüm)          | Alaka | Karar                                 |
| ----------------------------------- | ------------------------ | ----- | ------------------------------------- |
| `graded readers`                    | Çok düşük (1 ağır rakip) | 1,00  | **Altyazıda** — en iyi fırsat         |
| `english story` / `english stories` | Yüksek (8)               | 0,95  | **Başlıkta**                          |
| `learn english reading`             | Yüksek (10)              | 0,90  | Alan                                  |
| `learn english stories`             | Orta (4)                 | 0,95  | Başlık+altyazı bileşimi kapsıyor      |
| `tap to translate`                  | Düşük (tahmin)           | 0,95  | Alan                                  |
| `extensive reading`                 | Düşük (tahmin)           | 1,00  | Alan                                  |
| `classic books`                     | Düşük                    | 1,00  | Alan                                  |
| `vocabulary builder`                | Orta (6)                 | 0,70  | Alan                                  |
| `spaced repetition`                 | Orta                     | 0,85  | Alan (özellik ücretsiz ve gerçek)     |
| `learn english`                     | Aşırı                    | 0,70  | **Hedeflenmiyor**                     |
| `reader`                            | Aşırı (e-okuyucular)     | 0,50  | **Hedeflenmiyor** — alaka uyumsuzluğu |

**Karar:** `graded readers` ekseni alınıyor. Ölçümde bu terim için
≥1.000 yorumlu yalnızca **1** rakip var ve alaka tam. Geniş
`learn english` ekseni Duolingo/Babbel'e bırakılıyor.

---

## 2. Başlık — 30 karakter

```
English Stories: Read & Learn
```

**29/30 karakter.**

## 3. Altyazı — 30 karakter

```
Graded Readers, Tap to Learn
```

**28/30 karakter.**

`graded readers` — ölçülen en düşük rekabetli yüksek alakalı terim.

## 4. Anahtar kelime alanı — 100 karakter

```
reading,vocabulary,translate,dictionary,classics,novel,level,a1,a2,b1,b2,c1,esl,offline,audiobook
```

**97/100 karakter.**

Başlık/altyazıdaki kelimeler (`english`, `stories`, `read`, `learn`,
`graded`, `tap`) tekrarlanmadı.

## 5. Promosyon metni — 170 karakter

```
Now in 10 languages. Read an English story, tap any word you don't know, see it in your own language. Every book is free and there are no ads while you read.
```

**157/170 karakter.**

## 6. Açıklama — 4000 karakter sınırı

```
A reading app for people learning English.
Tap a word you don't know and its meaning opens instantly.
Hold a sentence and see the whole thing translated.

START AT YOUR OWN LEVEL
If you are starting out, there are short A1 and A2 stories you can finish
in one sitting: 6-8 minutes each, written for this app. Then roughly
20-minute B1 stories, and from there the classics of world literature.
The step never breaks. A short vocabulary test at the start tells you
where to begin.

LEARN WHILE READING
Tap any word and its meaning opens. Hearing a word pronounced is always
free. Save the words you want to keep; the app brings them back on the
day you are about to forget them, shown with the sentence you first met
them in. Recall, not memorisation.

THE BOOKS ARE ALWAYS FREE
Every book, every chapter, unlimited reading. No ads. You will never see
an interruption, a banner or a subscription offer while you are reading.

WHAT THE FREE TIER INCLUDES
- All 119 books, unlimited reading
- 15 word translations per day
- 10 AI sentence translations per day
- A 100-word vocabulary notebook
- Spaced repetition, unlimited
- Reading statistics
- Word pronunciation, unlimited
- Offline reading

WHAT PREMIUM ADDS
- Studio narration on 63 original stories, with the spoken word
  highlighted in the text as you listen. The classics have no narration.
- Unlimited word translations (the daily limit of 15 is removed)
- An unlimited vocabulary notebook
- 200 AI sentence translations per day
- A second language pair (your first pair is always free)

IN 10 LANGUAGES
The interface and word meanings work in English, Turkish, German, French,
Italian, Spanish, Russian, Arabic, Chinese and Japanese. Whichever
language you already know, you can read English through it.

WHAT IS INSIDE
- 119 books and stories
- 63 of them original graded stories (A1, A2 and B1)
- 56 classic works (B1 to C2)
- A 26,000-word English dictionary
- Sentence translation
- Offline reading
- Dark theme, font and text size settings

The classic works are taken from sources whose copyright has expired and
which anyone may freely use. The graded stories were written for this app.
```

## 7. "Yenilikler" — ilk sürüm

```
First release. 119 books, a 26,000-word dictionary and 63 original
stories from A1 to B1 so you can start at your own level.
```

## 8. Kategori ve yaş

| Alan              | Değer     |
| ----------------- | --------- |
| Birincil kategori | Education |
| İkincil kategori  | Books     |
| Yaş sınırı        | 4+        |

## 9. Dürüstlük sınırları

- Seslendirme 63 özgün hikâyede var, klasiklerde YOK — açıkça yazıldı.
- Aralıklı tekrar, istatistikler ve kelime telaffuzu **ücretsiz** listede.
- "10 dil" arayüz/karşılık dili; "10 dilde kitap" denmedi.
- Sosyal kanıt ve sayısal etkinlik iddiası yok.
- "Public domain" / "Project Gutenberg" terimleri kullanılmadı (araştırma
  bulgusu: teknik olmayan kullanıcıda değer düşürücü); kaynak dürüstlüğü
  en alta, düz dille konuldu.
