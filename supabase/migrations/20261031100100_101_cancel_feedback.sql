-- 101_cancel_feedback.sql
-- İptal akışının neden anketi (PAYWALL-KARSILASTIRMA C11).
--
-- NEDEN: iptal App Store'da yapılıyor; uygulama içinde iptal ÖNCESİ bir ekran
-- (kaybedilecekler -> neden -> nedene göre teklif -> "yine de iptal et")
-- gösteriliyor. Neden cevabı burada tutuluyor ki webhook'un CANCELLATION
-- olayıyla karşılaştırılabilsin ("pahalı" diyenlerin kaçı gerçekten iptal
-- etti, kaçı teklifi aldı).
--
-- YAZMA: istemci yalnızca KENDİ satırını ekleyebilir (auth.uid()). Bu bir
-- yetki tablosu değil; yanlış bir satır yalnızca anket istatistiğini
-- bozar. Güncelleme/silme policy'si YOK (kullanıcı hesabını silerse
-- cascade ile gider).
--
-- İDEMPOTENT: `create table if not exists`, policy'ler `drop ... if exists`
-- sonrası yeniden oluşturuluyor.
--
-- GERİ ALMA:
--   drop table if exists public.cancel_feedback;

create table if not exists public.cancel_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null
    check (reason in ('too_expensive', 'not_using', 'missing_content', 'technical', 'other')),
  note text check (note is null or char_length(note) <= 1000),
  -- Kullanıcının o anki ürünü ve durumu (destek ve analiz için).
  product_id text,
  lifecycle_status text check (lifecycle_status is null or char_length(lifecycle_status) <= 40),
  -- Gösterilen teklif: 'promotional', 'monthly_switch', 'goal', 'support', 'none'.
  offer_shown text check (offer_shown is null or char_length(offer_shown) <= 40),
  created_at timestamptz not null default now()
);

alter table public.cancel_feedback enable row level security;

drop policy if exists "cancel_feedback_insert_own" on public.cancel_feedback;
create policy "cancel_feedback_insert_own"
  on public.cancel_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "cancel_feedback_select_own" on public.cancel_feedback;
create policy "cancel_feedback_select_own"
  on public.cancel_feedback for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists cancel_feedback_user_id_idx on public.cancel_feedback (user_id);
create index if not exists cancel_feedback_created_at_idx on public.cancel_feedback (created_at);

comment on table public.cancel_feedback is
  'İptal öncesi neden anketi (migration 101). İstemci yalnızca kendi satırını ekler.';
