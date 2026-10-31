-- 059: Supabase güvenlik denetçisinin (get_advisors, 2026-10-31) iki bulgusu.
--
-- 1) `public.lemma_canonical` YİNE SECURITY DEFINER (ERROR, lint 0010).
--
--    Migration 021 görünüme `security_invoker = true` koymuştu. Migration
--    042 görünümü performans için `create or replace view` ile yeniden
--    tanımladı ve WITH (...) yazmadı; canlıda `reloptions` boş, yani seçenek
--    o gün sessizce düştü. Görünüm yine sorguyu atanın değil sahibinin
--    (postgres) yetkileri ve RLS'iyle çalışıyor.
--
--    Pratik sızıntı yok: alttaki `lemmas` tablosunda RLS açık ve
--    `lemmas_select_all` politikası anon + authenticated için `true` (canlıda
--    doğrulandı). `security_invoker` ile sonuç satırları birebir aynı; tek
--    fark, ileride `lemmas`'a bir politika eklenirse görünümün onu artık
--    atlamaması.
--
--    DERS: bu görünümü bir daha `create or replace view` ile yeniden
--    tanımlayan migration `with (security_invoker = true)` YAZMAK ZORUNDA.
--
-- 2) Beş SECURITY DEFINER fonksiyon `anon` rolüyle çağrılabiliyor (WARN,
--    lint 0028). Migration 049/050 izni açıkça `anon`'a verdi; 053/054
--    yalnızca `public`'ten geri aldı, Supabase'in varsayılan ayrıcalıkları
--    `anon`'a ayrıca verdiği için izin kaldı.
--
--    `anon` POSTGRES ROLÜ != uygulamanın "misafir" kullanıcısı. Uygulama
--    açılışta `signInAnonymously()` ile oturum açıyor (AuthGate ->
--    useAuthBootstrap); o oturumun JWT rolü `authenticated`, yalnızca
--    `is_anonymous` claim'i taşıyor (bkz. migration 010). `anon` rolü,
--    oturumsuz, yalnızca yayınlanabilir anahtarla atılan istek demek ve
--    uygulama bu beş RPC'yi oturum kurulmadan hiçbir yerde çağırmıyor
--    (useSmartPractice, useWordPackQuery, useXpQuery, useGoalProgressQuery
--    hepsi AuthGate'in arkasında). Dolayısıyla geri almak akışı bozmaz.
--
--    Fonksiyonlar oturumsuz çağrıda zaten bir şey sızdırmıyordu
--    (`auth.uid()` null: ya 'not_authenticated' hatası ya boş/sıfır sonuç),
--    ama oturumsuz bir istemcinin security definer kod çalıştırabilmesi
--    gereksiz bir yüzey.
--
--    BİLEREK DOKUNULMAYAN: `has_active_premium()`. `book_quiz_questions`
--    tablosunun "level 1 for everyone, others premium" politikası anon +
--    authenticated rollerine tanımlı ve gövdesinde `(select
--    has_active_premium())` var. Politika ifadesindeki fonksiyonun EXECUTE
--    izni sorguyu atan rolle denetlenir; anon'dan geri almak, anon'un o
--    tabloyu okumasını "permission denied for function" ile kırar. Fonksiyon
--    yalnızca `auth.uid()`'in kendi satırına bakıyor ve anon'da her zaman
--    false döndürüyor (sızıntı yok). Denetçi uyarısı bu yüzden bilinçli
--    olarak açık kalıyor; kapatmak isteyen önce politikayı yalnızca
--    `authenticated`'a daraltmalı (ayrı karar).
--
-- İdempotent: `alter view ... set` ve `revoke/grant` tekrar çalıştırılabilir.
--
-- GERİ ALMA:
--   alter view public.lemma_canonical reset (security_invoker);
--   grant execute on function public.consume_smart_practice() to anon;
--   grant execute on function public.my_smart_practice_quota() to anon;
--   grant execute on function public.level_word_pack(text, text, integer) to anon;
--   grant execute on function public.get_user_xp(date) to anon;
--   grant execute on function public.get_goal_progress(date) to anon;

alter view if exists public.lemma_canonical set (security_invoker = true);

revoke execute on function public.consume_smart_practice() from public, anon;
grant execute on function public.consume_smart_practice() to authenticated, service_role;

revoke execute on function public.my_smart_practice_quota() from public, anon;
grant execute on function public.my_smart_practice_quota() to authenticated, service_role;

revoke execute on function public.level_word_pack(text, text, integer) from public, anon;
grant execute on function public.level_word_pack(text, text, integer) to authenticated, service_role;

revoke execute on function public.get_user_xp(date) from public, anon;
grant execute on function public.get_user_xp(date) to authenticated, service_role;

revoke execute on function public.get_goal_progress(date) from public, anon;
grant execute on function public.get_goal_progress(date) to authenticated, service_role;
