# Kelimelerim premium tasarımı (1.0.6)

## Sorun

Kelimelerim ekranı yalnızca bir kelime listesi ve düz ön/arka kart tekrarı
sunuyordu. Premium'a dönüşüm sağlayan bir içerik yoktu; ekran motivasyon da
vermiyordu.

## Rakip analizi (2026-09-24, TR mağazası, iTunes Search API)

| Uygulama                      | Öne çıkan kelime mekaniği                                      | Premium olan (doğrulanmadı) | Puan (sayı) |
| ----------------------------- | -------------------------------------------------------------- | --------------------------- | ----------- |
| Duolingo                      | Practice Hub, kelime listesi, hata tekrarı                     | Max: açıklama, roleplay     | 4.73 (486k) |
| LingQ                         | Kelime durumları 1–4, dersteki cümleden boşluk doldurma, dikte | Sınırsız LingQ              | 4.69 (1.2k) |
| Quizlet                       | Learn: çoktan seçmeliden yazmaya ilerleyen karışık mod         | Plus: sınırsız Learn/Test   | 4.76 (29k)  |
| Memrise                       | Learn/Review modları, dinleme, yazma                           | Pro: tüm modlar             | 4.76 (64k)  |
| Lingvist                      | Cümle içinde yazarak boşluk doldurma, günlük hedef             | Sınırsız kart               | 4.46 (215)  |
| Drops                         | Görsel oyunlar, tematik paketler                               | Tüm konular, sınırsız süre  | 4.69 (6.3k) |
| Babbel                        | Review Manager: kart, dinleme, konuşma, yazma                  | Kursun tamamı               | 4.60 (4.1k) |
| Readable / Reading Power (TR) | Liste + düz kart                                               | —                           | 4.76 / 4.77 |

Çıkarım: sektörde para kazandıran şey düz kart değil, **karışık alıştırma
modları**. İlerleme sayacı, seri ve temel aralıklı tekrar her yerde ücretsiz.

## Farkımız

Kaydedilen her kelimeyle birlikte okunduğu cümle (`context_text`), yüzey biçimi
ve kitap saklanıyor. Rakiplerin çoğu hazır örnek cümle kullanırken biz
boşluk doldurmayı kullanıcının **kendi okuduğu cümleden** kuruyoruz.

## 1.0.6'da yapılanlar

- **Akıllı Tekrar (premium):** boşluk doldurma (okunan cümle), anlam seçme,
  kelime seçme ve yazarak hatırlama karışımı; 10 soruluk oturum, vadesi
  gelen kelimeler önce. Oturum kurucu saf ve testli
  (`vocabulary/practice/buildPracticeSession.ts`).
- **Kota sunucuda (migration 049):** ücretsiz 24 saatte 1 deneme, premium
  sınırsız. `consume_smart_practice()` hak ancak kurulabilecek bir oturum
  varsa tüketiliyor. Paywall vaadi ve tetikleyici envantere eklendi.
- **Ücretsiz kalanlar:** kelime listesi, düz kart tekrarı, kendi desteler,
  ilerleme kartı (öğreniliyor / öğrenildi / toplam), kelimeden kitaba dönüş,
  kelime telaffuzu.

## Aynı turda eklenenler (1.0.6 tamamı)

- **Dinleme sorusu:** kelime cihaz sesiyle (öğrenilen dilin locale'i) okunuyor,
  kullanıcı anlamını seçiyor. Tek kelime telaffuzu ücretsiz olduğu için bu
  ADR-012 ile çelişmiyor; premium olan alıştırma oturumu.
- **SRS entegrasyonu:** Akıllı Tekrar cevapları `srs_cards`'a yazılıyor
  (yanlış = again, vadesi gelmiş doğru = hard; vadesi gelmemiş doğru plana
  dokunmuyor).
- **Keşfet paketleri (premium, migration 050/051):** seviye başına, o
  rafta en çok kitapta geçen 40 kelime. Dilin en sık 150 kelimesi ve
  kullanıcının zaten kaydettikleri çıkarılıyor. Ücretsizde 5 kelime önizleme
  - kilit kartı; premium tek dokunuşla özel desteye çeviriyor.
- **Kitap detayında defter kesişimi (ücretsiz):** "defterindeki N kelime bu
  kitapta geçiyor". "%87'sini biliyorsun" skoru bilerek yapılmadı (bilinen
  işaretlemesi seyrek, skor yanlış olurdu).

## Sonraki faz

1. Stüdyo sesinden cümle kesiti ile dinleme (63 özgün hikâye).
2. Tematik paketler (seviye yerine konu).
