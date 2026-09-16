# ASO Mağaza Görselleri — Genel Bakış

Bu klasör, "İngilizce Hikaye" (Lingo) için 10 dilde App Store mağaza
görseli ve metadata paketini içerir.

## Neden bu yöntem

Pazarlama metnini sıfırdan çevirmek yerine **uygulamanın kendi i18n
dosyalarından** (`src/i18n/locales/*.json`) çekiyoruz:

- Zaten 10 dilin hepsinde profesyonelce çevrilmiş.
- Üründe GERÇEKTEN çalışan vaatler dışında hiçbir şey söylemiyor —
  CLAUDE.md'nin "önce üründe çalışır, sonra paywall'a yazılır" kuralını
  ve App Store Guideline 2.3.1'i otomatik olarak sağlıyor.
- Ek çeviri maliyeti yok ("ücretsiz yoldan" isteğine uygun).

## Üretim hattı

```
scripts/aso-screenshots/
  build-content.js     -- i18n JSON'larından pazarlama metnini çıkarır -> content.json
  phones.js             -- 8 "telefon ekranı" içeriği (mockups/*.html'den uyarlandı)
  master-template.js   -- kanvas (1290x2796): başlık + telefon çerçevesi
  render.js             -- Playwright ile 10 dil x 8 ekran = 80 PNG üretir
```

Yeniden üretmek için:

```bash
node scripts/aso-screenshots/build-content.js   # içerik güncellenince
node scripts/aso-screenshots/render.js          # ~80 PNG, docs/aso/screenshots/<dil>/ altına
```

`playwright` bu oturumda `--no-save` ile geçici kuruldu (package.json'a
YAZILMADI) — kalıcı olarak eklemek istenirse `npm install -D playwright`
ve `npx playwright install chromium` gerekir.

## 8 ekranın planı

| #   | Ekran                          | Kaynak i18n anahtarı (headline)                | Telefon içeriği          |
| --- | ------------------------------ | ---------------------------------------------- | ------------------------ |
| 1   | Hero                           | `onboarding.welcome.title`                     | Ana sayfa / Kitaplığım   |
| 2   | Kelimeye dokun                 | `onboarding.welcome.highlights.tapWord.title`  | Okuma + kelime karşılığı |
| 3   | Cümle çevirisi (AI)            | `paywall.benefits.aiSentences.title`           | Okuma + AI çeviri balonu |
| 4   | Tüm kitaplar ücretsiz          | `onboarding.welcome.highlights.leveled.title`  | Kitaplık listesi         |
| 5   | Aklında kalsın (SRS, ücretsiz) | `onboarding.welcome.highlights.remember.title` | Kelime defteri           |
| 6   | Stüdyo seslendirme (premium)   | `paywall.benefits.studioAudio.title`           | Kitap detayı + dinle     |
| 7   | Kendi dilinde oku              | `languagePair.nativeTitle`                     | Dil seçici (10 dil)      |
| 8   | Premium CTA                    | `paywall.title`                                | Paywall kartı            |

Zemin rengi ekran sırasına göre alternatif (1,3,5,7 açık krem / 2,4,6,8
koyu lacivert) — rakip galerilerde sık görülen ritim deseni.

## Bilinen sınırlamalar

- **Kanvas boyutu (1290×2796, iPhone 6.7")**: yaygın kabul gören bir
  boyut ama `docs/aso/rakip-arastirmasi.md`'deki araştırma farklı/ek bir
  boyut önerirse `master-template.js`'teki `CANVAS_W/CANVAS_H` tek
  satırdan güncellenir.
- **Arapça (RTL)**: telefon ekranının İÇERİĞİ sağdan sola akıyor (metin
  hizası, buton sırası) ama grid/kapak resmi gibi bazı sabit-sütunlu
  yerleşimler fiziksel olarak aynalanmadı (yalnızca metin yönü doğru).
  Gerçek uygulama tam RTL destekliyor; bu yalnızca pazarlama görselinin
  bir kısayolu.
- **Örnek kelime/cümle**: "hope" kelimesi ve tek bir örnek cümle
  (Frankenstein, Letter II) 10 dile elle çevrildi (üründeki gerçek LLM
  çevirisi değil, gösterim amaçlı temsili bir örnek).
- Ekran görüntüleri gerçek cihazdan DEĞİL, `mockups/*.html`'in (onaylı
  tasarım kaynağı) Playwright ile render edilmiş bir kopyasından —
  App Store bunu kabul ediyor (gerçek UI'ı birebir yansıttığı sürece
  "marketing composite" olarak sorun değil), ama nihai gönderim öncesi
  gerçek cihaz ekran görüntüsüyle karşılaştırma önerilir.
