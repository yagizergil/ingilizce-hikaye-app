-- 037: Onboarding sırasında ÜCRETSİZ çifti değiştirebilmek
--
-- HATA: onboarding'de hedef dil seçimi anında kaydediliyor (seviye testi
-- yolundan giden kullanıcının çifti hiç yazılmadan akıştan çıkmaması için).
-- Kullanıcı bir dil seçip geri dönüp BAŞKA bir dil seçtiğinde ikinci seçim
-- "ikinci çift" sayılıyor ve `premium_required` dönüyordu -- yani daha
-- uygulamayı hiç kullanmamış, tek bir çifti bile tamamlamamış kullanıcı
-- onboarding'in ortasında paywall'a çarpıyordu. Canlıda bunun karşılığı,
-- ilk açılışta fikrini değiştiren herkesin akışta tıkanması.
--
-- KARAR: ADR-013'ün kuralı ("ilk çift ücretsiz, her EK çift premium")
-- değişmedi. Değişen, "ek çift"in tanımı: onboarding henüz bitmemişken ve
-- kullanıcının tek bir çifti varken yeni bir seçim, ek çift DEĞİL, aynı
-- ücretsiz çiftin yer değiştirmesidir. Eski çift siliniyor, yenisi onun
-- yerine geçiyor; kullanıcı yine tek bir ücretsiz çiftle çıkıyor.
--
-- NEDEN SUNUCUDA: kural zaten burada yaşıyor (istemcinin
-- `user_language_pairs`'a yazma yetkisi YOK -- ADR-009'daki "tek yazar"
-- deseni). İstisnayı istemciye koymak, kuralın iki yerde yaşaması ve
-- birinin unutulması demekti.
--
-- Onboarding bittikten sonra davranış AYNI: tek çifti olan kullanıcı bile
-- yeni bir çift açmak için premium gerektiriyor.

create or replace function public.set_language_pair(p_native text, p_target text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_owned_count integer;
  v_already_owned boolean;
  v_is_premium boolean;
  v_in_onboarding boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_native = p_target then
    raise exception 'invalid_pair: native and target must differ';
  end if;

  if not exists (select 1 from public.languages where code = p_native) then
    raise exception 'unknown_language: %', p_native;
  end if;
  if not exists (select 1 from public.languages where code = p_target) then
    raise exception 'unknown_language: %', p_target;
  end if;

  select exists (
    select 1 from public.user_language_pairs
    where user_id = auth.uid() and native_language = p_native and target_language = p_target
  ) into v_already_owned;

  if not v_already_owned then
    select count(*) into v_owned_count
    from public.user_language_pairs
    where user_id = auth.uid();

    -- Profil satırı henüz yoksa kullanıcı tanım gereği onboarding'dedir.
    select coalesce(onboarding_completed_at is null, true)
    into v_in_onboarding
    from public.profiles
    where id = auth.uid();
    v_in_onboarding := coalesce(v_in_onboarding, true);

    if v_owned_count > 0 then
      if v_in_onboarding and v_owned_count = 1 then
        -- Ücretsiz çift YER DEĞİŞTİRİYOR: eskisi siliniyor, aşağıdaki
        -- insert yenisini ücretsiz çift olarak kuruyor.
        delete from public.user_language_pairs where user_id = auth.uid();
      else
        select exists (
          select 1 from public.user_entitlements
          where user_id = auth.uid()
            and tier = 'premium'
            and (expires_at is null or expires_at > now())
        ) into v_is_premium;

        if not v_is_premium then
          return 'premium_required';
        end if;
      end if;
    end if;
  end if;

  -- Diğer tüm çiftleri pasifleştir (tekil aktif indeksle çakışmasın),
  -- sonra hedefi upsert + aktif et.
  update public.user_language_pairs
  set is_active = false
  where user_id = auth.uid() and is_active and not (native_language = p_native and target_language = p_target);

  insert into public.user_language_pairs (user_id, native_language, target_language, is_active)
  values (auth.uid(), p_native, p_target, true)
  on conflict (user_id, native_language, target_language)
  do update set is_active = true;

  update public.profiles set native_language = p_native where id = auth.uid();

  return 'ok';
end;
$function$;
