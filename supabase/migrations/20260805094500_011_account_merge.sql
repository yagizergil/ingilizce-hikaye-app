-- 011_account_merge.sql
-- Anonim -> kayıtlı geçiş, sağlayıcıya göre iki farklı yol izler:
--
-- 1) E-posta (magic link): istemci tarafında anonim oturumdayken
--    supabase.auth.updateUser({ email }) çağrılır — bu, Supabase'in
--    resmi "anonim kullanıcıyı kalıcıya çevirme" akışıdır ve aynı
--    user_id'yi korur (is_anonymous false olur). Veri taşımaya gerek
--    yok, hiçbir satır user_id değiştirmez.
--
-- 2) Apple / Google (native id_token akışı): supabase-js'in
--    signInWithIdToken() çağrısı anonim oturumu bu sağlayıcıya
--    otomatik bağlamaz (linkIdentity yalnızca tarayıcı tabanlı OAuth
--    akışı için var, native id_token için değil) — bu yüzden Apple/
--    Google girişi YENİ bir auth.users satırı oluşturur. Bu fonksiyon
--    eski anonim kullanıcının verisini yeni (gerçek) kullanıcıya taşır,
--    sonra eski anonim auth.users satırını siler.
create or replace function public.merge_anonymous_account(p_anonymous_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_user_id uuid;
  v_old_is_anonymous boolean;
begin
  v_new_user_id := auth.uid();
  if v_new_user_id is null then
    raise exception 'not authorized';
  end if;
  if v_new_user_id = p_anonymous_user_id then
    raise exception 'cannot merge account into itself';
  end if;

  select is_anonymous into v_old_is_anonymous
  from auth.users
  where id = p_anonymous_user_id;

  if v_old_is_anonymous is distinct from true then
    raise exception 'source account is not anonymous';
  end if;

  -- Yeni hesap az önce oluşturulduğu için (Apple/Google ile ilk giriş)
  -- bu tablolarda henüz satırı yok — çakışma (PK ihlali) beklenmiyor,
  -- yine de ON CONFLICT ile güvenceye alınıyor.
  update public.user_saved_words set user_id = v_new_user_id where user_id = p_anonymous_user_id;

  insert into public.user_lemma_state (user_id, lemma, pos, state, first_seen_at, last_seen_at, seen_count, source_book_id)
  select v_new_user_id, lemma, pos, state, first_seen_at, last_seen_at, seen_count, source_book_id
  from public.user_lemma_state
  where user_id = p_anonymous_user_id
  on conflict (user_id, lemma, pos) do nothing;
  delete from public.user_lemma_state where user_id = p_anonymous_user_id;

  insert into public.user_book_progress (user_id, book_id, section_id, paragraph_index, percent, started_at, finished_at, total_seconds, last_read_at)
  select v_new_user_id, book_id, section_id, paragraph_index, percent, started_at, finished_at, total_seconds, last_read_at
  from public.user_book_progress
  where user_id = p_anonymous_user_id
  on conflict (user_id, book_id) do nothing;
  delete from public.user_book_progress where user_id = p_anonymous_user_id;

  update public.srs_cards set user_id = v_new_user_id where user_id = p_anonymous_user_id;
  update public.srs_reviews set user_id = v_new_user_id where user_id = p_anonymous_user_id;
  update public.user_reading_sessions set user_id = v_new_user_id where user_id = p_anonymous_user_id;

  insert into public.user_reading_stats (user_id, date, words_read, minutes, wpm, new_lemmas, streak_day)
  select v_new_user_id, date, words_read, minutes, wpm, new_lemmas, streak_day
  from public.user_reading_stats
  where user_id = p_anonymous_user_id
  on conflict (user_id, date) do nothing;
  delete from public.user_reading_stats where user_id = p_anonymous_user_id;

  update public.user_vocabulary_estimate set user_id = v_new_user_id where user_id = p_anonymous_user_id;

  delete from public.user_book_coverage_cache where user_id = p_anonymous_user_id;

  -- Eski anonim hesabı sil (auth.identities vb. auth şemasının kendi
  -- cascade'leri devreye girer; public.* tablolarda artık satırı yok).
  delete from auth.users where id = p_anonymous_user_id and is_anonymous = true;
end;
$$;

revoke execute on function public.merge_anonymous_account(uuid) from public, anon;
grant execute on function public.merge_anonymous_account(uuid) to authenticated;
