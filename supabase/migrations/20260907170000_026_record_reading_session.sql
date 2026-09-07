-- 026_record_reading_session.sql
-- Okuma süresini kaydeden fonksiyon.
--
-- ÇÖZÜLEN HATA: profil ekranı `user_reading_stats` tablosundan "bu hafta
-- kaç gün", "bu hafta kaç dakika" okuyordu — ama o tabloya HİÇBİR kod
-- yazmıyordu. İki tablo (`user_reading_stats`, `user_reading_sessions`)
-- 002_user.sql'de oluşturulmuş, okuyan taraf yazılmış, YAZAN taraf hiç
-- yazılmamış. Sonuç: istatistikler sonsuza kadar sıfır.
--
-- Neden istemciden doğrudan upsert değil de fonksiyon: günlük satır
-- "topla" mantığı gerektiriyor (aynı güne birden çok oturum eklenir) ve
-- bunu istemcide okuma-değiştirme-yazma olarak yapmak yarış koşulu
-- üretir. Fonksiyon tek deyimde atomik olarak topluyor.
--
-- security invoker DEĞİL, definer: fonksiyon `auth.uid()`yi kendi içinde
-- okuyup satırı ona yazıyor, böylece istemci başka bir kullanıcının
-- satırını güncelleyemiyor (user_id parametre olarak alınmıyor).

create or replace function public.record_reading_session(
  p_book_id uuid,
  p_seconds integer,
  p_words_read integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_minutes numeric;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Saçma değerleri sessizce kırp: 1 saniyenin altı gürültü, 2 saatin
  -- üstü büyük ihtimalle uygulamanın açık unutulması.
  if p_seconds is null or p_seconds < 1 then
    return;
  end if;
  v_minutes := least(p_seconds, 7200)::numeric / 60.0;

  insert into public.user_reading_sessions (user_id, book_id, started_at, ended_at, words_read)
  values (
    v_user,
    p_book_id,
    now() - make_interval(secs => least(p_seconds, 7200)),
    now(),
    greatest(coalesce(p_words_read, 0), 0)
  );

  insert into public.user_reading_stats (user_id, date, minutes, words_read)
  values (v_user, (now() at time zone 'utc')::date, v_minutes, greatest(coalesce(p_words_read, 0), 0))
  on conflict (user_id, date) do update
    set minutes = public.user_reading_stats.minutes + excluded.minutes,
        words_read = public.user_reading_stats.words_read + excluded.words_read;
end;
$$;

comment on function public.record_reading_session(uuid, integer, integer) is
  'Bir okuma oturumunu kaydeder ve günlük toplamı günceller. Bkz. migration 026.';

grant execute on function public.record_reading_session(uuid, integer, integer) to authenticated;
