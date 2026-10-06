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
    why: "Günlük AI cümle çevirisi hakkı bitti.",
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
    why: "Akışın sonunda, onboarding'e özel teklifle.",
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
  studioAudio: "can_play_book_audio() + chapter-audio edge function (migration 031/032)",
  unlimitedLookups: "consume_word_lookup() (migration 038)",
  aiSentences: "ai_sentence_daily_limit() (migration 029)",
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

describe("paywall tetikleyicileri", () => {
  it.each(EXPECTED_TRIGGERS)("$source tetikleyicisi $where içinde duruyor", ({ source, where }) => {
    const contents = readFile(where);
    const opensPaywall =
      contents.includes(`source=${source}`) || contents.includes(`source="${source}"`);
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
