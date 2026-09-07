-- 030_revoke_public_execute.sql
-- SECURITY DEFINER fonksiyonlarından varsayılan PUBLIC execute hakkını kaldırır.
--
-- NEDEN: PostgreSQL bir fonksiyon oluşturulduğunda EXECUTE hakkını
-- otomatik olarak PUBLIC'e verir. Migration 029'da `my_ai_sentence_quota()`
-- yalnızca `authenticated` için grant edilmişti ama varsayılan PUBLIC hakkı
-- durduğu için fonksiyon `anon` rolünden de çağrılabiliyordu (Supabase
-- güvenlik denetçisi bunu yakaladı). SECURITY DEFINER bir fonksiyonun
-- oturum açmamış bir çağrıya açık olması istenmeyen bir yüzeydir.
--
-- Aynı kusur migration 024 ve 026'daki iki fonksiyonda da vardı; aynı
-- işlemle kapatılıyor. Uygulama yalnızca `authenticated` rolüyle çağırıyor
-- (Supabase'in anonim oturumları da `authenticated` rolündedir, `anon`
-- değil), bu yüzden istemcide hiçbir şey değişmiyor.

revoke execute on function public.my_ai_sentence_quota() from public, anon;
grant execute on function public.my_ai_sentence_quota() to authenticated;

-- Trigger fonksiyonu: tetikleyici çalışırken EXECUTE hakkı aranmaz, bu
-- yüzden REST üzerinden çağrılabilir olmasının hiçbir meşru kullanımı yok.
revoke execute on function public.enforce_saved_word_limit() from public, anon, authenticated;

revoke execute on function public.record_reading_session(uuid, integer, integer) from public, anon;
grant execute on function public.record_reading_session(uuid, integer, integer) to authenticated;
