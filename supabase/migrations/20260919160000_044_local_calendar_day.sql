-- 044: "bugün" tek bir takvime bağlandı -- KULLANICININ CİHAZ GÜNÜNE.
--
-- DENETİM BULGUSU (2026-09-19). Aynı soruya ("bu kullanıcı bugün okudu
-- mu") üç ayrı yerde ÜÇ FARKLI cevap veriliyordu:
--
--   * YAZAN  : `record_reading_session` satırı `(now() at time zone 'utc')`
--              gününe yazıyor.
--   * SERİ   : `get_user_streak()` günleri 'Europe/Istanbul' takvimine
--              göre sayıyor.
--   * OKUYAN : `useProfileStatsQuery` haftalık grafiği ve "bugün okudun"
--              rozetini CİHAZIN yerel gününe göre çiziyor.
--
-- Türkiye UTC+3: gece 00:00-03:00 arası okuyan bir kullanıcının satırı
-- DÜNE yazılıyor. Profil "bugün okumadın" diyor, haftalık grafik dakikayı
-- yanlış çubuğa koyuyor, ve gece okumayı alışkanlık edinmiş bir kullanıcı
-- serisini hiç göremiyor. UTC-5'teki bir kullanıcıda kayma ters yöne
-- çalışıyor ve Istanbul takvimi onun gününe hiç uymuyor.
--
-- KARAR: doğru takvim kullanıcının KENDİ günü. "Bugün okudum" bir takvim
-- günü ifadesi; hangi sunucuda saklandığının kullanıcı için bir anlamı
-- yok. Gün artık istemciden GEÇİRİLİYOR, sunucuda tahmin edilmiyor.
--
-- NEDEN YENİ İMZA, NEDEN `create or replace` DEĞİL: 1.0.1 mağazada ve o
-- sürüm eski imzaları çağırıyor. Eski fonksiyonlar DURUYOR (davranışları
-- değişmedi), yanlarına parametreli birer kardeş eklendi. Yayındaki bir
-- kullanıcının okuma süresi kaydı bu migration yüzünden bozulmuyor.
--
-- NEDEN VARSAYILAN DEĞER YOK: PostgREST çağrıyı adlandırılmış
-- parametrelerle kuruyor. Yeni fonksiyona `default null` verilseydi üç
-- parametreli bir çağrı hem eski hem yeni imzaya uyar ve PostgreSQL
-- "function is not unique" derdi. Parametre zorunlu olunca çözüm tek.
--
-- Geri alma: iki `drop function` yeterli; eski imzalar zaten yerinde.

create or replace function public.record_reading_session(
  p_book_id uuid,
  p_seconds integer,
  p_words_read integer,
  p_local_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_minutes numeric;
  v_date date;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  if p_seconds is null or p_seconds < 1 then
    return;
  end if;
  v_minutes := least(p_seconds, 7200)::numeric / 60.0;

  -- İstemcinin saati bozuksa (ya da kasten ileri alındıysa) sunucu
  -- takvimine göre bir günden fazla sapan bir tarihi kabul etmiyoruz:
  -- istatistik geleceğe yazılamaz. ±1 gün, dünyadaki tüm saat
  -- dilimlerinin UTC'ye göre olabileceği en geniş aralık.
  v_date := coalesce(p_local_date, (now() at time zone 'utc')::date);
  if v_date > (now() at time zone 'utc')::date + 1
     or v_date < (now() at time zone 'utc')::date - 1 then
    v_date := (now() at time zone 'utc')::date;
  end if;

  insert into public.user_reading_sessions (user_id, book_id, started_at, ended_at, words_read)
  values (
    v_user,
    p_book_id,
    now() - make_interval(secs => least(p_seconds, 7200)),
    now(),
    greatest(coalesce(p_words_read, 0), 0)
  );

  insert into public.user_reading_stats (user_id, date, minutes, words_read)
  values (v_user, v_date, v_minutes, greatest(coalesce(p_words_read, 0), 0))
  on conflict (user_id, date) do update
    set minutes = public.user_reading_stats.minutes + excluded.minutes,
        words_read = public.user_reading_stats.words_read + excluded.words_read;
end;
$$;

comment on function public.record_reading_session(uuid, integer, integer, date) is
  'Okuma oturumunu KULLANICININ yerel takvim gününe yazar. Bkz. migration 044.';

revoke execute on function public.record_reading_session(uuid, integer, integer, date) from public, anon;
grant execute on function public.record_reading_session(uuid, integer, integer, date) to authenticated;

create or replace function public.get_user_streak(p_today date)
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

  v_today := coalesce(p_today, (now() at time zone 'utc')::date);
  if v_today > (now() at time zone 'utc')::date + 1
     or v_today < (now() at time zone 'utc')::date - 1 then
    v_today := (now() at time zone 'utc')::date;
  end if;

  v_cursor := v_today;

  -- Bugün henüz okunmadıysa seri KIRILMIŞ sayılmıyor: gün bitmedi.
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

comment on function public.get_user_streak(date) is
  'Seriyi KULLANICININ yerel takvim gününden geriye sayar. Bkz. migration 044.';

revoke execute on function public.get_user_streak(date) from public, anon;
grant execute on function public.get_user_streak(date) to authenticated;
