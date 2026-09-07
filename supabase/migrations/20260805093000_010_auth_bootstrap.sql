-- 010_auth_bootstrap.sql
-- Misafir mod: signInAnonymously() ile açılan oturumlar da normal
-- auth.users satırı ve gerçek auth.uid() alır (role=authenticated,
-- is_anonymous=true claim'i ile) — mevcut "to authenticated" + "auth.uid()
-- = user_id" RLS politikaları anonim kullanıcılar için de aynen çalışır,
-- değişiklik gerekmiyor. `anon` Postgres rolüne (isteği kimliksiz atan
-- rol, "anonim kullanıcı" ile karıştırılmamalı) hiçbir user_* tabloda
-- policy verilmediği için STATE.md'deki "anonymous access" advisor
-- uyarıları burada da gerçek bir riske dönüşmüyor.

-- Her yeni auth.users satırı için otomatik profiles satırı oluştur
-- (anonim veya kayıtlı fark etmez) — profiles tablosu artık 0 satır
-- kalmayacak.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
