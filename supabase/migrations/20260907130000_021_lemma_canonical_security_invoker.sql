-- 021_lemma_canonical_security_invoker.sql
-- Supabase güvenlik denetçisi (database linter, 0010_security_definer_view)
-- `public.lemma_canonical` view'ini ERROR seviyesinde işaretliyordu:
-- Postgres 15 öncesi davranışta view'ler SECURITY DEFINER gibi çalışır,
-- yani sorguyu ATAN kullanıcının değil view'i OLUŞTURAN kullanıcının
-- yetkileri ve RLS politikaları uygulanır.
--
-- Bu view'in altındaki `lemmas` tablosu zaten herkese açık okunabilir
-- (sözlük verisi), yani pratikte sızan bir veri yoktu. Ama davranışın
-- kendisi yanlış: ileride `lemmas` üzerine bir RLS politikası eklenirse
-- view onu sessizce atlardı. `security_invoker = true` ile view artık
-- sorguyu atan kullanıcının haklarıyla çalışıyor.
--
-- View tanımı 013'teki ile birebir aynı; yalnızca seçenek eklendi.

alter view public.lemma_canonical set (security_invoker = true);
