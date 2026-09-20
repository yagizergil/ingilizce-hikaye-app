-- 045_custom_decks.sql
-- Kullanıcının kendi oluşturduğu kelime desteleri ("Kelimelerim" ekranı,
-- 1.0.3). Kitap kelimelerinin SRS altyapısından (user_lemma_state,
-- srs_cards, srs_reviews) BİLİNÇLİ OLARAK AYRI: bu tablolar gerçek sözlük
-- lemma'larına bağlı ve zaten bir belirsizliği var ((user_id, lemma, pos)
-- birincil anahtarı, bkz. CLAUDE.md "hâlâ açık" notu). Kullanıcının serbest
-- yazdığı bir ifadeyi ("get the hang of it" gibi çok kelimeli de olabilir)
-- o şemaya zorlamak hem belirsizliği büyütür hem var olan SRS'i riske
-- atardı. Kolon adları (`ease`, `interval_days`, `repetitions`, `lapses`,
-- `due_at`) srs_cards ile BİREBİR aynı -- src/features/srs/scheduler.ts'teki
-- saf SM-2 fonksiyonu (`scheduleCard`) hiçbir değişiklik olmadan burada da
-- kullanılabiliyor.
--
-- Bu özellik TAMAMEN ÜCRETSİZ (ürün kararı, 2026-09-20): premium'un bu
-- rounddaki vaadi hazır konu desteleri ve AI örnek cümle -- ayrı bir
-- migration'da (Faz 2/3), bu tabloya dokunmadan.

create table public.custom_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color_key text not null default 'terracotta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_decks_user_id_idx on public.custom_decks (user_id, created_at desc);

alter table public.custom_decks enable row level security;

create policy "custom_decks_all_own"
  on public.custom_decks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.custom_deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.custom_decks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  surface text not null check (char_length(trim(surface)) > 0),
  meaning text not null check (char_length(trim(meaning)) > 0),
  example_sentence text,
  due_at timestamptz not null default now(),
  interval_days numeric not null default 0,
  ease numeric not null default 2.5,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Deste içi kelime listesi (en yeni üstte) ve "bu destenin bugün vadesi
-- gelen kartları" sorgusu için.
create index custom_deck_cards_deck_id_idx on public.custom_deck_cards (deck_id, created_at desc);
create index custom_deck_cards_due_idx on public.custom_deck_cards (user_id, due_at);

alter table public.custom_deck_cards enable row level security;

-- `user_id` sütunu deck_id üzerinden zaten dolaylı olarak kapsamlı, ama
-- ayrıca tutuluyor ki RLS her satırda bir join'e (custom_decks'e) muhtaç
-- kalmasın -- srs_cards'ın kendi user_id'sini tutma deseniyle aynı.
create policy "custom_deck_cards_all_own"
  on public.custom_deck_cards for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tekrar geçmişi -- srs_reviews ile aynı amaç, Faz 4'teki "en çok
-- unuttuğun kelimeler" analizi için şimdiden biriktiriliyor. Yazılamazsa
-- (bkz. useReviewCardMutation'daki aynı karar) kartın planı zaten
-- yazılmış olur; bu tablo yalnızca raporlama için, akışı bloklamıyor.
create table public.custom_deck_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.custom_deck_cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating in (0, 3, 5)),
  elapsed_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index custom_deck_reviews_card_id_idx on public.custom_deck_reviews (card_id, created_at desc);

alter table public.custom_deck_reviews enable row level security;

create policy "custom_deck_reviews_all_own"
  on public.custom_deck_reviews for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- `updated_at` deste yeniden adlandırılınca/renk değişince elle
-- güncellenebilir, ama bir tetikleyici burada daha güvenli: istemci
-- unutursa bile tutarlı kalır.
create function public.set_custom_decks_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger custom_decks_set_updated_at
  before update on public.custom_decks
  for each row
  execute function public.set_custom_decks_updated_at();

-- Deste listesi ekranı her deste için kart sayısı + bugün vadesi gelen
-- sayısını gösteriyor. Bunu istemcide `custom_deck_cards`ın HAM
-- satırlarını çekip saymak yerine veritabanında topluyoruz -- bu denetimde
-- ÜÇ KEZ bulunan "PostgREST'in 1000 satır varsayılan sınırı satırları
-- sessizce kesiyor" hatasının (book_lemmas, book_paragraphs, books) aynı
-- sınıfını burada baştan önlüyor: çok sayıda kartı olan bir kullanıcı
-- ileride bu sınırı görürdü.
create function public.custom_deck_counts()
returns table (deck_id uuid, card_count bigint, due_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.deck_id,
    count(*) as card_count,
    count(*) filter (where c.due_at <= now()) as due_count
  from public.custom_deck_cards c
  where c.user_id = auth.uid()
  group by c.deck_id;
$$;
