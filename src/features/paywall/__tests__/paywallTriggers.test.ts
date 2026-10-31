import fs from "node:fs";
import path from "node:path";

/**
 * Paywall tetikleyicilerinin ENVANTER testi.
 *
 * NEDEN BÖYLE BİR TEST VAR: paywall'ın nereden açıldığı ürünün gelir
 * yüzeyinin tamamı, ama hiçbir yerde tek bir listesi yoktu -- kod
 * yorumları üç ayrı yerde üç farklı sayı söylüyordu ve hiçbiri doğru
 * değildi (denetim bulgusu, 2026-09-14). Bir tetikleyici sessizce
 * silindiğinde ya da eklendiğinde bunu fark eden bir şey yoktu.
 *
 * Test davranış değil ENVANTER doğruluyor: her tetikleyicinin kaynak
 * etiketi (`source=...`) kodda gerçekten var mı. Kaynak etiketi telemetri
 * huninin de anahtarı, yani yanlış/eksik olması ölçümü de bozuyor.
 *
 * Yeni bir tetikleyici eklerken bu listeye de ekle; listeyi güncellemeden
 * test kırmızıya dönüyor ve "neden buraya koydum" sorusu bir kez daha
 * soruluyor.
 */
const EXPECTED_TRIGGERS: { source: string; where: string; why: string }[] = [
  {
    source: "word_quota",
    where: "src/features/reader/components/ReaderScreen.tsx",
    why: "Günlük kelime çevirisi hakkı bitti -- en yüksek niyetli an: kullanıcı tam o sırada bir kelimeyi anlamak istiyor.",
  },
  {
    source: "word_quota_badge",
    where: "src/features/reader/components/ReaderScreen.tsx",
    why: "Sayaç rozetine dokunmak: sınırı merak eden kullanıcıyı anlatan tek ekrana götürüyor.",
  },
  {
    source: "sentence_quota",
    where: "src/features/reader/components/ReaderScreen.tsx",
    why: "Ortak günlük çeviri hakkı (kelime + cümle, migration 057) bittiğinde cümleye uzun basmak: kelime kotasıyla aynı desen, kullanıcının kendi eylemi.",
  },
  {
    source: "reader_listen",
    where: "src/features/reader/components/ReaderScreen.tsx",
    why: "Okuyucudaki kilitli 'dinle' yuvarlağı (ürün sahibi kararı 2026-10-06). Kullanıcı kendisi basıyor; kendiliğinden açılan bir teklif değil.",
  },
  {
    source: "quiz_level_passed",
    where: "src/features/quiz/components/QuizQuestionScreen.tsx",
    why: "Ücretsiz kullanıcı 1. basamağı geçti: 2. basamak kartı, kullanıcı dokunursa paywall.",
  },
  {
    source: "book_quiz",
    where: "src/features/quiz/components/BookQuizScreen.tsx",
    why: "Premium quiz basamağı (2. ve 3.).",
  },
  {
    source: "audio",
    where: "app/book/[id].tsx",
    why: "Kilitli kitapta 'Dinle' -- teklif okuma akışının DIŞINDA (Ürün İlkesi #1).",
  },
  {
    source: "vocabulary_strip",
    where: "app/(tabs)/vocabulary.tsx",
    why: "Kelime defteri sınırının %60'ı doldu.",
  },
  {
    source: "book_finished",
    where: "app/book-finished.tsx",
    why: "Kitap bitirme anı -- kullanıcının üründen en memnun olduğu an.",
  },
  {
    source: "language_pair",
    where: "app/language-settings.tsx",
    why: "İkinci dil çifti premium (ADR-013).",
  },
  {
    source: "profile",
    where: "src/features/profile/components/ProfileScreen.tsx",
    why: "Ayarlardaki abonelik satırı -- kullanıcının kendi isteğiyle geldiği yer.",
  },
  {
    source: "smart_practice",
    where: "src/features/vocabulary/components/SmartPracticeScreen.tsx",
    why: "Günlük ücretsiz Akıllı Tekrar denemesi bitti; kullanıcı yeni bir oturum istedi.",
  },
  {
    source: "word_pack",
    where: "src/features/vocabulary/components/WordPackScreen.tsx",
    why: "Ücretsiz kullanıcı Keşfet paketinin kilitli kısmını açmak istedi.",
  },
  {
    source: "onboarding",
    where: "src/features/onboarding/components/OnboardingFlow.tsx",
    why: "Akışın sonunda, zaman çizelgeli deneme teklifiyle (1.1.0).",
  },
  {
    source: "home_offer",
    where: "src/features/home/components/HomeOfferCard.tsx",
    why: "İkinci şans (1.1.0): ücretsiz + denemeye uygun kullanıcıya 2. günden ya da ilk bölüm bitişinden sonra, ana sayfada kapatılabilir kart, en fazla 72 saatte bir. Okuyucunun DIŞINDA (Ürün İlkesi #1).",
  },
];

