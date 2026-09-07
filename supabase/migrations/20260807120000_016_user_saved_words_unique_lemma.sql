-- 016_user_saved_words_unique_lemma.sql
-- `user_saved_words` had no uniqueness constraint, so saving the same lemma
-- twice silently created a duplicate row instead of erroring — the client
-- worked around this with a cache pre-check only (see
-- src/features/reader/api/useSavedWordsQuery.ts), which is a race-prone
-- optimistic-UI fast path, not a real guarantee. Adding a real UNIQUE
-- constraint lets the client use a genuine `.upsert(..., { onConflict:
-- "user_id,lemma", ignoreDuplicates: true })`, making a second save of the
-- same lemma an idempotent no-op at the database level instead of a
-- user-visible error.
--
-- RLS is unaffected: `user_saved_words_all_own` (see
-- supabase/migrations/20260805084609_002_user.sql) already scopes every
-- operation to `auth.uid() = user_id`; adding a UNIQUE constraint changes
-- write conflict behavior, not row visibility, so the existing policy
-- still applies unchanged.
alter table public.user_saved_words
  add constraint user_saved_words_user_id_lemma_key unique (user_id, lemma);
