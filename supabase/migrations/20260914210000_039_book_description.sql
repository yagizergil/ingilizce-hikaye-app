-- 039: Kitap açıklaması ("hakkında" metni)
--
-- NEDEN YENİ BİR SÜTUN: `subtitle` vardı ama o kitabın alt başlığı (çoğu
-- kitapta boş ve boş olmayanlarda tek satır); kitap detayında gösterilecek
-- 3-5 cümlelik tanıtım metninin yeri değil. Katalogdaki 356 kitabın
-- HİÇBİRİNDE böyle bir metin yoktu -- kitap detayı bu yüzden kapak, seviye
-- ve bölüm listesinden ibaretti.
--
-- DİL: metin kitabın KENDİ dilinde (`books.target_language`). Kullanıcının
-- ana dilinde değil, çünkü kitabı okumaya aday kişi zaten o dili okumaya
-- çalışıyor ve açıklama da o seviyede bir okuma pratiği. Referans uygulama
-- da böyle yapıyor. Ana dilde ikinci bir metin gerekirse ayrı bir tablo
-- (kitap x dil) işi olur; bugün ihtiyacı yok.
--
-- RLS: `books` tablosunun mevcut politikaları geçerli (yayındaki kitaplar
-- herkese okunur, yazma yalnızca service_role). Yeni bir politika
-- gerekmiyor -- sütun ekleniyor, tablo değil.

alter table public.books
  add column if not exists description text;

comment on column public.books.description is
  'Kitap detayındaki tanıtım metni. Kitabın kendi dilinde (target_language), 3-5 cümle.';