const ROOT = path.resolve(__dirname, "../../../..");

function readFile(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

/**
 * Paywall'da vaat edilen her maddenin SUNUCUDA bir karşılığı olmalı.
 *
 * Bu test bir denetim bulgusundan doğdu: "aralıklı tekrar" ve
 * "istatistikler" maddeleri listede duruyordu ama ikisi de ücretsizdi --
 * yani paywall ücretsiz iki özelliği premium diye satıyordu (App Store
 * Guideline 2.3.1). Kod yorumu bunu yasaklıyordu ama yorum kimseyi
 * durdurmuyor; test durduruyor.
 *
 * Yeni bir madde eklemek için önce buraya, sunucudaki kapısıyla birlikte
 * yazılması gerekiyor.
 */
const BENEFITS_WITH_SERVER_GATE: Record<string, string> = {
  // 2026-10-31 (migration 110): her kitabın ilk seslendirilmiş bölümü herkese
  // ücretsiz; premium'un vaadi "TÜM bölümler". Kapı bölüm bazlı.
  studioAudio:
    "chapter-audio edge function -> can_play_section_audio() -> can_play_book_audio() (migration 031/032/110)",
  unlimitedLookups:
    "consume_word_lookup() (038/057) + translate-lemma -> authorize_word_gloss() (057)",
  aiSentences:
    "translate-sentence -> consume_sentence_translation() (057; ücretsizde kelimeyle ortak hak)",
  unlimitedWords: "free_tier_saved_word_limit() + tetikleyici (migration 024)",
  secondLanguagePair: "set_language_pair() -> premium_required (migration 033/037)",
  smartPractice: "consume_smart_practice() (migration 049)",
  wordPacks: "level_word_pack() (migration 050)",
  bookQuizzes:
    "book_quiz_questions RLS + submit_book_quiz() -> has_active_premium() (migration 052)",
};

describe("paywall vaatleri", () => {
  it("listedeki her maddenin sunucuda bir kapısı var", () => {
    const contents = readFile("src/features/paywall/components/PaywallBenefits.tsx");
    const keys = [...contents.matchAll(/key: "([a-zA-Z]+)"/g)].map((match) => match[1]);

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(Object.keys(BENEFITS_WITH_SERVER_GATE)).toContain(key);
    }
  });
});

describe("stüdyo seslendirmesi vaadi (migration 110)", () => {
  // Bölüm 1 herkese ücretsiz olduğu için "seslendirme premium" demek artık
  // yanlış; premium'un sattığı şey TÜM bölümler. Metin geri kayarsa
  // ücretsiz bir şeyi premium diye satmış oluruz (Guideline 2.3.1).
  it.each([
    ["tr", "tüm bölüm"],
    ["en", "every chapter"],
  ])("%s faydası tüm bölümleri vaat ediyor", (locale, phrase) => {
    const json = JSON.parse(readFile(`src/i18n/locales/${locale}.json`)) as {
      paywall: { benefits: { studioAudio: { body: string } } };
      bookDetail: { audio: Record<string, string> };
    };
    expect(json.paywall.benefits.studioAudio.body.toLocaleLowerCase(locale)).toContain(phrase);
    expect(json.bookDetail.audio.firstChapterFree).toBeTruthy();
  });

  it("sunucu kapısı bölüm bazlı fonksiyonu çağırıyor", () => {
    const access = readFile("supabase/functions/chapter-audio/access.ts");
    expect(access).toContain('"can_play_section_audio"');
    const migration = readFile(
      "supabase/migrations/20261031110000_110_first_chapter_audio_free.sql",
    );
    expect(migration).toContain("function public.can_play_section_audio(p_section_id uuid)");
    expect(migration).toContain("order by s.order_index asc, s.id asc");
  });
});

describe("paywall başlıkları", () => {
  it("her tetikleyicinin kaynağa özel başlığı var ve 10 dilde çevrili", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HEADLINE_BY_SOURCE } = require("@/features/paywall/paywallHeadlines") as {
      HEADLINE_BY_SOURCE: Record<string, string>;
    };
    const locales = fs.readdirSync(path.join(ROOT, "src/i18n/locales"));
    expect(locales).toHaveLength(10);
    for (const trigger of EXPECTED_TRIGGERS) {
      if (trigger.source === "word_quota_badge") continue;
      const key = HEADLINE_BY_SOURCE[trigger.source];
      expect(key).toBeDefined();
      for (const file of locales) {
        const json = JSON.parse(readFile(`src/i18n/locales/${file}`)) as {
          paywall: { headlines: Record<string, { title?: string; subtitle?: string }> };
        };
        expect(json.paywall.headlines[key as string]?.title).toBeTruthy();
        expect(json.paywall.headlines[key as string]?.subtitle).toBeTruthy();
      }
    }
  });
});

