-- 031_audio_access.sql
-- Bulut seslendirmesine erişim: premium + kullanıcı başına BİR ücretsiz hikâye.
--
-- NEDEN BU ÖZELLİK ÜCRETLİ, SESLİ OKUMA İSE ÜCRETSİZ:
--   ADR-011 sesli okumayı ücretsiz ilan ediyor ve bu KALIYOR. Cihaz üstü
--   TTS her kitapta, herkese, sınırsız çalışmaya devam ediyor — 46 klasik
--   dâhil. Ücretli olan farklı bir şey: özgün hikâyeler için önceden
--   üretilmiş, kelime kelime zamanlanmış STÜDYO seslendirmesi.
--
--   Bu ayrım ürün ilkesi #2'yi (ücretsiz katman gerçekten kullanılabilir
--   olmalı) korumak için önemli: premium "daha iyisini" veriyor, temel
--   işlevi kilitlemiyor. Erişimi olmayan kullanıcı sessizce cihaz sesine
--   düşüyor, hiçbir şey bozulmuyor.
--
-- NEDEN BİR HİKÂYE ÜCRETSİZ: farkı anlatmak mümkün değil, duyurmak
--   gerekiyor. "Doğal ses" ifadesi bir ekran görüntüsünde hiçbir şey ifade
--   etmiyor; bir bölüm dinlemek her şeyi ifade ediyor.
--
-- SINIRIN NEREDE ZORLANDIĞI: uygulama mantığında DEĞİL, şemada. Tablonun
--   birincil anahtarı `user_id` — yani bir kullanıcı için ikinci bir satır
--   FİZİKSEL OLARAK oluşamaz. Sayaç tutan, "kaç tane aldı" diye sorgulayan
--   bir kod yok; olsaydı yarış koşulunda ikinci hikâye açılabilirdi.

create table if not exists public.audio_taster_grants (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  book_id    uuid not null references public.books (id) on delete cascade,
  granted_at timestamptz not null default now()
);

comment on table public.audio_taster_grants is
  'Kullanıcının stüdyo seslendirmesini ücretsiz dinleyebildiği TEK kitap. '
  'Birincil anahtar user_id olduğu için ikinci bir satır oluşamaz — sınır '
  'uygulama kodunda değil şemada zorlanıyor.';

alter table public.audio_taster_grants enable row level security;

-- Kullanıcı yalnızca kendi satırını görür. Yazma politikası BİLEREK yok:
-- tek yazar aşağıdaki security definer fonksiyon.
create policy audio_taster_grants_select_own
  on public.audio_taster_grants
  for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Ücretsiz hikâyeyi talep et.
--
-- Idempotent: kullanıcı zaten bir hikâye seçmişse HER ZAMAN o hikâyeyi
-- döndürür, yenisini vermez ve hata da fırlatmaz. Çağıran taraf dönen
-- kitabı kendi istediğiyle karşılaştırıp "ücretsiz hakkın şu kitapta"
-- diyebilir.
-- ---------------------------------------------------------------------------
create or replace function public.claim_audio_taster(p_book_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.audio_taster_grants (user_id, book_id)
  values (auth.uid(), p_book_id)
  on conflict (user_id) do nothing;

  select g.book_id into v_book_id
  from public.audio_taster_grants g
  where g.user_id = auth.uid();

  return v_book_id;
end;
$$;

revoke execute on function public.claim_audio_taster(uuid) from public, anon;
grant execute on function public.claim_audio_taster(uuid) to authenticated;

comment on function public.claim_audio_taster(uuid) is
  'Ücretsiz stüdyo seslendirmesi hakkını bir kitaba bağlar. Zaten '
  'bağlıysa mevcut kitabı döndürür — ikinci hak verilmez.';

-- ---------------------------------------------------------------------------
-- Erişim kararı tek bir yerde.
--
-- NEDEN FONKSİYON: aynı kural iki yerde lazım — imzalı bağlantı üreten
-- Edge Function'da ve kitap detayında düğmenin kilitli görünüp
-- görünmeyeceğine karar veren istemcide. İki kopya zamanla ayrışır ve
-- ayrıştığında kullanıcı ya ödediği şeyi göremez ya da ödemediğini
-- dinler.
-- ---------------------------------------------------------------------------
create or replace function public.can_play_book_audio(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.user_entitlements e
      where e.user_id = auth.uid()
        and e.tier = 'premium'
        and (e.expires_at is null or e.expires_at > now())
    )
    or exists (
      select 1
      from public.audio_taster_grants g
      where g.user_id = auth.uid()
        and g.book_id = p_book_id
    );
$$;

revoke execute on function public.can_play_book_audio(uuid) from public, anon;
grant execute on function public.can_play_book_audio(uuid) to authenticated, service_role;

comment on function public.can_play_book_audio(uuid) is
  'Kullanıcı bu kitabın stüdyo seslendirmesini dinleyebilir mi: premium '
  'ya da ücretsiz hakkını bu kitaba bağlamış olması.';

-- ---------------------------------------------------------------------------
-- Depo artık herkese açık DEĞİL.
--
-- NEDEN ŞART: bucket public kaldığı sürece herhangi bir kilit yalnızca
-- görsel olurdu — dosya adresleri `book_sections.audio_url` içinde ve o
-- satırları her kullanıcı okuyabiliyor. Erişim bundan sonra kısa ömürlü
-- imzalı bağlantılarla veriliyor (Edge Function: chapter-audio).
-- ---------------------------------------------------------------------------
update storage.buckets set public = false where id = 'book-audio';
