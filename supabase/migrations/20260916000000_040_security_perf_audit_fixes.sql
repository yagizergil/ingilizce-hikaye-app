-- Denetim bulgusu (2026-09-16): consume_word_lookup() ve my_word_lookup_quota()
-- migration 038'de olusturulurken 030_revoke_public_execute'in kurdugu norma
-- uyulmamis -- ikisi de 'anon' rolune (JWT'siz cagri) hala calistirilabilir
-- durumdaydi. Fonksiyonlarin kendisi auth.uid() NULL oldugunda guvenli
-- davraniyor (hata donuyor / sifir kota donuyor), yani gercek bir veri
-- sizintisi YOKTU -- ama diger 10 fonksiyonla tutarli olmasi ve gereksiz
-- saldiri yuzeyini kapatmasi icin anon'dan EXECUTE yetkisi kaldiriliyor.
revoke execute on function public.consume_word_lookup() from anon;
revoke execute on function public.my_word_lookup_quota() from anon;

-- Performans denetimi: RLS politikalari auth.uid() / current_setting()'i
-- HER SATIR icin yeniden hesapliyordu (Supabase linter 0003). Sorguyu
-- planlama asamasinda BIR KEZ hesaplanacak sekilde (select auth.uid())
-- kalibina cekiyoruz -- davranis AYNI, yalnizca buyuk tablolarda satir
-- basina fonksiyon cagrisi kalkiyor.
alter policy user_language_pairs_select_own on public.user_language_pairs
  using ((select auth.uid()) = user_id);

alter policy analytics_events_insert_own on public.analytics_events
  with check ((select auth.uid()) = user_id);

alter policy user_favorites_all_own on public.user_favorites
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Eksik foreign-key indeksleri (Supabase linter 0001) -- bu FK'ler uzerinden
-- JOIN/DELETE yapildiginda sequential scan'e dusuluyordu.
create index if not exists lemma_translations_native_language_idx
  on public.lemma_translations (native_language);
create index if not exists profiles_native_language_idx
  on public.profiles (native_language);
create index if not exists user_favorites_book_id_idx
  on public.user_favorites (book_id);
create index if not exists user_language_pairs_native_language_idx
  on public.user_language_pairs (native_language);
create index if not exists user_language_pairs_target_language_idx
  on public.user_language_pairs (target_language);
create index if not exists user_saved_words_paragraph_id_idx
  on public.user_saved_words (paragraph_id);
