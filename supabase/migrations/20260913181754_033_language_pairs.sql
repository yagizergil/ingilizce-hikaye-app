-- 033_language_pairs.sql
-- Versiyon 2: tek dil çiftinden (İngilizce içerik, Türkçe arayüz) N×N dil
-- çifti sistemine geçişin temel şeması.
--
-- TASARIM KARARI (docs/plans/2026-09-13-dil-ciftleri-v2-tasarim.md'de detaylı):
-- "N hedef dili" sorunuyla "N×N çift" sorunu BİLEREK ayrıştırılıyor.
--
--   - Bir kitabın hangi dilde yazıldığı (books.target_language) o kitabın
--     tek özelliği: kelime sınırları, lemmatizasyon, TTS sesi bundan
--     belirleniyor. Bunu N kez (dil başına bir pipeline) çözmek gerekiyor
--     ve bu ayrı, çok haftalık bir içerik üretim işi (bkz. araştırma
--     dokümanı) -- bu migration'ın kapsamı değil.
--   - Bir kelimenin hangi dile çevrildiği (lemma_translations) ise
--     kitaptan bağımsız, salt N×N bir eşleme sorunu ve zaten var olan
--     runtime LLM fallback (translate-lemma) ile anında, bulk üretime
--     gerek kalmadan çözülüyor -- tek değişiklik fallback'in Türkçe'yi
--     sabit değil parametre olarak alması.
--
-- Bu ayrım sayesinde bugün, hiçbir yeni içerik üretmeden, mevcut 119
-- İngilizce kitap 10 yeni ana dilden okunabilir hale geliyor (İngilizce
-- kalıyor, karşılıklar istenen dile AI ile üretiliyor). Yeni bir hedef dil
-- (örn. Almanca kitap) eklemek ayrı, bilinçli bir sonraki adım.

-- ---------------------------------------------------------------------------
-- languages -- statik referans tablosu
-- ---------------------------------------------------------------------------
create table public.languages (
  code text primary key,               -- ISO 639-1: en, de, fr, ru, zh, ja, it, uk, tr, ar, es
  name_en text not null,               -- "German" -- geliştirici/log okunurluğu için
  native_name text not null,           -- "Deutsch" -- seçici ekranında gösterilen ad
  is_rtl boolean not null default false,
  -- true: bu dilde YAZILMIŞ kitap var/olabilir (pipeline'ı hazır).
  is_content_target boolean not null default false,
  -- true: bu dil bir ANA dil (karşılık dili) olarak kullanılabilir --
  -- yani bu dili konuşan biri mevcut hedef dilleri (bugün: İngilizce)
  -- okuyabilir, AI karşılık üretir. Bulk içerik gerekmediği için hepsi true.
  is_gloss_source boolean not null default true,
  tts_language_code text,              -- Google Cloud TTS BCP-47, örn. "de-DE"
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.languages enable row level security;

create policy "languages_select_all"
  on public.languages for select
  to anon, authenticated
  using (true);

-- Sıralama: kullanıcı sayısı büyük diller önce (seçici ekranında görülme
-- şansı yüksek olsun). Tahmini sıralama; ASO verisiyle güncellenebilir.
insert into public.languages (code, name_en, native_name, is_rtl, is_content_target, is_gloss_source, tts_language_code, sort_order) values
  ('en', 'English',    'English',    false, true,  true, 'en-US',   0),
  ('es', 'Spanish',    'Español',    false, false, true, 'es-ES',   1),
  ('zh', 'Chinese',    '中文',        false, false, true, 'cmn-CN',  2),
  ('ar', 'Arabic',     'العربية',     true,  false, true, 'ar-XA',   3),
  ('fr', 'French',     'Français',   false, false, true, 'fr-FR',   4),
  ('ru', 'Russian',    'Русский',    false, false, true, 'ru-RU',   5),
  ('tr', 'Turkish',    'Türkçe',     false, true,  true, 'tr-TR',   6),
  ('de', 'German',     'Deutsch',    false, false, true, 'de-DE',   7),
  ('ja', 'Japanese',   '日本語',      false, false, true, 'ja-JP',   8),
  ('it', 'Italian',    'Italiano',   false, false, true, 'it-IT',   9),
  ('uk', 'Ukrainian',  'Українська', false, false, true, 'uk-UA',   10);

comment on table public.languages is
  'Desteklenen dillerin statik referansı. is_content_target=true olan diller '
  'kitap içeriği barındırabilir (bugün yalnızca en, tr); is_gloss_source '
  'her zaman true çünkü karşılık üretimi bulk içerik gerektirmiyor.';

-- ---------------------------------------------------------------------------
-- books.target_language -- kitabın yazıldığı dil
-- ---------------------------------------------------------------------------
alter table public.books
  add column target_language text not null default 'en'
  references public.languages (code);

-- Mevcut 119 kitabın tamamı İngilizce; varsayılan zaten doğru değeri veriyor,
-- ayrı bir UPDATE'e gerek yok.

create index books_target_language_idx on public.books (target_language) where status = 'published';

comment on column public.books.target_language is
  'Kitap metninin yazıldığı dil. cefr_level bu dilin seviyelendirme '
  'çerçevesinde yorumlanır (İngilizce için CEFR/NGSL) -- başka bir hedef '
  'dil eklendiğinde o dilin kendi çerçevesi (örn. Çince için HSK) '
  'gerekebilir; bu migration''ın kapsamı dışında, bkz. araştırma dokümanı.';

-- ---------------------------------------------------------------------------
-- profiles.native_language -- artık gerçek bir kısıtla korunuyor
-- ---------------------------------------------------------------------------
-- Sütun migration 002'den beri vardı ama hiçbir yerde okunmuyordu
-- (uygulama TEK ana dili -- Türkçe -- varsayıyordu). Şimdi gerçek arayüz
-- dili seçimini taşıyor; FK ekleniyor ki geçersiz bir kod asla yazılamasın.
alter table public.profiles
  add constraint profiles_native_language_fkey
  foreign key (native_language) references public.languages (code);

-- ---------------------------------------------------------------------------
-- lemma_translations -- genel N×N karşılık önbelleği
-- ---------------------------------------------------------------------------
-- NEDEN AYRI TABLO, lemmas'A EKLEME DEĞİL: lemmas (target=İngilizce,
-- gloss=Türkçe) 26.100 kelimelik, üretimde kanıtlanmış bir tablo -- reader,
-- seviye testi, sözlük ekranı hepsi ona bağlı. Onu (target_language,
-- native_language) çifti taşıyacak şekilde yeniden şekillendirmek her
-- tüketiciyi (useBookLemmaDictionary, useGlobalLemmaLookup,
-- sample_level_test_words, lemma_canonical view) aynı anda değiştirmek
-- demek olurdu -- riski hiçbir faydası olmadan büyütür, çünkü Türkçe zaten
-- var olan yol ile mükemmel çalışıyor.
--
-- Bunun yerine: lemmas AYNEN kalıyor ve (target=en, native=tr) için hâlâ
-- birincil kaynak. Yeni tablo yalnızca diğer 9 ana dil için devreye giriyor
-- ve sparse başlıyor -- talep geldikçe translate-lemma'nın runtime LLM
-- fallback'i (artık nativeLanguage parametreli) dolduruyor. Bulk
-- pre-population YOK; CLAUDE.md "basitlik önce gelir" ilkesiyle uyumlu.
create table public.lemma_translations (
  id uuid primary key default gen_random_uuid(),
  target_language text not null references public.languages (code),
  lemma text not null,
  pos text not null,
  native_language text not null references public.languages (code),
  gloss text not null,
  ipa text,
  cefr_level text,
  is_phrasal boolean not null default false,
  source text not null default 'runtime' check (source in ('runtime', 'pipeline', 'manual')),
  created_at timestamptz not null default now(),
  unique (target_language, lemma, pos, native_language)
);

create index lemma_translations_lookup_idx
  on public.lemma_translations (target_language, native_language, lemma);

alter table public.lemma_translations enable row level security;

create policy "lemma_translations_select_all"
  on public.lemma_translations for select
  to anon, authenticated
  using (true);

comment on table public.lemma_translations is
  'Genel (hedef dil, ana dil) kelime karşılığı önbelleği. tr ana dili için '
  'birincil kaynak hâlâ lemmas tablosu (dokunulmadı) -- bu tablo yalnızca '
  'diğer ana diller için kullanılıyor ve talep üzerine (runtime LLM) '
  'sparse doluyor, bkz. supabase/functions/translate-lemma.';

-- ---------------------------------------------------------------------------
-- user_language_pairs -- kullanıcının aktif ettiği (ana dil, hedef dil) çiftleri
-- ---------------------------------------------------------------------------
create table public.user_language_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  native_language text not null references public.languages (code),
  target_language text not null references public.languages (code),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, native_language, target_language),
  check (native_language <> target_language)
);