describe("paywall tetikleyicileri", () => {
  it.each(EXPECTED_TRIGGERS)("$source tetikleyicisi $where içinde duruyor", ({ source, where }) => {
    const contents = readFile(where);
    // C15: uygulama içi tetikleyiciler tipli `openPaywall("<kaynak>")` ile açılıyor.
    const opensPaywall =
      contents.includes(`source=${source}`) ||
      contents.includes(`source="${source}"`) ||
      contents.includes(`openPaywall("${source}"`);
    expect(opensPaywall).toBe(true);
  });

  it("paywall'a giden her çağrı bir kaynak etiketi taşıyor", () => {
    // Kaynaksız bir çağrı huniyi kör eder: paywall'ın nereden açıldığı
    // ölçülemez ve hangi tetikleyicinin işe yaradığı bilinemez.
    const files = [
      "src/features/reader/components/ReaderScreen.tsx",
      "app/book/[id].tsx",
      "app/(tabs)/vocabulary.tsx",
      "app/book-finished.tsx",
      "app/language-settings.tsx",
      "src/features/profile/components/ProfileScreen.tsx",
      "src/features/home/components/HomeOfferCard.tsx",
    ];

    for (const file of files) {
      const contents = readFile(file);
      const calls = contents.match(/["'`]\/paywall[^"'`]*["'`]/g) ?? [];
      for (const call of calls) {
        expect(call).toContain("source=");
      }
    }
  });
});

describe("ortak günlük çeviri kotası (migration 057)", () => {
  const migration = readFile("supabase/migrations/20261012000000_057_shared_translation_quota.sql");

  it("ücretsiz günlük sınır 10", () => {
    expect(migration).toMatch(/when p_tier = 'premium' then null else 10 end/);
  });

  it("ücretsiz kullanımda kelime ve cümle birlikte sayılıyor", () => {
    expect(migration).toMatch(/feature in \('word_lookup', 'sentence_translation'\)/);
  });

  it("translate-sentence LLM'den ÖNCE kotayı tüketiyor", () => {
    const fn = readFile("supabase/functions/translate-sentence/index.ts");
    const consumeAt = fn.indexOf('"consume_sentence_translation"');
    const llmAt = fn.indexOf("await requestLlmSentenceTranslation(");
    expect(consumeAt).toBeGreaterThan(0);
    expect(consumeAt).toBeLessThan(llmAt);
    // Eski build'lerin tanıdığı yanıt şekli korunuyor.
    expect(fn).toContain('"free_tier_daily_limit"');
  });

  it("translate-lemma önbellekten ÖNCE kelime anlamını kapılıyor", () => {
    const fn = readFile("supabase/functions/translate-lemma/index.ts");
    const gateAt = fn.indexOf('"authorize_word_gloss"');
    const cacheAt = fn.indexOf('.from("word_context_glosses")');
    expect(gateAt).toBeGreaterThan(0);
    expect(gateAt).toBeLessThan(cacheAt);
  });

  it("sentence_quota kaynağının başlığı var", () => {
    const headlines = readFile("src/features/paywall/paywallHeadlines.ts");
    expect(headlines).toMatch(/sentence_quota: "sentences"/);
  });
});

describe("tetikleyici kataloğu (C15)", () => {
  it("envanterdeki her kaynağın katalogda bir yeri (placement) var", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PLACEMENT_BY_SOURCE } = require("@/features/paywall/paywallSources") as {
      PLACEMENT_BY_SOURCE: Record<string, string>;
    };
    expect(Object.keys(PLACEMENT_BY_SOURCE).sort()).toEqual(
      EXPECTED_TRIGGERS.map((trigger) => trigger.source).sort(),
    );
  });

  it("uygulama içinde artık çıplak router.push('/paywall…') yok", () => {
    const files = [
      "src/features/reader/components/ReaderScreen.tsx",
      "app/book/[id].tsx",
      "app/(tabs)/vocabulary.tsx",
      "app/book-finished.tsx",
      "app/language-settings.tsx",
      "src/features/profile/components/ProfileScreen.tsx",
      "src/features/home/components/HomeOfferCard.tsx",
      "src/features/vocabulary/components/SmartPracticeScreen.tsx",
      "src/features/vocabulary/components/WordPackScreen.tsx",
      "src/features/quiz/components/BookQuizScreen.tsx",
    ];
    for (const file of files) {
      expect(readFile(file)).not.toMatch(/router\.(push|replace)\(\s*["'`]\/paywall/);
    }
  });
});
