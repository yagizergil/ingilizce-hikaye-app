-- 005_lint_fixes.sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy "user_lemma_state_all_own" on public.user_lemma_state;
create policy "user_lemma_state_all_own"
  on public.user_lemma_state for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "user_saved_words_all_own" on public.user_saved_words;
create policy "user_saved_words_all_own"
  on public.user_saved_words for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "user_book_progress_all_own" on public.user_book_progress;
create policy "user_book_progress_all_own"
  on public.user_book_progress for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy "srs_cards_all_own" on public.srs_cards;
create policy "srs_cards_all_own"
  on public.srs_cards for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "srs_reviews_all_own" on public.srs_reviews;
create policy "srs_reviews_all_own"
  on public.srs_reviews for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "user_vocabulary_estimate_all_own" on public.user_vocabulary_estimate;
create policy "user_vocabulary_estimate_all_own"
  on public.user_vocabulary_estimate for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "user_reading_sessions_all_own" on public.user_reading_sessions;
create policy "user_reading_sessions_all_own"
  on public.user_reading_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "user_reading_stats_all_own" on public.user_reading_stats;
create policy "user_reading_stats_all_own"
  on public.user_reading_stats for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy "user_book_coverage_cache_all_own" on public.user_book_coverage_cache;
create policy "user_book_coverage_cache_all_own"
  on public.user_book_coverage_cache for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index books_adapted_from_book_id_idx on public.books (adapted_from_book_id);
create index srs_cards_sentence_id_idx on public.srs_cards (sentence_id);
create index user_book_coverage_cache_book_id_idx on public.user_book_coverage_cache (book_id);
create index user_book_progress_book_id_idx on public.user_book_progress (book_id);
create index user_book_progress_section_id_idx on public.user_book_progress (section_id);
create index user_lemma_state_source_book_id_idx on public.user_lemma_state (source_book_id);
create index user_reading_sessions_book_id_idx on public.user_reading_sessions (book_id);
create index user_saved_words_book_id_idx on public.user_saved_words (book_id);
create index user_saved_words_sentence_id_idx on public.user_saved_words (sentence_id);
