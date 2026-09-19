-- 041: Seri (streak) her kullanıcıda SIFIRDI -- yanlış sütuna bakıyordu.
--
-- DENETİM BULGUSU (2026-09-19). `get_user_streak()` bir günü "okunmuş"
-- saymak için `words_read > 0` koşuluna bakıyordu. Ama o sütuna hiçbir
-- zaman sıfırdan farklı bir değer yazılmadı: `record_reading_session`'ın
-- TEK çağıranı (`src/features/reader/api/useReadingSession.ts`) her zaman
-- `p_words_read = 0` gönderiyor. Sonuçlar:
--
--   * `get_user_streak()` HER kullanıcı için 0 dönüyordu;
--   * `buildReminderPlan` seri-kurtarma bildirimi için `streakDays >= 2`
--     istediğinden o bildirim HİÇ ateşlenemiyordu -- birim testleri geçen,
--     ama üründe var olmayan bir tutundurma özelliği;
--   * `useReminderDataQuery`'deki `readToday` de hep `false` olduğu için
--     "kitabına dön" bildirimi kullanıcının GERÇEKTEN okuduğu günlerde bile
--     gönderiliyordu -- tam olarak `reminders` modülünün kendi yorumunun
--     "olmamalı" dediği şey.
--
-- NEDEN SÜRE, KELİME DEĞİL: istemci okuma süresini dürüst biçimde yazıyor
-- (`record_reading_session` saniyeyi alıp `minutes`e ekliyor) -- uygulama
-- arka plana alınınca sayaç duruyor, 1 saniyenin altı hiç yazılmıyor,
-- 2 saatin üstü migration 026'da kırpılıyor. Yani "bu kullanıcı bugün
-- okudu mu" sorusunun cevabı zaten tabloda vardı; fonksiyon yanlış sütuna
-- soruyordu. Okunan kelimeyi istemcide saymaya kalkmak yeni ve kırılgan
-- bir ölçüm işi olurdu (sayfalama, atlanan bölümler, geri dönüşler) ve
-- serinin ihtiyaç duyduğu bilgi o değil.
--
-- `words_read` sütunu DURUYOR: veri kaybı yok ve ileride gerçekten
-- ölçülürse yeri hazır. Yalnızca serinin tanımı ondan ayrıldı.
--
-- GERİYE DÖNÜK ETKİ: geçmiş günlerin `minutes` değerleri zaten yazılmış
-- durumda, yani bu değişiklik var olan okuma günlerini de seriye dahil
-- ediyor. Kullanıcı bir anda hak ettiği seriyi görüyor -- sıfırdan
-- başlamıyor.
--
-- Geri alma: aşağıdaki gövdede `minutes > 0` yerine `words_read > 0`
-- yazıp yeniden çalıştırmak yeterli.

create or replace function public.get_user_streak()
returns integer
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_today date;
  v_cursor date;
  v_streak integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authorized';
  end if;

  v_today := (now() at time zone 'Europe/Istanbul')::date;
  v_cursor := v_today;

  -- Bugün henüz okunmadıysa seri KIRILMIŞ sayılmıyor: gün bitmedi.
  -- Sayım düne kayıyor (bu davranış değişmedi, yalnızca koşul düzeldi).
  if not exists (
    select 1 from public.user_reading_stats
    where user_id = v_user_id and date = v_today and minutes > 0
  ) then
    v_cursor := v_today - 1;
  end if;

  loop
    exit when not exists (
      select 1 from public.user_reading_stats
      where user_id = v_user_id and date = v_cursor and minutes > 0
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return v_streak;
end;
$function$;
