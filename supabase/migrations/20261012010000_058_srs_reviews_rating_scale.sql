-- 058: srs_reviews.rating kısıtı istemcinin gönderdiği ölçekle uyuşmuyordu.
--
-- BULGU (2026-10-12, telemetri `client_error` source=srs.reviewHistory,
-- 1.0.7-1.0.10): migration 003 kısıtı `rating between 1 and 4` (FSRS
-- ölçeği) koydu, ama istemci SM-2 puanlarını yazıyor: again=0, hard=3,
-- easy=5 (useReviewCardMutation). "again" ve "easy" HER ZAMAN 23514 ile
-- reddediliyordu; canlıda yalnızca rating=3 satırları var (6 satır).
-- Kartın planı ayrı bir update ile yazıldığı için kullanıcı bunu görmedi,
-- yalnızca tekrar geçmişi (ileride FSRS uydurmanın girdisi) eksik kaldı.
--
-- Düzeltme SUNUCUDA, istemcide değil: mağazadaki eski build'ler de 0/3/5
-- gönderiyor. custom_deck_reviews (migration 045) zaten aynı ölçeği
-- kullanıyor; iki tablo artık aynı.
--
-- Geri alma: alter table public.srs_reviews drop constraint srs_reviews_rating_check;
--   alter table public.srs_reviews add constraint srs_reviews_rating_check check (rating between 1 and 4);
--   (önce 0 ve 5 satırları silinmeli/dönüştürülmeli)

alter table public.srs_reviews drop constraint srs_reviews_rating_check;
alter table public.srs_reviews
  add constraint srs_reviews_rating_check check (rating = any (array[0, 3, 5]));
