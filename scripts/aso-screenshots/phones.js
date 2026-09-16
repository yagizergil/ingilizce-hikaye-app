// Telefon ekranı içerikleri -- mockups/*.html'den (onaylı tasarım kaynağı)
// UYARLANDI. Aynı token'lar (renk/font), aynı gerçek kitap kapağı URL'leri.
// Ayrı bir "App Store maketi" tasarımı İCAT EDİLMEDİ -- bu görsellerin
// güvenilirliği tam olarak gerçek ürünle birebir aynı olmasından geliyor.

const COVER = {
  frankenstein:
    "https://lzewiwkwcshwxsfwybml.supabase.co/storage/v1/object/public/book-covers/mary-shelley-frankenstein.jpg",
  sherlock:
    "https://lzewiwkwcshwxsfwybml.supabase.co/storage/v1/object/public/book-covers/arthur-conan-doyle-the-adventures-of-sherlock-holmes.jpg",
  oz: "https://lzewiwkwcshwxsfwybml.supabase.co/storage/v1/object/public/book-covers/l-frank-baum-the-wonderful-wizard-of-oz.jpg",
  callOfWild:
    "https://lzewiwkwcshwxsfwybml.supabase.co/storage/v1/object/public/book-covers/jack-london-the-call-of-the-wild.jpg",
  wilde:
    "https://lzewiwkwcshwxsfwybml.supabase.co/storage/v1/object/public/book-covers/oscar-wilde-childrens-stories.jpg",
};

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

/** Ortak taban stil -- her telefon ekranı bunu paylaşıyor. */
const BASE_STYLE = `
  *{box-sizing:border-box;}
  .phone-body{ margin:0; width:390px; height:844px; overflow:hidden; background:#FAF8F4; color:#1E1C19;
    -webkit-font-smoothing:antialiased; position:relative; }
  .mono{ font-family:'IBM Plex Mono', monospace; }
  .display{ font-family:'Fraunces', Georgia, serif; }
  .reading{ font-family:'Literata', Georgia, serif; }
  .status{ height:14px; }
  [dir="rtl"] .phone-body{ direction:rtl; }
`;

function homeScreen({ chrome, dir }) {
  return `
  <div class="status"></div>
  <header style="padding:28px 20px 6px;">
    <div class="eyebrow mono" style="font-size:11px;letter-spacing:.06em;color:#8A8378;text-transform:uppercase;">${esc(chrome.tabLibrary)}</div>
    <h1 class="display" style="font-size:32px;font-weight:600;margin:8px 0 0;letter-spacing:-.01em;">${esc(chrome.tabLibrary)}</h1>
  </header>
  <div style="margin:24px 20px 0;display:grid;grid-template-columns:64px 1fr;gap:16px;padding-bottom:22px;border-bottom:1px solid #E7E2D8;">
    <img src="${COVER.frankenstein}" style="width:64px;height:96px;object-fit:cover;display:block;" />
    <div style="display:flex;flex-direction:column;justify-content:space-between;padding-top:2px;">
      <div>
        <div class="title display" style="font-size:20px;font-weight:600;line-height:1.15;margin:5px 0;">Frankenstein</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;height:2px;background:#E7E2D8;position:relative;"><i style="position:absolute;inset:0;width:42%;background:#A6572E;display:block;"></i></div>
        <div class="mono" style="font-size:11px;color:#A6572E;">%42</div>
      </div>
    </div>
  </div>
  ${[
    ["The Adventures of Sherlock Holmes", "B1", COVER.sherlock],
    ["The Wonderful Wizard of Oz", "B1", COVER.oz],
    ["The Call of the Wild", "B2", COVER.callOfWild],
    ["Children's Stories", "B2", COVER.wilde],
  ]
    .map(
      ([title, lvl, cover]) => `
    <div style="margin:0 20px;display:grid;grid-template-columns:52px 1fr;gap:14px;padding:16px 0;border-bottom:1px solid #E7E2D8;">
      <img src="${cover}" style="width:52px;height:78px;object-fit:cover;display:block;" />
      <div>
        <div class="title display" style="font-size:16px;font-weight:600;line-height:1.25;margin-bottom:4px;">${esc(title)}</div>
        <div class="mono" style="font-size:10px;color:#8A8378;letter-spacing:.03em;">${esc(lvl)}</div>
      </div>
    </div>`,
    )
    .join("")}
  <nav style="display:flex;justify-content:space-between;padding:16px 20px 26px;border-top:1px solid #E7E2D8;margin-top:4px;position:absolute;bottom:0;left:0;right:0;">
    <div class="mono" style="font-size:10px;letter-spacing:.06em;color:#1E1C19;">${esc(chrome.tabLibrary)}</div>
    <div class="mono" style="font-size:10px;letter-spacing:.06em;color:#8A8378;">${esc(chrome.tabVocabulary)}</div>
    <div class="mono" style="font-size:10px;letter-spacing:.06em;color:#8A8378;">${esc(chrome.tabProfile)}</div>
  </nav>`;
}

