// ASO mağaza görselleri için içerik çıkarıcı.
//
// NEDEN VAR: 10 dilde 8 ekranlık bir görsel paketi için pazarlama metnini
// SIFIRDAN çevirmek yerine, uygulamanın KENDİ i18n dosyalarından (zaten
// 10 dilde, App Store Guideline 2.3.1'e uygun -- gerçekte üründe çalışan
// vaatler) doğrudan çekiyoruz. Bu hem ücretsiz (yeni çeviri maliyeti yok)
// hem daha güvenli (pazarlama metni üründeki metinle birebir aynı, "önce
// üründe çalışır sonra paywall'a yazılır" kuralı otomatik sağlanıyor).
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const LOCALES_DIR = path.join(ROOT, "src", "i18n", "locales");

const LANGS = ["tr", "en", "de", "fr", "it", "es", "ru", "ar", "zh", "ja"];

const RTL = new Set(["ar"]);

// languages.ts'teki 10 dilin bayrak/native-name yansıması (dil seçici
// ekranı için). Sıra languages.ts'teki `popularity` alanına göre.
// NEDEN EMOJİ DEĞİL: headless Chromium'da (render.js) renkli bayrak
// emoji fontu kurulu değil, iki harfli ülke koduna düşüyor (GB, ES, ...).
// languages.ts'in kendi `flagCode` alanı zaten circle-flags setine işaret
// ediyor (bkz. o dosyadaki "NEDEN EMOJİ YETMEDİ" yorumu) -- burada da
// aynı ücretsiz, public CDN kaynağı kullanılıyor.
const LANGUAGE_PICKER = [
  { code: "en", flagCode: "gb", nativeName: "English" },
  { code: "es", flagCode: "es", nativeName: "Español" },
  { code: "zh", flagCode: "cn", nativeName: "中文" },
  { code: "fr", flagCode: "fr", nativeName: "Français" },
  { code: "ar", flagCode: "sa", nativeName: "العربية" },
  { code: "ru", flagCode: "ru", nativeName: "Русский" },
  { code: "de", flagCode: "de", nativeName: "Deutsch" },
  { code: "ja", flagCode: "jp", nativeName: "日本語" },
  { code: "it", flagCode: "it", nativeName: "Italiano" },
  { code: "tr", flagCode: "tr", nativeName: "Türkçe" },
];

// "hope" kelimesinin 10 dildeki karşılığı -- kelime kaydı/telaffuz
// ekranlarında örnek olarak kullanılıyor. Basit, evrensel, yanlış
// anlaşılmaya kapalı bir kelime seçildi (İngilizce kaynak metinlerde de
// sık geçiyor).
const SAMPLE_WORD = {
  tr: { word: "hope", gloss: "umut", pos: "İsim" },
  en: { word: "hope", gloss: "hope", pos: "Noun" },
  de: { word: "hope", gloss: "Hoffnung", pos: "Nomen" },
  fr: { word: "hope", gloss: "espoir", pos: "Nom" },
  it: { word: "hope", gloss: "speranza", pos: "Sostantivo" },
  es: { word: "hope", gloss: "esperanza", pos: "Sustantivo" },
  ru: { word: "hope", gloss: "надежда", pos: "Существительное" },
  ar: { word: "hope", gloss: "أمل", pos: "اسم" },
  zh: { word: "hope", gloss: "希望", pos: "名词" },
  ja: { word: "hope", gloss: "希望", pos: "名詞" },
};

