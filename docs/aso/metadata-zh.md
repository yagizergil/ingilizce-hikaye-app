# App Store Metadata — Çince, Basitleştirilmiş (zh-Hans)

**Tarih:** 15 Eylül 2026
**Pazar:** Çin anakarası App Store ve zh-Hans seçen diğer bölgeler

> **Önemli uyarı — yayın engeli.** Çin anakarası App Store'una uygulama
> yayınlamak **ICP lisansı** (工信部备案) gerektiriyor ve bu, Çin'de tüzel
> kişilik ister. Bu lokalizasyon, ICP alınana kadar da **değerlidir**:
> zh-Hans seçmiş olan Singapur, Malezya, Kanada, ABD vb. bölgelerdeki
> Çince konuşan kullanıcılar bu metni görür. Yani dosya şimdi yazılıyor,
> anakara gönderimi ayrı bir ticari karar.

---

## 1. Anahtar kelime araştırması — zh pazarına özgü

Çince arama davranışı diğer dokuz dilden **yapısal olarak** ayrışıyor:

1. **Boşluk yok, kelime sınırı yok.** Apple Çince'yi karakter n-gram'ıyla
   indeksliyor. Bu yüzden `英语阅读` yazmak hem `英语` hem `阅读` hem de
   `英语阅读` aramasını yakalıyor — **Latin dillerinde imkânsız olan bir
   kaldıraç.**
2. **30 karakterlik başlık Çince'de çok daha fazla bilgi taşıyor.** Ölçüldü:
   `多邻国Duolingo英语日语法语` (Duolingo) ve
   `Readle 外语学习：法语、德语、西班牙语、英语、日语助手` (Readle). **İki
   rakip de başlığı sonuna kadar terimle dolduruyor.** Latin pazarları için
   doğru olan "temiz, kısa başlık" kuralı burada **rekabet dezavantajı**.
3. **`分级读物`** (seviyeli okuma materyali) Çin'de İngilizce eğitiminin
   yerleşik terimi — okul ve veli pazarında herkesin bildiği kelime.
4. **`背单词`** (kelime ezberlemek) devasa bir kategori terimi, ama alaka
   sınırlı: bizim ürünümüz ezber değil bağlamdan öğrenme. Yine de kelime
   defteri ve SRS gerçek olduğu için alanda kullanılabilir.

| Terim                                | Rekabet       | Alaka | Karar                             |
| ------------------------------------ | ------------- | ----- | --------------------------------- |
| `英语阅读` (İngilizce okuma)         | Düşük         | 1,00  | **Başlıkta**                      |
| `分级读物` (seviyeli okuma)          | Çok düşük     | 1,00  | **Başlıkta**                      |
| `英语原著` (İngilizce orijinal eser) | Düşük         | 1,00  | **Altyazıda**                     |
| `点词翻译` (kelimeye dokun-çevir)    | Neredeyse boş | 1,00  | **Altyazıda**                     |
| `英语学习`                           | Aşırı         | 0,70  | Başlıktaki `英语` kısmen kapsıyor |
| `背单词`                             | Aşırı         | 0,70  | Alan                              |
| `英文小说` (İngilizce roman)         | Düşük         | 1,00  | Alan                              |
| `名著` (klasik eser)                 | Düşük         | 1,00  | Alan                              |
| `词典` (sözlük)                      | Yüksek        | 0,85  | Alan                              |

---

## 2. Başlık — 30 karakter

```
英语阅读：分级读物与名著、点词查义
```