function readerWordScreen({ chrome, sample }) {
  return `
  <div class="status"></div>
  <div style="height:2px;background:#E7E2D8;position:relative;"><i style="position:absolute;inset:0;width:31%;background:#A6572E;display:block;"></i></div>
  <div style="padding:14px 22px 18px;">
    <div class="reading" style="padding:6px 2px 0;font-size:18px;line-height:1.75;color:#241F19;">
      <p style="margin:0 0 20px;">He was respected by all who knew him, for his integrity and indefatigable attention to public business, and could not bear to live in poverty and
      <span style="background:rgba(166,87,46,.18);text-decoration:underline dotted #A6572E 1px;text-underline-offset:3px;">${esc(sample.word)}</span>
      in the same country where he had formerly been distinguished.</p>
    </div>
  </div>
  <div style="position:absolute; left:0; right:0; bottom:0; margin:0 24px 22px; padding:18px 20px; background:#fff; border-radius:20px; box-shadow:0 18px 40px rgba(30,28,25,.14);">
    <div class="mono" style="font-size:9px;color:#8A8378;text-transform:uppercase;letter-spacing:.06em;">${esc(sample.pos)}</div>
    <div class="reading" style="font-style:italic;font-size:17px;margin-top:6px;">${esc(sample.word)}</div>
    <div class="mono" style="font-size:13px;color:#A6572E;margin-top:4px;">${esc(sample.gloss)}</div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <div class="mono" style="font-size:10px;letter-spacing:.06em;border:1px solid #1E1C19;padding:8px 12px;border-radius:8px;">${esc(chrome.pronounceCta)}</div>
      <div class="mono" style="font-size:10px;letter-spacing:.06em;background:#1E1C19;color:#FAF8F4;padding:8px 12px;border-radius:8px;">${esc(chrome.saveCta)}</div>
    </div>
  </div>`;
}

function readerSentenceScreen({ chrome, sample }) {
  return `
  <div class="status"></div>
  <div style="height:2px;background:#E7E2D8;position:relative;"><i style="position:absolute;inset:0;width:52%;background:#A6572E;display:block;"></i></div>
  <div style="padding:20px 22px;">
    <div class="reading" style="font-size:18px;line-height:1.75;color:#241F19;">
      <p style="margin:0 0 20px;color:#8A8378;">His ancestors had been for many years counsellors and syndics, and his father had filled several public situations with honour and reputation.</p>
      <p style="margin:0 0 16px; background:rgba(166,87,46,.1); border-radius:10px; padding:10px 12px; box-decoration-break:clone;">One of his most intimate friends was a merchant who, from a flourishing state, fell through numerous mischances into poverty.</p>
      <p style="margin:0;color:#8A8378;">This man, whose name was Beaufort, was of a proud and unbending disposition.</p>
    </div>
  </div>
  <div style="position:absolute; left:0; right:0; bottom:0; margin:0 24px 22px; padding:18px 20px; background:#1E1C19; color:#FAF8F4; border-radius:20px; box-shadow:0 18px 40px rgba(30,28,25,.25);">
    <div class="mono" style="font-size:9px;color:#C9A98C;text-transform:uppercase;letter-spacing:.06em;">AI</div>
    <div class="reading" style="font-size:15px;margin-top:8px;line-height:1.5;">
      ${esc(sample.sentence)}
    </div>
  </div>`;
}

