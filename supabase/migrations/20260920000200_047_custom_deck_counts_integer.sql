-- 047_custom_deck_counts_integer.sql
-- DENETİM BULGUSU (2026-09-20, kod incelemesi): custom_deck_counts()
-- bigint dönüyordu. Projenin kendi emsali (book_section_counts,
-- migration 025) bilerek count(*)::integer kullanıyor -- bigint'in
-- PostgREST/JSON üzerinden bazı yapılandırmalarda sayı yerine metin
-- olarak dönebilmesi riskini baştan kapatmak için. Dönüş tipi
-- değiştiği için CREATE OR REPLACE yetmiyor, önce DROP gerekiyor.
drop function public.custom_deck_counts();

create function public.custom_deck_counts()
returns table (deck_id uuid, card_count integer, due_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.deck_id,
    count(*)::integer as card_count,
    count(*) filter (where c.due_at <= now())::integer as due_count
  from public.custom_deck_cards c
  where c.user_id = auth.uid()
  group by c.deck_id;
$$;
