-- 056: bağlama duyarlı kelime anlamı önbelleği (İngilizce->Türkçe DIŞINDAKİ çiftler).
--
-- KÖK SEBEP (2026-10-10, kullanıcı bulgusu): Fransızca kitapta "au" -> "altın",
-- "Sa" -> "bilinmeyen kısaltma". İstemci ana dil Türkçe olunca hedef dile
-- bakmadan İngilizce sözlüğe (`lemma_canonical`) gidiyordu; Fransızca
-- metindeki token'ların %47'si orada bir İngilizce girdiye çarpıyordu.
-- Artık İngilizce dışındaki her kitapta anlam `translate-lemma` ile cümle
-- bağlamında üretiliyor ve burada önbellekleniyor.
--
-- Anahtar: (hedef dil, ana dil, yüzey biçimi, bağlam anahtarı, prompt sürümü).
-- `context_key` = '' -> anlam bağlamdan bağımsız (ör. "sa" hep "onun");
-- aksi hâlde normalize cümlenin SHA-256 özeti (ör. "son" = onun / ses).
-- Yazan TEK taraf service_role (edge function); istemciye yazma policy'si YOK.

create table if not exists public.word_context_glosses (
  id bigint generated always as identity primary key,
  target_language text not null references public.languages(code),
  native_language text not null references public.languages(code),
  surface text not null check (char_length(surface) between 1 and 80),
  context_key text not null default '',
  lemma text,
  pos text not null default 'other',
  gloss text not null check (char_length(gloss) between 1 and 120),
  alternatives text[] not null default '{}',
  context_dependent boolean not null default false,
  prompt_version smallint not null default 2,
  source text not null default 'llm',
  created_at timestamptz not null default now(),
  unique (target_language, native_language, surface, context_key, prompt_version)
);

alter table public.word_context_glosses enable row level security;

-- Paylaşımlı sözlük: giriş yapmış herkes okuyabilir (kişisel veri yok).
drop policy if exists word_context_glosses_select on public.word_context_glosses;
create policy word_context_glosses_select on public.word_context_glosses
  for select to authenticated using (true);

-- Onarım: eski, bağlamsız prompt'la üretilmiş ve anlamı bağlama göre değişen
-- işlev kelimesi satırları (kelime defteri bunları okuyor). Silinince yeni
-- bağlamlı yol doğru anlamı yeniden üretiyor.
delete from public.lemma_translations
where target_language <> 'en'
  and source = 'runtime'
  and lemma in (
    'au','aux','du','des','sa','son','ses','sa','leur','leurs','l''','d''','qu''','j''','n''','s''','c''',
    'le','la','les','un','une','en','y','se','ce','cette',
    'zum','zur','im','am','ins','vom','beim','sein','seine','ihr','ihre','sie','die','der','das','den','dem',
    'al','del','su','sus','lo','le','se',
    'nel','nella','sul','sulla','dal','dalla','suo','sua','suoi','sue','gli','ne','ci',
    'его','её','ее','свой','своя','своё','свои'
  );
