# Lingo Studio Evreni — karakterli seriler

Özgün hikâyelerin yeni katmanı: tek tek bağımsız hikâyeler yerine
**karakterlere bağlı, bölüm bölüm ilerleyen seriler**. Referans uygulamada
(Funfluent) Jack, Maggie, Lily gibi tanıdık karakterler var; bizimkiler
**yetişkin okur** için yazılıyor (hedef kitle A1–B2 öğrenen yetişkinler),
çocuk hikâyesi değil.

## Neden seri?

- **Geri dönüş sebebi:** okur bir karakteri sevince "sonraki bölüm"
  için geri gelir (Zeigarnik etkisi: yarım kalan hikâye akılda kalır).
  Netflix/Wattpad/Webtoon'un elde tutma motoru budur.
- **Dil öğrenimi:** aynı karakterler, aynı mekânlar ve tekrar eden
  kelimeler bağlam yükünü düşürür; okur dile odaklanır ("narrow reading",
  Krashen).
- **Ölçeklenebilir üretim:** karakter ve dünya kartları sabit olduğunda
  yeni bölüm üretmek bir istem + süreklilik özeti meselesidir.

## Yapı

```
universe/
  world.yaml                 Ortak dünya (Port Lumen şehri), ton ve içerik kuralları
  characters/<id>.yaml       Karakter kartı (kimlik, kişilik, ses, görsel kart)
  series/<series-id>.yaml    Seri kartı: karakter, seviye, başlıklar (10 dil),
                             bölüm planı, devam/sezon bağı
  continuity/<series-id>.yaml  Yayınlanan her bölümün özeti + kurulan
                             gerçekler (bir sonraki bölümün istemine girer)
```

**Kimlik kuralları (seriler hiçbir zaman karışmasın diye):**

- `series-id` kalıcıdır ve dilden bağımsızdır: `<karakter>-<konsept>-<seviye>`
  (ör. `leo-little-cafe-a1`). Bir kez yayınlandıktan sonra değişmez.
- Devam sezonu YENİ bir seri kartıdır: `leo-little-cafe-a1-s2`, içinde
  `continues: leo-little-cafe-a1`. Böylece her sezon kendi koleksiyonu,
  eski seriler dokunulmadan kalır; uygulamada sırayla bağlanabilir.
- Kitap slug'ı: `<series-id>-e<NN>` (İngilizce), diğer dillerde
  `<series-id>-e<NN>-<dil>`. Koleksiyon slug'ı da dil başına:
  `<series-id>` (en) / `<series-id>-<dil>`.
- Bölüm numarası (`series_index`) 1'den başlar; yayın adımı onu
  `collection_books.order_index`e 0 tabanlı yazar (bkz. `src/publish.py`
  `link_book_to_series`).

## Akış

1. **Plan:** seri kartına yeni bölüm satırı eklenir (`status: planned`,
   kısa `premise`). Ya da `--next` ile script kartın `next_hooks`
   alanından bir bölüm önerisi üretir.
2. **Üret:** `scripts/generate_series_episode.py --series <id> --lang en --next`
   - İstem = seviye kuralları (`prompts/generate_story_<seviye>.md`)
     - dünya kartı + karakter kartı + seri kartı + önceki bölüm özetleri
     - bu bölümün premise'i.
   - Çıktı pipeline'ın kendi doğrulayıcısıyla ölçülür
     (`scripts/check_story.py` ile aynı eşikler); geçemezse gerekçeyle
     yeniden yazdırılır (en çok 3 deneme).
   - Geçen hikâye `stories/` (en) ya da `stories_<dil>/` altına,
     frontmatter'ında `series`, `series_index`, `character` alanlarıyla
     yazılır. Model ayrıca 3-5 cümlelik bir özet + yeni kurulan gerçekleri
     döndürür; bunlar `continuity/<series-id>.yaml`a eklenir.
   - Veritabanına DOKUNMAZ.
3. **Yayınla (ayrı, bilinçli adım):**
   ```
   .venv/Scripts/python.exe -m src.cli run --file stories/<slug>.md --slug <slug>
   ```
   (`run` tüm zinciri yürütür; `run --book` diye bir seçenek YOK.) Yayın
   doğrulayıcısı A1 kapsamını `check_story`den biraz daha sıkı sayar; ret
   gelirse `work/<slug>/validation.pkl`deki `top_overlevel_words`e bakıp
   kelimeleri sadeleştirin.
   3b. **9 dile uyarla ve yayınla (her bölüm için ZORUNLU):**
   ```
   .venv/Scripts/python.exe scripts/adapt_series_episode.py --slug <slug> --lang all
   .venv/Scripts/python.exe scripts/publish_series_multilang.py --slug <slug>
   ```
   Uyarlama çeviri değil, aynı seviyede yeniden yazım: olaylar, bölüm
   sayısı ve süreklilik aynen kalır; dilin seviye istemi ve kelime listesi
   doğrulayıcısı uygulanır, ayrıca her dilde kitap tanıtım metni üretilir.
   Kitaplar `<series-id>-<dil>` koleksiyonuna bağlanır.
4. **Çeviri anahtarları:** koleksiyonun başlık/açıklama anahtarları
   (`collections.<slug>.title`) uygulamanın 10 dil dosyasına girmeli.
   `scripts/export_series_i18n.py` seri kartlarındaki başlıkları
   `work/series_i18n.json` olarak döker; uygulamaya elle birleştirilir
   (pipeline ile uygulama arasında import yok — CLAUDE.md).
5. **Diğer diller:** aynı seri kartı ve süreklilik özetleri kullanılır,
   `--lang de` vb. ile o dilin seviye istemi (`generate_story_<seviye>_<dil>.md`)
   ve doğrulayıcısı (`generate_stories_multi.py` ölçümü) devreye girer.
   Karakter adları kartta dil başına yazımıyla tutulur (`names:`).

## "X için yeni seri yaz" isteği

Ana kadro sabit: Leo, Nora, Kai, Mara (`world.yaml` `main_characters`).
Yeni karakter AÇILMAZ. İstek geldiğinde:

1. `series/<karakter>-<konsept>-<seviye>.yaml` yeni kart (10 dilde başlık ve
   açıklama, bölüm planı); seviye karakterin varsayılan seviyesinden farklı
   olabilir. Eski seri kartlarına dokunulmaz.
2. 1. bölüm İngilizce yazılır, `check_story` ile doğrulanır, yayınlanır (adım 3).
3. 9 dile uyarlanır ve yayınlanır (adım 3b).
4. `export_series_i18n.py` + 10 dil dosyasına birleştirme (adım 4).
5. Süreklilik kaydı `continuity/<series-id>.yaml`.

## Kapaklar

Şimdilik YOK (ürün kararı, 2026-10-05). Her karakter kartında bir
`visual` bölümü var; kapak üretimi geldiğinde tutarlı karakter görseli
için bu kart kullanılacak.