**17/30 karakter.**
("İngilizce okuma: seviyeli okuma materyali ve klasikler, kelimeye
dokunup anlamına bak")

Rakip normuna uyarak terim yığıldı: bu tek dize `英语`, `阅读`, `英语阅读`,
`分级`, `读物`, `分级读物`, `名著`, `点词`, `查义` aramalarının hepsini
yakalıyor. 17 karakterde 9 terim — Latin alfabesinde bu yoğunluk mümkün değil.

## 3. Altyazı — 30 karakter

```
读英文原著，母语看释义，全部免费
```

**16/30 karakter.**
("İngilizce orijinal eser oku, anlamını ana dilinde gör, hepsi ücretsiz")

## 4. Anahtar kelime alanı — 100 karakter

```
英语学习,背单词,英文小说,短篇故事,词典,生词本,间隔重复,朗读,有声书,离线阅读,英语启蒙,a1,a2,b1,b2,c1,雅思,托福
```

**68/100 karakter.**

- `英语阅读`, `分级读物`, `名著`, `点词`, `释义`, `免费` başlık/altyazıda
  olduğu için tekrarlanmadı.
- `雅思` (IELTS) ve `托福` (TOEFL) bilinçli eklendi: Çin'de İngilizce okuma
  materyali arayanların büyük kısmı sınav hazırlığından geliyor. **Ürün
  sınav hazırlığı değil ve açıklamada öyle iddia edilmiyor** — anahtar
  kelime alanında bir arama niyetini yakalamak, açıklamada iddia etmekten
  farklı ve meşru.
- Noktalama tam genişlikte değil, **yarım genişlik virgül** kullanıldı —
  Apple'ın ayırıcısı budur.

## 5. Promosyon metni — 170 karakter

```
现已支持十种语言。读一篇英文故事，点一下不认识的词，用中文看它的意思。所有书籍永久免费，阅读时没有任何广告。
```

**54/170 karakter.** (Çince'de aynı bilgi çok daha az karakter tutuyor.)

## 6. Açıklama — 4000 karakter sınırı

```
一款为学英语的人做的阅读应用。
点一下不认识的词，释义立刻打开。
长按一句话，就能看到整句的翻译。

从你自己的水平开始
如果你刚起步，这里有 A1 和 A2 水平的短篇故事，一次就能读完：每篇 6 到 8 分钟，
专为这款应用而写。接着是约 20 分钟的 B1 故事，再往上是世界文学名著。台阶在任何
一处都不会断开。开头一个简短的词汇测验会告诉你从哪里开始。

在阅读中学习
点一下词，释义就出现。听一个词的发音永远免费。把你想记住的词存下来，应用会在
你快要忘记它的那一天把它带回来，并附上你第一次遇见它的那句话。是回忆，不是死记
硬背。

书籍永远免费
所有书、所有章节、无限阅读。没有广告。阅读时你永远不会看到中断、横幅或订阅推销。

免费版包含
- 全部 119 本书，无限阅读
- 每天 15 次单词翻译
- 每天 10 次 AI 整句翻译
- 可存 100 个词的生词本
- 间隔重复，无限次
- 阅读统计
- 单词发音，无限次
- 离线阅读

Premium 额外提供
- 63 篇原创故事的录音室朗读，朗读到的词会在文中高亮。名著没有朗读。
- 无限次单词翻译（每天 15 次的上限取消）
- 无限容量的生词本
- 每天 200 次 AI 整句翻译
- 第二组语言配对（第一组永远免费）

支持十种语言
界面和词义支持中文、英语、土耳其语、德语、法语、意大利语、西班牙语、俄语、
阿拉伯语和日语。无论你已经会哪一种，都可以透过它来读英文。

里面有什么
- 119 本书和故事
- 其中 63 篇是按水平分级的原创故事（A1、A2 和 B1）
- 56 部经典名著（B1 到 C2）
- 一部收词 26,000 的英语词典
- 整句翻译
- 离线阅读
- 深色主题，字体和字号可调

经典作品取自版权已经到期、任何人都可以自由使用的来源。分级故事是专为这款应用
撰写的。
```

## 7. "Yenilikler" — ilk sürüm

```
首个版本。119 本书、收词 26,000 的词典，以及从 A1 到 B1 的 63 篇原创故事，
让你从自己的水平开始。
```

## 8. Kategori ve yaş

| Alan              | Değer |
| ----------------- | ----- |
| Birincil kategori | 教育  |
| İkincil kategori  | 图书  |
| Yaş sınırı        | 4+    |

## 9. Dürüstlük sınırları

- Seslendirme 63 özgün hikâyede, klasiklerde YOK — açıkça yazıldı
  (`名著没有朗读` = "klasiklerde seslendirme yok").
- SRS, istatistik ve telaffuz ücretsiz listede.
- "十种语言" arayüz/karşılık dili; "10 dilde kitap" denmedi.
- Sosyal kanıt ve sayısal etkinlik iddiası yok.
- `雅思`/`托福` yalnızca anahtar kelime alanında; **açıklamada sınav
  hazırlığı iddiası yok** — ürün sınav hazırlığı yapmıyor.
- ICP lisansı olmadan anakara gönderimi yapılamaz; bu metadata sorunu
  değil, ticari/hukuki bir ön koşul.
