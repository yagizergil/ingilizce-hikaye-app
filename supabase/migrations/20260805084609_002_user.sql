-- 002_user.sql
-- Kullanıcı verisi: profiles, saved words, lemma state, progress, entitlements.
-- Tüm tablolarda RLS: kullanıcı sadece kendi satırına erişir (auth.uid() = user_id).

-- ---------------------------------------------------------------------------
-- profiles (auth.users ile 1:1)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  native_language text not null default 'tr',
  target_level text,
  daily_goal_minutes integer not null default 10,
  notification_settings jsonb not null default '{}'::jsonb,
  reading_prefs jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_lemma_state
-- ---------------------------------------------------------------------------
create table public.user_lemma_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  lemma text not null,
  pos text not null,
  state text not null default 'new'
    check (state in ('new', 'learning', 'known', 'ignored')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count integer not null default 1,
  source_book_id uuid references public.books (id) on delete set null,
  primary key (user_id, lemma, pos)
);

create index user_lemma_state_user_id_idx on public.user_lemma_state (user_id);
create index user_lemma_state_lemma_idx on public.user_lemma_state (lemma);

alter table public.user_lemma_state enable row level security;

create policy "user_lemma_state_all_own"
  on public.user_lemma_state for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_saved_words
-- ---------------------------------------------------------------------------
create table public.user_saved_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lemma text not null,
  surface text not null,
  sentence_id uuid references public.book_sentences (id) on delete set null,
  book_id uuid references public.books (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index user_saved_words_user_id_idx on public.user_saved_words (user_id, created_at desc);

alter table public.user_saved_words enable row level security;

create policy "user_saved_words_all_own"
  on public.user_saved_words for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_book_progress
-- ---------------------------------------------------------------------------
create table public.user_book_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  section_id uuid references public.book_sections (id) on delete set null,
  paragraph_index integer not null default 0,
  percent numeric not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_seconds integer not null default 0,
  last_read_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index user_book_progress_user_id_idx on public.user_book_progress (user_id, last_read_at desc);

alter table public.user_book_progress enable row level security;

create policy "user_book_progress_all_own"
  on public.user_book_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_entitlements
-- RevenueCat webhook'undan (Edge Function, service_role) yazılır.
-- Kullanıcı sadece kendi satırını okuyabilir, yazamaz.
-- ---------------------------------------------------------------------------
create table public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free',
  expires_at timestamptz,
  source text,
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements enable row level security;

create policy "user_entitlements_select_own"
  on public.user_entitlements for select
  to authenticated
  using (auth.uid() = user_id);

create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function public.set_updated_at();