create index user_language_pairs_user_idx on public.user_language_pairs (user_id);

-- Kullanıcı başına en fazla BİR aktif çift: reader ve kütüphane "şu an
-- hangi çiftte olduğumu" sorusuna tek satırdan cevap alabilsin.
create unique index user_language_pairs_one_active_idx
  on public.user_language_pairs (user_id) where is_active;

alter table public.user_language_pairs enable row level security;

create policy "user_language_pairs_select_own"
  on public.user_language_pairs for select
  to authenticated
  using (auth.uid() = user_id);

-- YAZMA POLİTİKASI YOK -- ADR-009'un aynısı: kural (ilk çift ücretsiz,
-- sonrakiler premium) set_language_pair() fonksiyonunda SECURITY DEFINER
-- ile uygulanıyor. Doğrudan insert/update RLS'siz kalırsa kullanıcı
-- ücretsizken sınırsız çift açabilirdi.

comment on table public.user_language_pairs is
  'Kullanıcının açtığı dil çiftleri. Tek yazar public.set_language_pair() -- '
  'insert/update policy YOK, bkz. ADR-009 deseni. İlk çift ücretsiz, '
  'ikinci ve sonrakiler premium gerektirir (fonksiyonun kendi yorumuna bak).';

-- ---------------------------------------------------------------------------
-- set_language_pair -- tek yazar, ücretsiz/premium kuralı burada
-- ---------------------------------------------------------------------------
-- KURAL (ürün kararı, 2026-09-13): kullanıcının hesabında hiç dil çifti
-- yoksa istediği çifti ÜCRETSİZ seçer (onboarding). Bundan sonra HER
-- YENİ çift -- ister ilk seçimini değiştirmek ister ikinci bir çift
-- eklemek olsun -- aktif premium gerektiriyor. Zaten sahip olduğu bir
-- çifti yeniden aktif etmek (iki çifti olan premium kullanıcının
-- aralarında geçiş yapması) her zaman ücretsizdir çünkü o çift için
-- zaten "ödenmiş" (ilk çift ücretsiz hakkıyla ya da premium'la).
--
-- Premium süresi dolarsa: user_language_pairs satırları SİLİNMİYOR
-- (audio_taster_grants deseniyle aynı felsefe -- bir kez açılan erişim
-- geri alınmaz) ama YENİ bir çift açmak yine premium ister.
create or replace function public.set_language_pair(p_native text, p_target text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owned_count integer;
  v_already_owned boolean;
  v_is_premium boolean;
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

    if v_owned_count > 0 then
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
$$;

revoke execute on function public.set_language_pair(text, text) from public, anon;
grant execute on function public.set_language_pair(text, text) to authenticated;

comment on function public.set_language_pair(text, text) is
  'Dil çifti seçer/değiştirir. İlk çift ücretsiz, yeni her ek çift '
  'premium gerektirir (mevcut çiftler arasında geçiş her zaman ücretsiz). '
  'Dönüş: ok | premium_required. İstemci premium_required''ı paywall''a '
  'yönlendirme sinyali olarak okur.';
