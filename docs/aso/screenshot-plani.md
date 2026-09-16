# Ekran Görüntüsü Planı — 8 Kare × 10 Dil

**Tarih:** 15 Eylül 2026
**Kaynak:** `rakip-arastirmasi.md` (galeri analizi) + `04-konumlandirma.md`
**Bu dosya ne değildir:** görsel tasarım dosyası. Burada yalnızca **hangi
ürün anı gösterilecek** ve **hangi metin overlay'i yazacak** tanımlı.
Görsel üretim ayrı pipeline'da yapılacak.

---

## 1. Teknik zarf (bütün karelerde ortak)

| Alan                | Değer                                         | Gerekçe                                                               |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Çözünürlük          | **1290 × 2796** (iPhone 6,9")                 | Apple diğer iPhone boyutlarına otomatik ölçekliyor; tek boyut yeterli |
| Yönelim             | **Portre** (tüm set)                          | Arama şeridinde 3 kare birden görünüyor (manzarada 1)                 |
| Format              | PNG, **alfa kanalı yok**, sRGB                | Alfa içeren PNG reddediliyor                                          |
| Kare sayısı         | **8**                                         | Ölçülen kategori medyanı (bkz. rakip araştırması §2)                  |
| Toplam çıktı        | 10 dil × 8 kare = **80 görsel**               |                                                                       |
| Zemin               | `#FAF8F4` kâğıt                               | 7 rakibin 7'si de doygun/parlak renk kullanıyor — ayrışma             |
| Vurgu rengi         | `#A6572E`                                     | Her başlıkta **yalnızca bir** kelime bu renkte                        |
| Başlık yazı tipi    | Fraunces SemiBold                             | Uygulamada zaten yüklü                                                |
| Alt satır yazı tipi | IBM Plex Mono, VERSAL                         | Uygulamada zaten yüklü                                                |
| İçerik              | **Gerçek ekran görüntüsü.** İllüstrasyon yok. | Beklenti kırılması → D1 kaybı                                         |

### Arapça (ar) için ek kurallar

- Cihaz mockup'ı ve metin hizası **sağdan sola**. Uygulamanın RTL'i gerçek
  onboarding akışında devrede, yani ham ekran görüntüsü doğru çıkacak.
- Kare sırası değişmiyor (App Store galerisi RTL dillerde de soldan sağa
  kaydırılıyor).

### Çince (zh) ve Japonca (ja) için ek kurallar

- Başlıklar Latin dillerindekinden **belirgin şekilde kısa** yazılacak —
  CJK karakteri daha fazla bilgi taşıyor, aynı piksel genişliğinde daha az
  karakter okunaklı.
- Noktalama CJK tam genişlik (`、` `。`) kullanılacak.

---

## 2. Sıralama mantığı

Kullanıcı ürün sayfasında 3–6 saniye geçiriyor ve **kaydırmadan yalnızca
ilk 3 kareyi** görüyor. Readle'ın ölçülen sırası (hook → ölçek → mekanik)
bu gerçeğe göre kurulmuş ve doğru. Bizim uyarlamamız:

| #   | Rol                                                    | Kare                                        |
| --- | ------------------------------------------------------ | ------------------------------------------- |
| 1   | **Kanca** — çekirdek mekanik, tek başına ürünü anlatır | Kelimeye dokun → karşılık açılır            |
| 2   | **İtirazı kır** — "seviyem yetmez"                     | Seviye testi + A1–C2                        |
| 3   | **Ölçek + ücretsizlik**                                | Kütüphane: 119 kitap, hepsi ücretsiz        |
| 4   | Derinlik                                               | Cümleye uzun bas → AI çevirisi              |
| 5   | Kalıcılık                                              | Kelime defteri + aralıklı tekrar (ÜCRETSİZ) |
| 6   | Premium vaadi                                          | Stüdyo seslendirmesi (sınırıyla birlikte)   |
| 7   | Güven                                                  | Çevrimdışı + reklamsız + okuma ayarları     |
| 8   | Kapsam                                                 | 10 arayüz dili / kendi dilinde karşılık     |

---

## 3. Kare kare içerik ve metinler

Her kare için: **ÜRÜN ANI** (hangi ekranın görüntüsü) + 10 dilde
**BAŞLIK** (büyük, 1–2 satır) ve **ALT SATIR** (versal, tek satır).

---

### Kare 1 — Kanca: kelimeye dokun

**Ürün anı:** Reader ekranı, gerçek bir hikâyeden bir paragraf, bir kelimeye
dokunulmuş, `WordSheet` alttan açık ve karşılığı görünüyor. Çerçevesiz, tam
kanama — okuma yüzeyi olabildiğince büyük.
**Vurgu kelimesi:** "dokun" / "tap" fiilinin karşılığı.

| Dil | Başlık                                   | Alt satır                          |
| --- | ---------------------------------------- | ---------------------------------- |
| tr  | Anlamadığın kelimeye **dokun**.          | KARŞILIĞI ANINDA AÇILIR            |
| en  | **Tap** any word you don't know.         | THE MEANING OPENS INSTANTLY        |
| de  | **Tippe** auf jedes unbekannte Wort.     | DIE BEDEUTUNG ERSCHEINT SOFORT     |
| fr  | **Touchez** un mot que vous ignorez.     | LA TRADUCTION S'OUVRE AUSSITÔT     |
| it  | **Tocca** una parola che non conosci.    | IL SIGNIFICATO APPARE SUBITO       |
| es  | **Toca** cualquier palabra que no sepas. | EL SIGNIFICADO APARECE AL INSTANTE |
| ru  | **Нажми** на незнакомое слово.           | ПЕРЕВОД ОТКРОЕТСЯ СРАЗУ            |
| ar  | **انقر** على أي كلمة لا تعرفها.          | يظهر المعنى في الحال               |
| zh  | 点一下**不认识的词**                     | 释义立刻出现                       |
| ja  | わからない単語を**タップ**。             | 意味がすぐに開く                   |

---

### Kare 2 — Seviye: kendi seviyenden başla

**Ürün anı:** Seviye testi sonuç ekranı — CEFR rozeti (örn. B1) + "sana
uygun N hikâye" satırı. Alternatif: kütüphanenin seviye filtresi şeridi
(A1 A2 B1 B2 C1 C2) seçili hâlde.
**Neden 2. sırada:** Bu kategorideki en yaygın itiraz "İngilizce kitap
okuyamam, seviyem yetmez." Kanca çalıştıysa hemen bu kırılmalı.

| Dil | Başlık                        | Alt satır                         |
| --- | ----------------------------- | --------------------------------- |
| tr  | Kendi **seviyenden** başla.   | A1'DEN C2'YE, KISA BİR TEST YETER |
| en  | Start at **your** level.      | A1 TO C2 — ONE SHORT TEST         |
| de  | Starte auf **deinem** Niveau. | A1 BIS C2 — EIN KURZER TEST       |
| fr  | Commencez à **votre** niveau. | DE A1 À C2 — UN TEST RAPIDE       |
| it  | Parti dal **tuo** livello.    | DA A1 A C2 — UN TEST BREVE        |
| es  | Empieza en **tu** nivel.      | DE A1 A C2 — UN TEST BREVE        |
| ru  | Начни со **своего** уровня.   | ОТ A1 ДО C2 — КОРОТКИЙ ТЕСТ       |
| ar  | ابدأ من **مستواك** أنت.       | من A1 إلى C2 — اختبار قصير        |
| zh  | 从**你自己的**水平开始        | A1 到 C2、一个小测验即可          |
| ja  | **自分のレベル**から始める。  | A1からC2まで、短いテストで判定    |

---

### Kare 3 — Ölçek ve ücretsizlik: kütüphane

**Ürün anı:** Kütüphane/ana ekran, kapak rafları ve seviye rozetleriyle
dolu. Ekranda mümkün olduğunca çok kapak görünsün.
**Dürüstlük sınırı:** "119 kitap" doğrulanmış envanter sayısı (56 klasik +
63 özgün). Bu sayı içerik eklendikçe güncellenmeli; galeri metnine sayı
yazmanın bedeli budur. Sayıyı yazmanın faydası, rakiplerin "+2000 Storys"
ölçek iddiasına karşı somut bir cevap vermek.

| Dil | Başlık                          | Alt satır                                  |
| --- | ------------------------------- | ------------------------------------------ |
| tr  | 119 kitap. Hepsi **ücretsiz**.  | KLASİKLER VE SEVİYELİ ÖZGÜN HİKÂYELER      |
| en  | 119 books. All **free**.        | CLASSICS AND ORIGINAL GRADED STORIES       |
| de  | 119 Bücher. Alle **kostenlos**. | KLASSIKER UND EIGENE NIVEAU-GESCHICHTEN    |
| fr  | 119 livres. Tous **gratuits**.  | CLASSIQUES ET HISTOIRES GRADUÉES INÉDITES  |
| it  | 119 libri. Tutti **gratis**.    | CLASSICI E RACCONTI GRADUATI ORIGINALI     |
| es  | 119 libros. Todos **gratis**.   | CLÁSICOS E HISTORIAS GRADUADAS PROPIAS     |
| ru  | 119 книг. Все **бесплатно**.    | КЛАССИКА И ОРИГИНАЛЬНЫЕ ИСТОРИИ ПО УРОВНЯМ |
| ar  | ‏119 كتابًا. كلها **مجانية**.   | كلاسيكيات وقصص أصلية متدرجة المستوى        |
| zh  | 119 本书、全部**免费**          | 经典名著与分级原创故事                     |
| ja  | 119冊。すべて**無料**。         | 名作古典とレベル別オリジナル短編           |

---

### Kare 4 — Derinlik: cümle çevirisi

**Ürün anı:** Reader ekranı, bir cümle uzun basılmış ve seçili, cümle
çevirisi sheet'i açık.

| Dil | Başlık                                     | Alt satır                         |
| --- | ------------------------------------------ | --------------------------------- |
| tr  | Cümleye **uzun bas**, tamamını çevir.      | ZOR CÜMLEDE TAKILIP KALMA         |
| en  | **Hold** a sentence to translate it all.   | NEVER GET STUCK ON A HARD LINE    |
| de  | Satz **gedrückt halten**, ganz übersetzen. | BLEIB AN KEINEM SATZ MEHR HÄNGEN  |
| fr  | **Appuyez longuement** sur une phrase.     | NE BLOQUEZ PLUS SUR UNE PHRASE    |
| it  | **Tieni premuta** una frase, traducila.    | NON RESTARE BLOCCATO SU UNA FRASE |
| es  | **Mantén pulsada** una frase y tradúcela.  | NO TE ATASQUES EN NINGUNA FRASE   |
| ru  | **Задержи** палец на предложении.          | НЕ ЗАСТРЕВАЙ НА СЛОЖНОЙ ФРАЗЕ     |
| ar  | **اضغط مطولًا** على الجملة لترجمتها.       | لا تتوقف عند جملة صعبة            |
| zh  | **长按**整句、立即翻译                     | 不再卡在难句上                    |
| ja  | 文を**長押し**して全文訳。                 | 難しい一文で止まらない            |

---

### Kare 5 — Kalıcılık: kelime defteri ve tekrar

**Ürün anı:** Tekrar (SRS) ekranı — bir kelime kartı, kelimenin ilk
görüldüğü cümleyle birlikte.
**Dürüstlük sınırı — ÖNEMLİ:** Aralıklı tekrar ve istatistikler
**ücretsiz** (SRS'te hiçbir yetki kontrolü yok). Bu kare premium vaadi
olarak sunulmayacak; tersine "ücretsiz" olduğu alt satırda açıkça
yazılacak. 2026-09-14 denetiminde bu iki özellik yanlışlıkla premium diye
satılıyordu — aynı hata galeriye taşınmayacak.

| Dil | Başlık                                 | Alt satır                           |
| --- | -------------------------------------- | ----------------------------------- |
| tr  | Kaydettiğin kelime **geri gelir**.     | ARALIKLI TEKRAR — ÜCRETSİZ          |
| en  | Saved words **come back** to you.      | SPACED REPETITION — FREE            |
| de  | Gespeicherte Wörter **kommen zurück**. | VERTEILTE WIEDERHOLUNG — KOSTENLOS  |
| fr  | Les mots enregistrés **reviennent**.   | RÉPÉTITION ESPACÉE — GRATUIT        |
| it  | Le parole salvate **tornano**.         | RIPETIZIONE DILAZIONATA — GRATIS    |
| es  | Las palabras guardadas **vuelven**.    | REPETICIÓN ESPACIADA — GRATIS       |
| ru  | Сохранённые слова **возвращаются**.    | ИНТЕРВАЛЬНОЕ ПОВТОРЕНИЕ — БЕСПЛАТНО |
| ar  | الكلمات المحفوظة **تعود إليك**.        | تكرار متباعد — مجانًا               |
| zh  | 存下的词会**再次出现**                 | 间隔重复、完全免费                  |
| ja  | 保存した単語は**また出会える**。       | 間隔反復 — 無料                     |

---

### Kare 6 — Premium: stüdyo seslendirmesi

**Ürün anı:** Reader ekranı, seslendirme çalıyor, **okunan kelime metnin
üzerinde vurgulu**, alttaki ses kontrol çubuğu görünür.

**Dürüstlük sınırı — EN KRİTİK KARE.** Seslendirme:

- yalnızca **63 özgün hikâyede** var (207 bölüm), **klasiklerde YOK**;
- **premium** gerektiriyor (ADR-012, migration 032 — ücretsiz "bir hikâye
  dinle" hakkı kaldırıldı).

Bu iki sınır alt satırda **açıkça** yazılacak. Sınırı yazmadan
"stüdyo seslendirmesi" demek, kullanıcının 56 klasikte de ses bekleyip
bulamaması demek — Guideline 2.3.1'in tam tanımı ve bu projede bir kez
yaşanmış hata.

Görsel tarafta ek kural: kullanılacak ekran görüntüsü **bir özgün
hikâyeden** alınacak, klasikten değil. Klasik bir kitabın kapağının
yanında çalar gösterirsek metin dürüst olsa bile görsel yanıltıcı olur.

| Dil | Başlık                     | Alt satır                                            |
| --- | -------------------------- | ---------------------------------------------------- |
| tr  | Dinlerken **oku**.         | STÜDYO SESİ — 63 ÖZGÜN HİKÂYEDE, PREMIUM             |
| en  | **Listen** while you read. | STUDIO AUDIO — 63 ORIGINAL STORIES, PREMIUM          |
| de  | **Hören** beim Lesen.      | STUDIO-AUDIO — 63 EIGENE STORYS, PREMIUM             |
| fr  | **Écoutez** en lisant.     | AUDIO STUDIO — 63 HISTOIRES INÉDITES, PREMIUM        |
| it  | **Ascolta** mentre leggi.  | AUDIO IN STUDIO — 63 RACCONTI ORIGINALI, PREMIUM     |
| es  | **Escucha** mientras lees. | AUDIO DE ESTUDIO — 63 HISTORIAS PROPIAS, PREMIUM     |
| ru  | **Слушай**, пока читаешь.  | СТУДИЙНАЯ ОЗВУЧКА — 63 ОРИГИНАЛЬНЫЕ ИСТОРИИ, PREMIUM |
| ar  | **استمع** أثناء القراءة.   | صوت استوديو — في 63 قصة أصلية، Premium               |
| zh  | 边读边**听**               | 录音室朗读、限 63 篇原创故事、Premium                |
| ja  | 読みながら**聴く**。       | スタジオ音声 — オリジナル63作品のみ、Premium         |

---

### Kare 7 — Güven: reklamsız, çevrimdışı, ayarlanabilir

**Ürün anı:** Koyu tema reader + yazı tipi/punto ayar paneli açık. Yanda
çevrimdışı indirilmiş bölüm göstergesi.

| Dil | Başlık                                       | Alt satır                                   |
| --- | -------------------------------------------- | ------------------------------------------- |
| tr  | Reklam yok. **Kesinti** yok.                 | ÇEVRİMDIŞI OKU, KOYU TEMA, PUNTO AYARI      |
| en  | No ads. No **interruptions**.                | READ OFFLINE, DARK THEME, FONT SIZE         |
| de  | Keine Werbung. Keine **Störung**.            | OFFLINE LESEN, DUNKLES THEMA, SCHRIFTGRÖSSE |
| fr  | Pas de pub. Aucune **coupure**.              | LECTURE HORS LIGNE, THÈME SOMBRE, TAILLE    |
| it  | Niente pubblicità. Nessuna **interruzione**. | LEGGI OFFLINE, TEMA SCURO, DIMENSIONE       |
| es  | Sin anuncios. Sin **interrupciones**.        | LEE SIN CONEXIÓN, TEMA OSCURO, TAMAÑO       |
| ru  | Без рекламы. Без **перерывов**.              | ЧИТАЙ ОФЛАЙН, ТЁМНАЯ ТЕМА, РАЗМЕР ШРИФТА    |
| ar  | بلا إعلانات. بلا **مقاطعة**.                 | اقرأ دون إنترنت، وضع داكن، حجم الخط         |
| zh  | 没有广告、没有**打断**                       | 离线阅读、深色主题、字号调节                |
| ja  | 広告なし。**中断**なし。                     | オフライン読書、ダークテーマ、文字サイズ    |

---

### Kare 8 — Kapsam: kendi dilinde

**Ürün anı:** Dil seçici ekranı — 10 dil kendi alfabesinde listelenmiş
(Türkçe, English, Deutsch, Français, Italiano, Español, Русский, العربية,
中文, 日本語).
**Dürüstlük sınırı:** "10 dil" **arayüz ve karşılık dili** sayısıdır,
"10 dilde kitap" DEĞİL. Gerçek kitap içeriği bugün ağırlıklı olarak
İngilizce. Alt satır bunu ayırt edecek şekilde yazıldı.

| Dil | Başlık                              | Alt satır                                                        |
| --- | ----------------------------------- | ---------------------------------------------------------------- |
| tr  | Karşılıklar **senin dilinde**.      | 10 ARAYÜZ DİLİ — İNGİLİZCE OKU, TÜRKÇE ANLA                      |
| en  | Meanings in **your** language.      | 10 INTERFACE LANGUAGES FOR ENGLISH READING                       |
| de  | Bedeutungen in **deiner** Sprache.  | 10 OBERFLÄCHENSPRACHEN — ENGLISCH LESEN, DEUTSCH VERSTEHEN       |
| fr  | Les sens dans **votre** langue.     | 10 LANGUES D'INTERFACE — LIRE EN ANGLAIS, COMPRENDRE EN FRANÇAIS |
| it  | I significati nella **tua** lingua. | 10 LINGUE D'INTERFACCIA — LEGGI IN INGLESE, CAPISCI IN ITALIANO  |
| es  | Significados en **tu** idioma.      | 10 IDIOMAS DE INTERFAZ — LEE EN INGLÉS, ENTIENDE EN ESPAÑOL      |
| ru  | Значения на **твоём** языке.        | 10 ЯЗЫКОВ ИНТЕРФЕЙСА — ЧИТАЙ ПО-АНГЛИЙСКИ, ПОНИМАЙ ПО-РУССКИ     |
| ar  | المعاني **بلغتك** أنت.              | 10 لغات للواجهة — اقرأ بالإنجليزية وافهم بالعربية                |
| zh  | 释义用**你的母语**                  | 10 种界面语言、读英文、用中文理解                                |
| ja  | 意味は**あなたの言語**で。          | インターフェース10言語 — 英語で読み、日本語で理解                |

---

## 4. Üretim kontrol listesi

- [ ] 1290 × 2796 portre, PNG, **alfa kanalı kapalı**, sRGB
- [ ] Her karede vurgu rengi `#A6572E` **tek bir kelimede**
- [ ] Kare 6'nın ekran görüntüsü **özgün bir hikâyeden** alındı (klasikten değil)
- [ ] Kare 5'te "ücretsiz" ibaresi var (SRS premium DEĞİL)
- [ ] Kare 3'teki kitap sayısı veritabanındaki güncel sayıyla eşleşiyor
- [ ] Kare 6'daki hikâye sayısı (63) ve "premium" ibaresi yerinde
- [ ] ar setinde mockup ve metin hizası RTL
- [ ] zh/ja setinde tam genişlik noktalama kullanıldı
- [ ] Hiçbir karede sayısal etkinlik iddiası yok ("%X daha hızlı öğren" gibi)
- [ ] Hiçbir karede sosyal kanıt iddiası yok ("milyonlarca kullanıcı" gibi)
- [ ] 80 dosya, `<dilkodu>/01..08.png` adlandırmasıyla

## 5. Sayı değişirse ne olur

Kare 3 (119 kitap), kare 6 (63 hikâye) ve kare 8 (10 dil) **envanter
sayısı** içeriyor. Katalog büyüdüğünde bu üç kare 10 dilde yeniden
üretilmeli. Alternatif — sayıyı hiç yazmamak — rakiplerin ölçek iddiasına
karşı bizi savunmasız bırakırdı; bilinçli olarak sayıyı yazıp bakım
yükünü kabul ediyoruz. Sayıyı **düşürmek** (örn. "100+ kitap") bakım
yükünü azaltır ama somutluğu da azaltır; ilk sürümde kesin sayı
kullanılacak.