// "One of his most intimate friends was a merchant who, from a flourishing
// state, fell through numerous mischances into poverty." (Frankenstein,
// Letter II) cümlesinin 10 dildeki AI çevirisi -- cümle çevirisi ekranında
// gösteriliyor. Sabit Türkçe metin kalmasın diye HER dil için ayrı yazıldı.
const SAMPLE_SENTENCE = {
  tr: "Onun en yakın dostlarından biri bir tüccardı; talihsizlikler yüzünden zenginlikten yoksulluğa düşmüştü.",
  en: "One of his closest friends was a merchant who, through repeated misfortune, fell from wealth into poverty.",
  de: "Einer seiner engsten Freunde war ein Kaufmann, der durch wiederholtes Unglück vom Wohlstand in die Armut fiel.",
  fr: "L'un de ses amis les plus proches était un marchand qui, par une suite de malheurs, tomba de la richesse dans la pauvreté.",
  it: "Uno dei suoi amici più cari era un mercante che, per una serie di disgrazie, cadde dalla ricchezza alla povertà.",
  es: "Uno de sus amigos más íntimos era un comerciante que, por sucesivas desgracias, cayó de la riqueza a la pobreza.",
  ru: "Один из его самых близких друзей был купцом, который из-за череды несчастий обеднел, лишившись богатства.",
  ar: "كان أحد أعز أصدقائه تاجرًا سقط من الثراء إلى الفقر بسبب سلسلة من المحن.",
  zh: "他最亲密的朋友之一是一位商人,因屡遭不幸而从富有沦为贫穷。",
  ja: "彼の最も親しい友人の一人は商人で、度重なる不運によって裕福な身から貧しさに落ちぶれた。",
};

// Kelime defteri ekranındaki 4 EK kelime (ilk kelime SAMPLE_WORD'den
// geliyor). ÇÖZÜLEN HATA: bunlar önce phones.js İÇİNE Türkçe gloss ile
// SABİT KODLANMIŞTI ("yorulmak bilmez" gibi) -- Çince/Japonca/Arapça gibi
// dillerde ekran Türkçe kelime karşılıklarıyla çıkıyordu (gözle
// denetimde yakalandı, bkz. docs/aso/screenshots/zh/05-remember.png).
const EXTRA_WORDS = [
  {
    word: "indefatigable",
    posKey: "posAdjective",
    gloss: {
      tr: "yorulmak bilmez",
      en: "tireless",
      de: "unermüdlich",
      fr: "infatigable",
      it: "instancabile",
      es: "incansable",
      ru: "неутомимый",
      ar: "لا يكل",
      zh: "不知疲倦",
      ja: "疲れを知らない",
    },
  },
  {
    word: "despair",
    posKey: "posNoun",
    gloss: {
      tr: "umutsuzluk",
      en: "despair",
      de: "Verzweiflung",
      fr: "désespoir",
      it: "disperazione",
      es: "desesperación",
      ru: "отчаяние",
      ar: "يأس",
      zh: "绝望",
      ja: "絶望",
    },
  },
  {
    word: "wretched",
    posKey: "posAdjective",
    gloss: {
      tr: "sefil",
      en: "wretched",
      de: "erbärmlich",
      fr: "misérable",
      it: "miserabile",
      es: "miserable",
      ru: "жалкий",
      ar: "بائس",
      zh: "可怜",
      ja: "惨めな",
    },
  },
  {
    word: "distinguished",
    posKey: "posAdjective",
    gloss: {
      tr: "seçkin",
      en: "distinguished",
      de: "angesehen",
      fr: "distingué",
      it: "distinto",
      es: "distinguido",
      ru: "выдающийся",
      ar: "مرموق",
      zh: "杰出",
      ja: "卓越した",
    },
  },
];

function flatten(obj, prefix = "") {
  const out = {};
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, full));
    } else {
      out[full] = v;
    }
  }
  return out;
}

function interpolate(str, vars) {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "",
  );
}

function loadFlat(lang) {
  const raw = fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), "utf8");
  return flatten(JSON.parse(raw));
}

