-- Stüdyo seslendirmesi artık İSTİSNASIZ premium.
--
-- NE DEĞİŞTİ: migration 031 iki kapı açıyordu — premium yetkisi VEYA bir
-- kitaba bağlanan ücretsiz "tadımlık" hak. Ücretsiz hak kaldırıldı; geriye
-- tek kapı kalıyor.
--
-- NEDEN: ürün sahibinin kararı (2026-09-08). Tadımlık hakkın gerekçesi
-- "farkı anlatmak mümkün değil, duyurmak gerekiyor" idi; karar, stüdyo
-- sesinin premium'un net ve bölünmemiş bir değeri olması yönünde.
--
-- ÜCRETSİZ KATMAN NE KAYBEDİYOR: dinleme. Cihaz üstü seslendirme de bu
-- sürümde kaldırıldı (bkz. ADR-011'in iptali, CLAUDE.md). Kelime telaffuzu
-- (sözlük kartındaki hoparlör) ÜCRETSİZ kalmaya devam ediyor — o cihazın
-- kendi motoruyla çalışıyor ve dinleme özelliği değil, sözlük akışının
-- parçası.
--
-- GERİ ALINABİLİRLİK: tablo ve fonksiyon düşürülüyor. Karar geri alınırsa
-- migration 031 hâlâ depoda ve şemayı olduğu gibi geri kuruyor; kaybolan
-- tek şey o tabloda duran hak satırları oluyor (tadımlık hak zaten
-- kullanıcı başına tek ve yeniden verilebilir bir şey).

-- Önce fonksiyon: tabloya bağımlı olan o.
create or replace function public.can_play_book_audio(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- `p_book_id` artık kararı etkilemiyor (yetki kitap bazlı değil, hesap
  -- bazlı). İmza yine de korunuyor: `chapter-audio` Edge Function'ı ve
  -- istemci bu imzayla çağırıyor, ve kitap bazlı bir kural ileride geri
  -- gelirse çağrı yerlerini değiştirmek gerekmesin.
  select exists (
    select 1
    from public.user_entitlements e
    where e.user_id = auth.uid()
      and e.tier = 'premium'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

comment on function public.can_play_book_audio(uuid) is
  'Stüdyo seslendirmesi çalınabilir mi. Yalnızca aktif premium. Tek karar '
  'yeri: chapter-audio Edge Function''ı ve istemci aynı fonksiyonu çağırır.';

drop function if exists public.claim_audio_taster(uuid);
drop table if exists public.audio_taster_grants;