function libraryScreen({ chrome }) {
  const rows = [
    ["Frankenstein", "Mary Shelley", "C1", COVER.frankenstein, "74.858", "33"],
    [
      "The Adventures of Sherlock Holmes",
      "Arthur Conan Doyle",
      "B1",
      COVER.sherlock,
      "104.335",
      "74",
    ],
    ["The Wonderful Wizard of Oz", "L. Frank Baum", "B1", COVER.oz, "39.331", "24"],
    ["Children's Stories", "Oscar Wilde", "B2", COVER.wilde, "49.539", "32"],
  ];
  return `
  <div class="status"></div>
  <header style="padding:26px 20px 16px;"><h1 class="display" style="font-size:28px;font-weight:600;margin:0;">${esc(chrome.tabLibrary)}</h1></header>
  <div style="display:flex;gap:18px;padding:0 20px 18px;border-bottom:1px solid #E7E2D8;">
    <div class="mono" style="font-size:11px;color:#1E1C19;border-bottom:2px solid #A6572E;padding-bottom:10px;margin-bottom:-11px;">A1–C2</div>
    <div class="mono" style="font-size:11px;color:#8A8378;padding-bottom:10px;">B1</div>
    <div class="mono" style="font-size:11px;color:#8A8378;padding-bottom:10px;">B2</div>
    <div class="mono" style="font-size:11px;color:#8A8378;padding-bottom:10px;">C1</div>
  </div>
  <div style="padding:0 20px;">
    ${rows
      .map(
        ([title, author, lvl, cover, words, chapters]) => `
      <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:20px 0;border-bottom:1px solid #E7E2D8;">
        <img src="${cover}" style="width:64px;height:96px;object-fit:cover;display:block;" />
        <div style="display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div class="mono" style="font-size:10px;letter-spacing:.05em;border:1px solid #1E1C19;padding:2px 6px;display:inline-block;">${esc(lvl)}</div>
            <div class="title display" style="font-size:18px;font-weight:600;line-height:1.2;margin-top:6px;">${esc(title)}</div>
            <div class="mono" style="font-size:11px;color:#8A8378;margin-top:4px;">${esc(author)}</div>
          </div>
          <div style="display:flex;gap:14px;margin-top:8px;">
            <div><div class="mono" style="font-size:12px;font-weight:500;">${esc(words)}</div><div class="mono" style="font-size:8px;color:#8A8378;text-transform:uppercase;">${esc(chrome.statWords)}</div></div>
            <div><div class="mono" style="font-size:12px;font-weight:500;">${esc(chapters)}</div><div class="mono" style="font-size:8px;color:#8A8378;text-transform:uppercase;">${esc(chrome.statChapters)}</div></div>
          </div>
        </div>
      </div>`,
      )
      .join("")}
  </div>`;
}

function vocabularyScreen({ chrome, sample, extraWords }) {
  const due = [chrome.dueToday, chrome.dueTomorrow, chrome.dueDays3, chrome.dueWeeks1];
  const words = [
    [sample.word, chrome.dueToday, sample.gloss, sample.pos],
    ...extraWords.map((w, i) => [
      w.word,
      due[i] ?? chrome.dueToday,
      w.gloss,
      chrome[w.posKey] ?? sample.pos,
    ]),
  ];
  return `
  <div class="status"></div>
  <header style="padding:26px 20px 6px;">
    <h1 class="display" style="font-size:28px;font-weight:600;margin:0;">${esc(chrome.tabVocabulary)}</h1>
  </header>
  <div style="display:flex;gap:18px;padding:18px 20px;border-bottom:1px solid #E7E2D8;">
    <div class="mono" style="font-size:11px;color:#1E1C19;border-bottom:2px solid #A6572E;padding-bottom:9px;margin-bottom:-10px;">${esc(chrome.filterAll)}</div>
    <div class="mono" style="font-size:11px;color:#8A8378;">${esc(chrome.filterDue)}</div>
    <div class="mono" style="font-size:11px;color:#8A8378;">${esc(chrome.filterKnown)}</div>
  </div>
  <div style="padding:0 20px;">
    ${words
      .map(
        ([lemma, due, gloss, pos]) => `
      <div style="display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:20px 0;border-bottom:1px solid #E7E2D8;align-items:baseline;">
        <div class="display" style="font-size:22px;font-weight:600;">${esc(lemma)}</div>
        <div class="mono" style="font-size:9px;color:#A6572E;text-align:right;text-transform:uppercase;letter-spacing:.05em;">${esc(due)}</div>
        <div class="reading" style="font-size:15px;color:#8A8378;font-style:italic;">${esc(gloss)}</div>
        <div class="mono" style="font-size:9px;color:#8A8378;text-align:right;">${esc(pos)}</div>
      </div>`,
      )
      .join("")}
  </div>`;
}