function buildForLang(lang) {
  const t = loadFlat(lang);
  const g = (key, vars) => interpolate(t[key] ?? "", vars ?? {});
  const sample = { ...SAMPLE_WORD[lang], sentence: SAMPLE_SENTENCE[lang] };
  const extraWords = EXTRA_WORDS.map((w) => ({
    word: w.word,
    gloss: w.gloss[lang],
    posKey: w.posKey,
  }));

  const chrome = {
    tabLibrary: t["tabs.library"],
    tabVocabulary: t["tabs.vocabulary"],
    tabProfile: t["tabs.profile"],
    statWords: t["library.stats.words"],
    statChapters: t["library.stats.chapters"],
    statMinutes: t["library.stats.minutes"],
    continueAction: t["home.hero.continueAction"],
    freeAlwaysNote: t["paywall.freeAlwaysNote"],
    listenCta: t["bookDetail.cta.listen"],
    saveCta: t["reader.wordSheet.save"],
    pronounceCta: t["reader.wordSheet.pronounce"],
    dueToday: t["vocabulary.due.today"],
    dueTomorrow: t["vocabulary.due.tomorrow"],
    filterAll: t["vocabulary.filters.all"],
    filterDue: t["vocabulary.filters.due"],
    filterKnown: t["vocabulary.filters.known"],
    nativeTitle: t["languagePair.nativeTitle"],
    interfaceLanguageSection: t["languagePair.interfaceLanguageSection"],
    ctaSubscribe: t["paywall.ctaSubscribe"],
    planAnnual: t["paywall.plan.annual"],
    planSavings: g("paywall.plan.savings", { percent: 42 }),
    trialCta: g("paywall.ctaTrial_other", { count: 7 }),
    benefitAudio: t["paywall.benefits.studioAudio.title"],
    benefitLookups: t["paywall.benefits.unlimitedLookups.title"],
    benefitSecondPair: t["paywall.benefits.secondLanguagePair.title"],
    statMinutesLabel: t["bookDetail.stats.minutes"],
    posNoun: t["vocabulary.pos.noun"],
    posAdjective: t["vocabulary.pos.adjective"],
    dueDays3: g("vocabulary.due.days", { count: 3 }),
    dueWeeks1: g("vocabulary.due.weeks", { count: 1 }),
  };

  const screens = [
    {
      id: "hero",
      eyebrow: t["onboarding.splash.tagline"],
      headline: t["onboarding.welcome.title"],
      sub: t["onboarding.welcome.body"],
      phone: "home",
    },
    {
      id: "tap-word",
      eyebrow: chrome.tabLibrary,
      headline: t["onboarding.welcome.highlights.tapWord.title"],
      sub: t["onboarding.welcome.highlights.tapWord.body"],
      phone: "reader-word",
    },
    {
      id: "sentence-ai",
      eyebrow: chrome.tabLibrary,
      headline: t["paywall.benefits.aiSentences.title"],
      sub: t["paywall.benefits.aiSentences.bodyGeneric"],
      phone: "reader-sentence",
    },
    {
      id: "free-library",
      eyebrow: chrome.freeAlwaysNote,
      headline: t["onboarding.welcome.highlights.leveled.title"],
      sub: t["onboarding.welcome.highlights.leveled.body"],
      phone: "library",
    },
    {
      id: "remember",
      eyebrow: chrome.tabVocabulary,
      headline: t["onboarding.welcome.highlights.remember.title"],
      sub: t["onboarding.welcome.highlights.remember.body"],
      phone: "vocabulary",
    },
    {
      id: "studio-audio",
      eyebrow: t["paywall.plan.annual"] ? undefined : undefined,
      headline: t["paywall.benefits.studioAudio.title"],
      sub: t["paywall.benefits.studioAudio.body"],
      phone: "book-detail",
    },
    {
      id: "your-language",
      eyebrow: chrome.interfaceLanguageSection,
      headline: t["languagePair.nativeTitle"],
      sub: t["languagePair.nativeBody"],
      phone: "language-picker",
    },
    {
      id: "premium",
      eyebrow: chrome.freeAlwaysNote,
      headline: t["paywall.title"],
      sub: t["paywall.subtitle"],
      phone: "paywall",
    },
  ];

  return {
    lang,
    dir: RTL.has(lang) ? "rtl" : "ltr",
    chrome,
    sample,
    extraWords,
    screens,
  };
}

function main() {
  const content = {};
  for (const lang of LANGS) {
    content[lang] = buildForLang(lang);
  }
  content.__languagePicker = LANGUAGE_PICKER;

  const outPath = path.join(__dirname, "content.json");
  fs.writeFileSync(outPath, JSON.stringify(content, null, 2), "utf8");
  console.log(`Yazıldı: ${outPath}`);

  // Hızlı sağlık kontrolü: her dil, her ekranda headline/sub dolu mu?
  let missing = 0;
  for (const lang of LANGS) {
    for (const screen of content[lang].screens) {
      if (!screen.headline || !screen.sub) {
        console.warn(
          `EKSİK: ${lang} / ${screen.id} -> headline="${screen.headline}" sub="${screen.sub}"`,
        );
        missing += 1;
      }
    }
  }
  if (missing === 0) console.log("Tüm dillerde tüm ekranlar dolu.");
  else console.warn(`${missing} eksik alan var.`);
}

main();
