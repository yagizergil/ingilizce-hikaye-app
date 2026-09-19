# Dönüşüm (free → premium) turu — tasarım

Tarih: 2026-09-19. Uygulama dün yayınlandı, bu yüzden davranış verisi yok;
aşağıdaki kararlar veriye değil, **üründe bugün ölçülebilir biçimde var olan
gerçeklere** dayanıyor (canlı tablolardan doğrulandı).

## Başlangıç durumu

Paywall'ın dokuz tetikleyicisi var ve hepsi okuma akışının dışında (Ürün
İlkesi #1). Premium bugün beş şey sunuyor: stüdyo seslendirmesi, sınırsız
kelime çevirisi (ücretsizde 15/gün), sınırsız kelime defteri (ücretsizde
100), yüksek AI cümle çevirisi kotası (ücretsizde 10/gün) ve ikinci dil
çifti. Paywall'daki her sayı `usePaywallFactsQuery` ile sunucudan geliyor;
hiçbiri metne gömülü değil.

Bu turda dönüşüm yolunda **bulunup düzeltilen** şeyler (ayrı commit'ler):
geri yükleme ödeyen aboneye "abonelik yok" diyordu; `not_entitled` kararı
sunucuya değil istemcinin anlık görüntüsüne bakıyordu; deneme hakkı
uygunluk kontrolü olmadan reklam ediliyordu; premium kullanıcı "Dinle"ye
erken basınca kendi satın aldığı ürün için paywall'a gidiyordu. Bunlar
"yeni özellik" değil, kapanan delikler — ve dönüşüm üzerindeki etkileri
aşağıdaki fikirlerin hepsinden büyük olabilir.

## Bu turda yapılanlar

### 1. Paywall kullanıcının KENDİ rakamlarıyla açılıyor

**Sorun.** Paywall bir özellik listesiyle açılıyor. Özellik listesi, ürünü
zaten kullanan birine "ne kaybettiğini" değil "neyin satıldığını"
anlatıyor.

**Değişiklik.** Paywall'ın en üstünde, kullanıcının son 7 gündeki kendi
etkinliği: kaç gün okuduğu, kaç kelime çevirdiği, kaç kelime kaydettiği.
Sonra teklif.

**Neden bu işe yarar.** Sayılar kullanıcının kendi davranışı, yani itiraz
edilemez; ve "ben okuyan biriyim" kimliğini teklifin önüne koyuyor. Özellik
listesi aşağıda duruyor, kaldırılmadı.

**Dürüstlük kısıtı.** Geçmişi olmayan kullanıcıda (ilk oturum, onboarding
paywall'ı) blok HİÇ gösterilmiyor — sıfır yazan bir "başarı" bloğu
göstermek, satmak istediğin şeyin değersiz olduğunu söylemek olurdu. Veri
gelmeden de gösterilmiyor; paywall bir sayı için bekletilmiyor
(`usePaywallFactsQuery`'nin mevcut kuralı).

**Veri.** Üçü de zaten var, yeni tablo/migration yok:
`ai_usage` (`feature = 'word_lookup'`, son 7 gün), `user_saved_words`
sayısı, `user_reading_stats` (son 7 günde `minutes > 0` olan gün sayısı).

### 2. Kota bittiğinde paywall, kullanıcının takıldığı KELİMEYİ hatırlıyor

**Sorun.** Günlük 15 kelime hakkı bittiğinde paywall açılıyor ama genel bir
paywall açılıyor. Oysa bu, üründeki en yüksek niyetli an: kullanıcı tam o
anda belirli bir kelimeyi anlamak istiyor ve anlayamıyor.

**Değişiklik.** Takılınan kelime paywall'a taşınıyor ve orada adıyla
görünüyor: «"reluctant" seni bekliyor».

**Neden bu işe yarar.** Soyut bir "sınırsız çeviri" vaadini, kullanıcının o
saniyede gerçekten istediği tek somut şeye bağlıyor. Aynı ekran, aynı
fiyat, aynı özellikler — yalnızca teklif kullanıcının kendi bağlamında
okunuyor.

**Kapsam kısıtı.** Yalnızca metin. Satın alma sonrası o kelimenin sözlüğünü
otomatik açmak cazip ama reader'ın durumunu paywall'dan geri kurmayı
gerektiriyor; ayrı ve daha riskli bir iş, bu turda YAPILMADI.

## Bilerek YAPILMAYANLAR

**Sesli örnek (ilk 20 saniye) kitap detayında.** Premium'un en güçlü
faydası stüdyo seslendirmesi ve onu duyurmanın en iyi yolu duyurmak.
Yapılmadı çünkü erişim depo düzeyinde kapalı (migration 031) ve önizleme
için `chapter-audio` edge function'ının kısmi bir imzalı bağlantı vermesi
gerekiyor — sunucu değişikliği + dağıtım. Sıradaki turun en yüksek getirili
maddesi bu.

**Kota sıfırlanma sayacı ("hakkın 6 saat sonra yenileniyor").** Dürüst ve
güven artırıcı, ama kısa vadeli dönüşümü düşürmesi muhtemel. Ürün sahibinin
kararı, benim değil.

**Fiyat/paket değişikliği.** Ürün kararı.

**Çekirdek huni olaylandırması.** Ürün sahibi bu turda dönüşümü öne aldı.
Not olarak kalsın: `paywall_viewed` ve `purchase_completed` zaten `source`
taşıyor, yani **tetikleyici başına dönüşüm bugün ölçülebilir**. Ölçülemeyen
şey, kaç kullanıcının paywall'ı hiç açmadan tetikleyiciye takıldığı —
yani her tetikleyicinin *payda*sı. Bir sonraki turda `word_quota_reached`
gibi birkaç olay bunu kapatır.
