-- 046_custom_decks_trigger_security_invoker.sql
-- DENETİM BULGUSU (2026-09-20, get_advisors): set_custom_decks_updated_at()
-- gereksiz yere SECURITY DEFINER olarak yazılmıştı -- yalnızca
-- `new.updated_at = now()` yapan bir tetikleyici fonksiyonunun yükseltilmiş
-- yetkiye ihtiyacı yok, ve SECURITY DEFINER onu anon/authenticated
-- rollerinin doğrudan /rest/v1/rpc/ ile çağırabileceği bir yüzeye
-- çeviriyordu (zararsız ama gereksiz saldırı yüzeyi). SECURITY INVOKER'a
-- (varsayılan) çekiliyor.
alter function public.set_custom_decks_updated_at() security invoker;
