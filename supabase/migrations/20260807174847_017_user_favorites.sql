-- 017_user_favorites.sql
-- Kullanıcının favori kitapları. RLS deseni user_lemma_state/user_book_progress
-- (002_user.sql) ile aynı: "for all" tek politika, auth.uid() = user_id.

create table public.user_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index user_favorites_user_id_idx on public.user_favorites (user_id, created_at desc);

alter table public.user_favorites enable row level security;

create policy "user_favorites_all_own"
  on public.user_favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
