-- 048_custom_deck_reviews_user_id_index.sql
-- DENETİM BULGUSU (2026-09-20, get_advisors performans taraması):
-- custom_deck_reviews.user_id yabancı anahtarının kapsayan bir indeksi
-- yoktu -- bu tam olarak projenin kendi geçmişinde (migration 043)
-- gerçek yavaş sorgulara sebep olduğu için düzeltilen hata sınıfı.
create index custom_deck_reviews_user_id_idx on public.custom_deck_reviews (user_id);
