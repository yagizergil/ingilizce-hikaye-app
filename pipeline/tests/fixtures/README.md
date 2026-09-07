# Test fixture'ları

Bu klasör içerik dosyası içermez (repo kuralları gereği). Uçtan uca extract/
profile/validate testlerinin çalışması için buraya elle iki Standard Ebooks
EPUB'ı koyman gerekiyor:

- Mary Shelley'nin **Frankenstein**'ı
- Ring Lardner'ın **Gullible's Travels**'ı (Jonathan Swift'in
  "Gulliver's Travels"ı DEĞİL — isim benzerliği yanıltıcı, farklı kitap)

Dosya adı ÖNEMLİ DEĞİL — `conftest.py` dosya adına göre değil, EPUB
içindeki gerçek `dc:title` metadata'sına bakarak hangi kitabın hangisi
olduğunu bulur (Standard Ebooks kitaba göre farklı isimlendirme
kullanabiliyor, örn. `mary-shelley_frankenstein.epub` alt çizgili,
başka bir kitap tireli olabilir). `pipeline/tests/fixtures/*.epub`
altındaki her dosya taranır.

Hiç `.epub` yoksa, ya da mevcut dosyaların hiçbirinin başlığı eşleşmiyorsa
bu fixture'lara bağımlı testler açık bir mesajla `skip` edilir, başarısız
olmaz — `pytest -v` çıktısında "SKIPPED" olarak görünür.
