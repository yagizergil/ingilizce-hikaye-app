-- 110_first_chapter_audio_free.sql
-- Her kitabın İLK seslendirilmiş bölümü herkese (premium olmayan oturumlu
-- kullanıcıya da) kalıcı olarak ücretsiz. Diğer bölümler premium kalır.
--
-- NE DEĞİŞTİ: migration 032 (2026-09-08) ücretsiz dinlemeyi tamamen
-- kaldırmıştı ("istisnasız premium"). Ürün sahibinin 2026-10-31 kararıyla
-- ücretsiz dinleme geri geliyor, ama yalnızca bölüm 1 ile sınırlı ve
-- kullanıcıya bağlı bir "hak" olarak DEĞİL (031'deki tadımlık tablo geri
-- gelmiyor): kural içerikten türüyor, saklanan bir satır yok.
--
-- NEDEN BÖLÜM BAZLI YENİ FONKSİYON: `can_play_book_audio(p_book_id)`
-- "bu kitabın TAMAMINA erişim var mı" sorusunun cevabı olarak kalıyor
-- (kitap detayındaki "Dinle" ve kart onu soruyor) ve bu migration'da
-- DEĞİŞMİYOR. Bölüm bazlı karar yeni `can_play_section_audio()` içinde;
-- `chapter-audio` Edge Function'ı onu çağırıyor.
--
-- "İLK BÖLÜM" TANIMI: `free_audio_section_id()` tek yerde tanımlıyor ve
-- hem sunucu kapısı hem istemci (düğme kilitli mi) onu kullanıyor:
--   - Kitabın stüdyo sesi OLAN (audio_url ve audio_timings_url dolu)
--     bölümleri arasında `order_index` en küçük olan. `order_index = 0`
--     VARSAYILMIYOR: kitapların çoğunda 0'dan başlıyor ama hepsinde değil,
--     ve sesi olmayan bir önsöz/mektup bölümü varsa ilk SESLİ bölüm o
--     değil.
--   - `(book_id, order_index)` migration 001'den beri unique; yine de
--     `id` ikincil sıralama olarak eklendi ki sonuç her koşulda belirli
--     olsun.
--   - Yalnızca yayımlanmış kitaplar: fonksiyon security definer olduğu için
--     RLS'yi (book_sections_select_published) atlıyor; aynı filtre burada
--     elle uygulanıyor.
--
-- YETKİ ZİNCİRİNE DOKUNULMADI (ADR-009): premium kararı hâlâ
-- `user_entitlements` üzerinden ve `can_play_book_audio()` çağrılarak
-- veriliyor; kopyası yazılmadı. Migration 100'ün yaşam döngüsü alanları
-- (will_renew, billing_issue_at, ...) bu kapıda da KULLANILMIYOR.
--
-- İDEMPOTENT: yalnızca `create or replace function`, `revoke`, `grant`,
-- `comment`. Tablo/satır değişikliği yok; tekrar çalıştırmak sonucu
-- değiştirmez.
--
-- DEPLOY SIRASI: önce bu migration, sonra `chapter-audio`, en son istemci.
-- Edge Function bu fonksiyon yoksa (PGRST202 / 42883) `can_play_book_audio`'ya
-- geri düşüyor; istemci `free_audio_section_id` yoksa eski davranışa
-- (premium olmayana kilitli) dönüyor. Hiçbir sıra bir şeyi bozmaz; yalnızca
-- ücretsiz bölüm 1, üç parça da canlıda olunca çalışır.
--
-- GERİ ALMA (bölüm 1 tekrar premium olur, istemci kendiliğinden kilitli
-- davranışa döner, Edge Function geri düşme yoluna geçer):
--   drop function if exists public.can_play_section_audio(uuid);
--   drop function if exists public.free_audio_section_id(uuid);

-- ---------------------------------------------------------------------------
-- Ücretsiz bölümün tanımı (tek yer).
-- ---------------------------------------------------------------------------
create or replace function public.free_audio_section_id(p_book_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.book_sections s
  join public.books b on b.id = s.book_id
  where s.book_id = p_book_id
    and b.status = 'published'
    and nullif(btrim(s.audio_url), '') is not null
    and nullif(btrim(s.audio_timings_url), '') is not null
  order by s.order_index asc, s.id asc
  limit 1;
$$;

revoke execute on function public.free_audio_section_id(uuid) from public, anon;
grant execute on function public.free_audio_section_id(uuid) to authenticated, service_role;

comment on function public.free_audio_section_id(uuid) is
  'Kitabın premium olmadan dinlenebilen tek bölümü: stüdyo sesi olan '
  'bölümler arasında order_index en küçük olan (0 varsayılmaz). Sesi yoksa '
  'ya da kitap yayımlanmamışsa null. Migration 110, ürün sahibi kararı '
  '2026-10-31.';

-- ---------------------------------------------------------------------------
-- Bölüm bazlı erişim kararı.
-- ---------------------------------------------------------------------------
create or replace function public.can_play_section_audio(p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        -- Tam erişim: kural can_play_book_audio()'da, burada kopyası yok.
        public.can_play_book_audio(s.book_id)
        -- Ücretsiz bölüm: yalnızca oturumlu kullanıcı (diğer kapılarla
        -- aynı auth.uid() kapsamı; anon zaten EXECUTE alamıyor).
        or (
          auth.uid() is not null
          and s.id = public.free_audio_section_id(s.book_id)
        )
      from public.book_sections s
      where s.id = p_section_id
    ),
    false
  );
$$;

revoke execute on function public.can_play_section_audio(uuid) from public, anon;
grant execute on function public.can_play_section_audio(uuid) to authenticated, service_role;

comment on function public.can_play_section_audio(uuid) is
  'Bu bölümün stüdyo seslendirmesi çalınabilir mi: aktif premium '
  '(can_play_book_audio) ya da bölüm, kitabının free_audio_section_id() '
  'bölümü. chapter-audio Edge Function''ı bunu çağırır. Migration 110.';
