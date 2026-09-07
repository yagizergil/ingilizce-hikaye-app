-- 001_content.sql
-- İçerik şeması: books, sections, paragraphs, sentences, tokens, lemmas, collections.
-- Tüm içerik tabloları herkese (anon dahil) SELECT ile açık, sadece service_role yazar.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Ortak yardımcı: updated_at trigger fonksiyonu
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- lemmas
-- ---------------------------------------------------------------------------
create table public.lemmas (
  lemma text not null,
  pos text not null,
  cefr_level text,
  frequency_rank integer,
  tr_gloss text,
  ipa text,
  audio_url text,
  is_phrasal boolean not null default false,
  false_friend_note_tr text,
  primary key (lemma, pos)
);

alter table public.lemmas enable row level security;

create policy "lemmas_select_all"
  on public.lemmas for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- books
-- ---------------------------------------------------------------------------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  author text,
  author_death_year integer,
  source text,
  source_url text,
  license text,
  license_text text,
  attribution text,

  content_type text not null default 'novel'
    check (content_type in ('novel', 'collection', 'short_story', 'article')),
  is_adaptation boolean not null default false,
  adapted_from_book_id uuid references public.books (id) on delete set null,

  cefr_level text,
  word_count integer,
  unique_lemma_count integer,
  avg_sentence_length numeric,
  max_sentence_length integer,

  coverage_a1 numeric,
  coverage_a2 numeric,
  coverage_b1 numeric,
  coverage_b2 numeric,
  coverage_c1 numeric,
  coverage_c2 numeric,
  off_list_ratio numeric,
  dialect_ratio numeric,
  dialogue_ratio numeric,
  archaic_ratio numeric,

  estimated_minutes integer,
  cover_url text,
  has_audio boolean not null default false,

  genres text[] not null default '{}',
  themes text[] not null default '{}',
  content_warnings text[] not null default '{}',
  age_rating text,

  status text not null default 'draft'
    check (status in ('draft', 'needs_review', 'published', 'archived')),
  published_at timestamptz,

  popularity_score numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_status_idx on public.books (status);
create index books_popularity_idx on public.books (popularity_score desc) where status = 'published';
create index books_cefr_level_idx on public.books (cefr_level);

alter table public.books enable row level security;

create policy "books_select_published"
  on public.books for select
  to anon, authenticated
  using (status = 'published');

create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- book_sections
-- ---------------------------------------------------------------------------
create table public.book_sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  order_index integer not null,
  title text,
  kind text not null default 'chapter'
    check (kind in ('letter', 'chapter', 'story', 'part')),
  word_count integer,
  estimated_minutes integer,
  audio_url text,
  audio_timings_url text,
  unique (book_id, order_index)
);

create index book_sections_book_id_idx on public.book_sections (book_id, order_index);

alter table public.book_sections enable row level security;

create policy "book_sections_select_published"
  on public.book_sections for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = book_sections.book_id and b.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- book_paragraphs
-- ---------------------------------------------------------------------------
create table public.book_paragraphs (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.book_sections (id) on delete cascade,
  order_index integer not null,
  text text not null,
  sentence_count integer not null default 0,
  is_dialogue boolean not null default false,
  unique (section_id, order_index)
);

create index book_paragraphs_section_id_idx on public.book_paragraphs (section_id, order_index);

alter table public.book_paragraphs enable row level security;

create policy "book_paragraphs_select_published"
  on public.book_paragraphs for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.book_sections s
      join public.books b on b.id = s.book_id
      where s.id = book_paragraphs.section_id and b.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- book_sentences
-- ---------------------------------------------------------------------------
create table public.book_sentences (
  id uuid primary key default gen_random_uuid(),
  paragraph_id uuid not null references public.book_paragraphs (id) on delete cascade,
  order_index integer not null,
  text text not null,
  char_start integer,
  char_end integer,
  cefr_level text,
  word_count integer,
  unique (paragraph_id, order_index)
);

create index book_sentences_paragraph_id_idx on public.book_sentences (paragraph_id, order_index);

alter table public.book_sentences enable row level security;

create policy "book_sentences_select_published"
  on public.book_sentences for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.book_paragraphs p
      join public.book_sections s on s.id = p.section_id
      join public.books b on b.id = s.book_id
      where p.id = book_sentences.paragraph_id and b.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- book_tokens
-- En büyük tablo (~70k satır/kitap). book_id burada bilinçli olarak
-- denormalize edildi: sentence -> paragraph -> section -> book zincirini
-- coverage/lemma sorgularında join'lemek yerine doğrudan book_id ile
-- filtrelemek için. Partitioning bu ölçekte (yüzlerce kitapta bile
-- düşük milyonlarca satır) gerekli değil; doğru index'ler yeterli.
-- ---------------------------------------------------------------------------
create table public.book_tokens (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid not null references public.book_sentences (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  order_index integer not null,
  surface text not null,
  lemma text,
  pos text,
  cefr_level text,
  char_start integer,
  char_end integer,
  is_proper_noun boolean not null default false,
  unique (sentence_id, order_index)
);

-- Cümle render sırası için (okuma ekranı bunu kullanır).
create index book_tokens_sentence_id_idx on public.book_tokens (sentence_id, order_index);
-- Coverage hesabı ve "bu kelime hangi kitaplarda geçiyor" için.
create index book_tokens_lemma_idx on public.book_tokens (lemma);
-- book_lemmas/coverage toplu hesaplarında book_id ile taramak için.
create index book_tokens_book_id_idx on public.book_tokens (book_id);

alter table public.book_tokens enable row level security;

create policy "book_tokens_select_published"
  on public.book_tokens for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = book_tokens.book_id and b.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- book_lemmas (kitap başına lemma sayımı — coverage hesabının girdisi)
-- ---------------------------------------------------------------------------
create table public.book_lemmas (
  book_id uuid not null references public.books (id) on delete cascade,
  lemma text not null,
  count integer not null default 0,
  primary key (book_id, lemma)
);

create index book_lemmas_lemma_idx on public.book_lemmas (lemma);

alter table public.book_lemmas enable row level security;

create policy "book_lemmas_select_published"
  on public.book_lemmas for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = book_lemmas.book_id and b.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- collections & collection_books
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_key text not null,
  description_key text,
  order_index integer not null default 0,
  is_active boolean not null default true
);

alter table public.collections enable row level security;

create policy "collections_select_active"
  on public.collections for select
  to anon, authenticated
  using (is_active = true);

create table public.collection_books (
  collection_id uuid not null references public.collections (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  order_index integer not null default 0,
  primary key (collection_id, book_id)
);

create index collection_books_book_id_idx on public.collection_books (book_id);

alter table public.collection_books enable row level security;

create policy "collection_books_select_all"
  on public.collection_books for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_books.collection_id and c.is_active = true
    )
  );