function bookDetailScreen({ chrome }) {
  return `
  <div class="status"></div>
  <div style="padding:14px 20px;"><span class="mono" style="font-size:11px;color:#8A8378;">← ${esc(chrome.tabLibrary)}</span></div>
  <div style="display:grid;grid-template-columns:104px 1fr;gap:18px;padding:8px 20px 24px;">
    <img src="${COVER.frankenstein}" style="width:104px;height:156px;object-fit:cover;display:block;" />
    <div style="display:flex;flex-direction:column;justify-content:space-between;">
      <div class="mono" style="font-size:10px;letter-spacing:.05em;border:1px solid #1E1C19;padding:2px 6px;align-self:flex-start;">C1</div>
      <div class="title display" style="font-size:26px;font-weight:600;line-height:1.08;margin:10px 0 4px;letter-spacing:-.01em;">Frankenstein</div>
      <div class="mono" style="font-size:12px;color:#8A8378;">Mary Shelley</div>
    </div>
  </div>
  <div style="margin:0 20px 22px; padding:16px; background:#1F3A5F; border-radius:16px; display:flex; align-items:center; justify-content:space-between;">
    <div>
      <div class="mono" style="color:#FAF8F4; font-size:13px; letter-spacing:.04em;">${esc(chrome.listenCta)} — Chapter I</div>
      <div class="mono" style="color:#8FB4DE; font-size:10px; margin-top:4px;">9:12</div>
    </div>
    <div style="width:36px;height:36px;border-radius:50%;background:#FAF8F4;display:flex;align-items:center;justify-content:center;color:#1F3A5F;font-size:14px;">▶</div>
  </div>
  <div style="padding:0 20px 12px;"><div class="display" style="font-size:18px;font-weight:600;">Bölümler</div></div>
  <div style="padding:0 20px;">
    ${["Letter I", "Letter II", "Chapter I", "Chapter II"]
      .map(
        (title, i) => `
      <div style="display:flex;align-items:baseline;gap:14px;padding:12px 0;border-bottom:1px solid #E7E2D8;">
        <div class="mono" style="font-size:11px;color:#8A8378;width:20px;">0${i + 1}</div>
        <div class="title display" style="font-size:15px;font-weight:500;flex:1;">${esc(title)}</div>
      </div>`,
      )
      .join("")}
  </div>`;
}

function languagePickerScreen({ chrome, __languagePicker }) {
  return `
  <div class="status"></div>
  <div style="padding:14px 20px;"><span class="mono" style="font-size:11px;color:#8A8378;">✕</span></div>
  <div style="padding:8px 24px;">
    <div class="display" style="font-size:26px;font-weight:600;">${esc(chrome.nativeTitle)}</div>
  </div>
  <div style="padding:16px 20px 0;">
    ${__languagePicker
      .slice(0, 8)
      .map(
        (l) => `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #E7E2D8;">
        <img src="https://hatscripts.github.io/circle-flags/flags/${esc(l.flagCode)}.svg" style="width:30px;height:30px;border-radius:50%;display:block;" />
        <div class="display" style="font-size:17px;font-weight:600;">${esc(l.nativeName)}</div>
      </div>`,
      )
      .join("")}
  </div>`;
}

function paywallScreen({ chrome }) {
  return `
  <div class="status"></div>
  <div style="padding:34px 26px 10px; text-align:center;">
    <div class="mono" style="font-size:10px;letter-spacing:.08em;color:#A6572E;text-transform:uppercase;">PREMIUM</div>
    <div class="display" style="font-size:24px;font-weight:600;margin-top:10px;line-height:1.2;">${esc(chrome.freeAlwaysNote)}</div>
  </div>
  <div style="margin:22px 20px; padding:18px; border:2px solid #A6572E; border-radius:16px; position:relative;">
    <div class="mono" style="position:absolute; top:-11px; right:16px; background:#A6572E; color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; letter-spacing:.05em;">${esc(chrome.planSavings)}</div>
    <div class="display" style="font-size:19px;font-weight:600;">${esc(chrome.planAnnual)}</div>
    <div class="mono" style="font-size:11px;color:#8A8378;margin-top:4px;">${esc(chrome.trialCta)}</div>
  </div>
  <div style="margin:22px 20px;">
    <div class="mono" style="width:100%;padding:16px;background:#1E1C19;color:#FAF8F4;text-align:center;border-radius:12px;font-size:12px;letter-spacing:.06em;">${esc(chrome.ctaSubscribe)}</div>
  </div>
  <div style="margin:30px 24px 0;">
    ${[chrome.benefitAudio, chrome.benefitLookups, chrome.benefitSecondPair]
      .filter(Boolean)
      .map(
        (label) => `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #E7E2D8;">
        <div style="width:22px;height:22px;border-radius:50%;background:rgba(166,87,46,.16);color:#A6572E;display:flex;align-items:center;justify-content:center;font-size:12px;">✓</div>
        <div class="display" style="font-size:16px;font-weight:600;">${esc(label)}</div>
      </div>`,
      )
      .join("")}
  </div>`;
}

const RENDERERS = {
  home: homeScreen,
  "reader-word": readerWordScreen,
  "reader-sentence": readerSentenceScreen,
  library: libraryScreen,
  vocabulary: vocabularyScreen,
  "book-detail": bookDetailScreen,
  "language-picker": languagePickerScreen,
  paywall: paywallScreen,
};

function renderPhone(phoneId, ctx) {
  const fn = RENDERERS[phoneId];
  if (!fn) throw new Error(`Bilinmeyen telefon ekranı: ${phoneId}`);
  return fn(ctx);
}

module.exports = { renderPhone, BASE_STYLE, COVER, esc };
