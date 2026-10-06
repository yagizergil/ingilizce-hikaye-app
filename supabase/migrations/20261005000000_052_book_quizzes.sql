-- 052: Kitap quizleri -- her kitap için kolaydan zora 3 basamak.
--
--   level 1  "Kelime"       kitaptaki kelimelerin bağlam içindeki anlamı   ÜCRETSİZ
--   level 2  "Anlama"       kim / ne / nerede / ne oldu                    PREMIUM
--   level 3  "Derin okuma"  neden, çıkarım, olay sırası, karakter niyeti   PREMIUM
--
-- Sorular pipeline'da (pipeline/scripts/generate_book_quizzes.py) kitabın
-- kendi metninden, kendi dilinde ve seviyesinde üretilir; istemci yazamaz.
--
-- Premium kapısı SUNUCUDA (ADR-009 / migration 038 deseni): 2. ve 3.
-- basamağın soru satırları RLS ile yalnızca aktif premium kullanıcıya
-- görünür. Quiz meta satırları (book_quizzes) herkese açık: kilitli
-- basamaklar da listede görünsün diye.
--
-- Basamak açılma kuralı (öncekinden %60) bir ÖĞRENME sırasıdır, güvenlik
-- değil; istemcide uygulanır. Sunucu yalnızca premium kuralını zorlar.

create table public.book_quizzes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  question_count smallint not null check (question_count > 0),
  generation_model text,
  created_at timestamptz not null default now(),
  unique (book_id, level)
);

create table public.book_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.book_quizzes(id) on delete cascade,
  order_index smallint not null,
  kind text not null check (kind in ('vocabulary', 'fact', 'inference', 'sequence', 'motive')),
  prompt text not null,
  options text[] not null check (cardinality(options) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text,
  unique (quiz_id, order_index)
);

create index book_quiz_questions_quiz_id_idx on public.book_quiz_questions (quiz_id);

create table public.user_quiz_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.book_quizzes(id) on delete cascade,
  best_correct smallint not null,
  total smallint not null,
  attempts integer not null default 1,
  last_attempt_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

create index user_quiz_results_quiz_id_idx on public.user_quiz_results (quiz_id);

create or replace function public.has_active_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements e
    where e.user_id = auth.uid()
      and e.tier = 'premium'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

revoke execute on function public.has_active_premium() from public;
grant execute on function public.has_active_premium() to authenticated, anon, service_role;

alter table public.book_quizzes enable row level security;
alter table public.book_quiz_questions enable row level security;
alter table public.user_quiz_results enable row level security;

create policy "book_quizzes readable by everyone"
  on public.book_quizzes for select
  to anon, authenticated
  using (true);

create policy "quiz questions: level 1 for everyone, others premium"
  on public.book_quiz_questions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.book_quizzes q
      where q.id = quiz_id
        and (q.level = 1 or (select public.has_active_premium()))
    )
  );

create policy "own quiz results readable"
  on public.user_quiz_results for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Sonucu yazan TEK yol. Erişimi olmayan bir quiz için sonuç yazılamaz;
-- en iyi skor korunur, deneme sayısı artar.
create or replace function public.submit_book_quiz(p_quiz_id uuid, p_correct integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_level smallint;
  v_total smallint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select q.level, q.question_count into v_level, v_total
  from public.book_quizzes q where q.id = p_quiz_id;

  if v_level is null then
    raise exception 'quiz_not_found';
  end if;
  if v_level > 1 and not public.has_active_premium() then
    raise exception 'premium_required';
  end if;
  if p_correct < 0 or p_correct > v_total then
    raise exception 'invalid_score';
  end if;

  insert into public.user_quiz_results (user_id, quiz_id, best_correct, total)
  values (v_user_id, p_quiz_id, p_correct, v_total)
  on conflict (user_id, quiz_id) do update
    set best_correct = greatest(public.user_quiz_results.best_correct, excluded.best_correct),
        total = excluded.total,
        attempts = public.user_quiz_results.attempts + 1,
        last_attempt_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.submit_book_quiz(uuid, integer) from public, anon;
grant execute on function public.submit_book_quiz(uuid, integer) to authenticated, service_role;
