# Referans uygulama ekran görüntüleri (dicto)

Buraya dicto ekran görüntülerinin **orijinal PNG dosyaları** konulacak.

## Neden dosya gerekiyor

Tasarım hedefi "ölçüler bile birebir". Sohbete eklenen görselleri gözle
görebiliyorum ama **piksel ölçemiyorum** -- kart genişliği 16pt mi 20pt mi,
köşe yarıçapı 12 mi 14 mü, satır yüksekliği 48 mi 52 mi ayırt edilemiyor.

Dosya olarak burada olurlarsa Python (PIL) ile şunları KESİN çıkarabiliyorum:
kenar boşlukları, satır yükseklikleri, köşe yarıçapları, tam renk kodları
(#RRGGBB), ikon boyutları, yazı boyutu oranları.

Bu döngüyü kırmak için gerekli: `WordSheet.tsx` içindeki "FAZ 5 DÜZELTMESİ"
ve "FAZ 9 DÜZELTMESİ" yorumları, ölçülerin tahmin edilip sonra
düzeltildiğini gösteriyor.

## Adlandırma

Ekran başına bir dosya, açıklayıcı ad:

```
01-reader.png
02-reader-kelime-popup.png
03-reader-icerikler.png
04-reader-ayarlar.png
05-reader-kitaptan-kelimeler.png
06-kitap-detay.png
07-ana-sayfa-ust.png
08-ana-sayfa-orta.png
09-ana-sayfa-alt.png
10-kelimeler-gecmis.png
11-ayarlar.png
```

Ölçüm yapılırken cihaz bilgisi de gerekiyor (ekran genişliği pt cinsinden
hesaplanabilsin diye) -- görüntüler hangi iPhone modelinden alındıysa
`docs/reference/CIHAZ.txt` içine yazılabilir.
