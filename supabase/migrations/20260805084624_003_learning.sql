-- 003_learning.sql
-- Öğrenme motoru: SRS kartları, tekrar kayıtları, kelime hazinesi tahmini.

-- ---------------------------------------------------------------------------
-- srs_cards
-- ---------------------------------------------------------------------------
create table public.srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lemma text not null,
  sentence_id uuid references public.book_sentences (id) on delete set null,
  card_type text not null default 'recognition'
    check (card_type in ('recognition', 'production', 'listening')),
  due_at timestamptz not null default now(),
  interval_days numeric not null default 0,
  ease numeric not null default 2.5,
  stability numeric,
  difficulty numeric,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  last_reviewed_at timestamptz,
  unique (user_id, lemma, card_type)
);

-- Günlük tekrar kuyruğunu çekmek için ("bu kullanıcının bugün vadesi gelen kartları").
create index srs_cards_due_idx on public.srs_cards (user_id, due_at);

alter table public.srs_cards enable row level security;

create policy "srs_cards_all_own"
  on public.srs_cards for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- srs_reviews
-- ---------------------------------------------------------------------------
create table public.srs_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.srs_cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 4),
  reviewed_at timestamptz not null default now(),
  elapsed_ms integer
);

create index srs_reviews_card_id_idx on public.srs_reviews (card_id, reviewed_at desc);
create index srs_reviews_user_id_idx on public.srs_reviews (user_id, reviewed_at desc);

alter table public.srs_reviews enable row level security;

create policy "srs_reviews_all_own"
  on public.srs_reviews for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_vocabulary_estimate
-- ---------------------------------------------------------------------------
create table public.user_vocabulary_estimate (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimated_size integer not null,
  cefr_level text,
  method text,
  measured_at timestamptz not null default now()
);

create index user_vocabulary_estimate_user_id_idx on public.user_vocabulary_estimate (user_id, measured_at desc);

alter table public.user_vocabulary_estimate enable row level security;

create policy "user_vocabulary_estimate_all_own"
  on public.user_vocabulary_estimate for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
