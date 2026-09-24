const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_ROOT = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_DIR = path.resolve(__dirname, ".tmp-i18n");

const W = 1080;
const H = 1920;

const PAPER = "#FAF8F4";
const INK = "#1E1C19";
const READING_INK = "#241F19";
const INK_SOFT = "#8A8378";
const HAIRLINE = "#E7E2D8";
const ACCENT = "#A6572E";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&family=Nunito:wght@600;700;800&family=Cairo:wght@600;700;800&display=swap" rel="stylesheet">';

function ltrWord(w) {
  return `<span dir="ltr" style="unicode-bidi:isolate;">${w}</span>`;
}

function shell({ bodyHtml, bg, lang, rtl, uiFont }) {
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">${FONTS}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    width:${W}px;height:${H}px;background:${bg};color:${INK};
    font-family:'${uiFont}',sans-serif;position:relative;overflow:hidden;
    -webkit-font-smoothing:antialiased;
  }
  .lit{font-family:'Literata',Georgia,serif;}
  .eyebrow{font-size:26px;font-weight:800;letter-spacing:.04em;color:${ACCENT};}
  .pad{padding:0 90px;}
</style></head><body>${bodyHtml}</body></html>`;
}

function center(inner) {
  return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">${inner}</div>`;
}

function buildSlides(cfg) {
  const { word, sentence, pos, gloss, t, rtl } = cfg;
  const listen = t.listen;
  const save = t.save;
  const cardOrder = rtl ? "row-reverse" : "row";

  return [
    {
      id: "01-hook",
      html: center(`
        <div class="pad">
          <div class="lit" style="font-size:120px;font-weight:700;color:${INK};letter-spacing:-.01em;">${word}</div>
          <div style="height:36px;"></div>
          <div style="font-size:36px;font-weight:700;color:${INK_SOFT};max-width:860px;line-height:1.55;">${t.hook}</div>
        </div>
      `),
    },
    {
      id: "02-sentence",
      html: center(`
        <div class="pad">
          <div class="lit" style="font-size:52px;line-height:1.6;color:${READING_INK};font-style:italic;">
            ${sentence}
          </div>
          <div style="height:44px;"></div>
          <div style="font-size:34px;font-weight:700;color:${INK_SOFT};">${t.didYouGetIt}</div>
        </div>
      `),
    },
    {
      id: "03-answer",
      html: center(`
        <div class="pad">
          <div class="eyebrow">${t.answerLabel}</div>
          <div style="height:24px;"></div>
          <div class="lit" style="font-size:${gloss.length > 22 ? 58 : 78}px;font-weight:700;color:${INK};max-width:900px;">${gloss}</div>
          <div style="height:20px;"></div>
          <div style="font-size:34px;font-weight:700;color:${INK_SOFT};max-width:800px;line-height:1.5;">${t.answerSub}</div>
        </div>
      `),
    },
    {
      id: "04-mechanic",
      html: `
      <div style="position:absolute;top:120px;left:0;right:0;text-align:center;">
        <div class="eyebrow">${t.mechanicHeadline}</div>
      </div>
      <div style="position:absolute;top:280px;left:140px;right:140px;bottom:0;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:56px;overflow:hidden;box-shadow:0 40px 100px rgba(30,28,25,.18);">
        <div style="height:6px;background:${HAIRLINE};position:relative;"><i style="position:absolute;${rtl ? "right" : "left"}:0;top:0;bottom:0;width:31%;background:${ACCENT};display:block;"></i></div>
        <div class="lit" dir="ltr" style="padding:60px 64px 0;font-size:40px;line-height:1.85;color:${READING_INK};text-align:${rtl ? "right" : "left"};">
          ${sentence.replace(word, `<span style="background:rgba(166,87,46,.18);text-decoration:underline dotted ${ACCENT} 2px;text-underline-offset:6px;">${word}</span>`)}
        </div>
        <div style="position:absolute;left:0;right:0;bottom:0;margin:0 48px 48px;padding:44px 48px;background:#fff;border-radius:44px;box-shadow:0 30px 70px rgba(30,28,25,.16);">
          <div style="font-size:22px;font-weight:800;color:${INK_SOFT};letter-spacing:.04em;">${pos}</div>
          <div class="lit" dir="ltr" style="font-style:italic;font-size:48px;margin-top:14px;color:${INK};text-align:${rtl ? "right" : "left"};">${word}</div>
          <div style="font-size:32px;font-weight:800;color:${ACCENT};margin-top:10px;">${gloss}</div>
          <div style="display:flex;flex-direction:${cardOrder};gap:20px;margin-top:34px;">
            <div style="font-size:22px;font-weight:800;letter-spacing:.02em;border:2px solid ${INK};padding:18px 26px;border-radius:20px;color:${INK};">🔊 ${listen}</div>
            <div style="font-size:22px;font-weight:800;letter-spacing:.02em;background:${INK};color:${PAPER};padding:18px 26px;border-radius:20px;">⭐ ${save}</div>
          </div>
        </div>
      </div>
      `,
    },
    {
      id: "05-benefit",
      html: center(`
        <div class="pad">
          <div class="lit" style="font-size:60px;line-height:1.5;color:${INK};max-width:860px;">${t.benefitLine1}</div>
          <div style="height:36px;"></div>
          <div style="font-size:34px;font-weight:800;color:${ACCENT};max-width:820px;line-height:1.5;">${t.benefitLine2}</div>
        </div>
      `),
    },
    {
      id: "06-inventory",
      dark: true,
      html: center(`
        <div class="pad" style="color:#FAF8F4;">
          <div style="display:flex;gap:70px;justify-content:center;flex-wrap:wrap;">
            <div><div class="lit" style="font-size:92px;font-weight:700;">119</div><div style="font-size:24px;font-weight:700;color:#C9BEB1;margin-top:6px;">${t.books}</div></div>
            <div><div class="lit" style="font-size:92px;font-weight:700;">26,000+</div><div style="font-size:24px;font-weight:700;color:#C9BEB1;margin-top:6px;">${t.words}</div></div>
            <div><div class="lit" style="font-size:92px;font-weight:700;">A1–C2</div><div style="font-size:24px;font-weight:700;color:#C9BEB1;margin-top:6px;">${t.levels}</div></div>
          </div>
          <div style="height:56px;"></div>
          <div style="font-size:36px;font-weight:800;">${t.freeToRead}</div>
        </div>
      `),
    },
    {
      id: "07-booktok",
      html: center(`
        <div class="pad">
          <div class="lit" style="font-size:62px;line-height:1.5;color:${INK};max-width:880px;">${t.booktok1}</div>
          <div style="height:30px;"></div>
          <div style="font-size:34px;font-weight:700;color:${INK_SOFT};max-width:800px;line-height:1.55;">${t.booktok2}</div>
        </div>
      `),
    },
    {
      id: "08-cta",
      html: center(`
        <div class="pad">
          <img src="${ICON_DATA_URI}" style="width:170px;height:170px;border-radius:44px;margin:0 auto 44px;display:block;box-shadow:0 20px 50px rgba(30,28,25,.18);" />
          <div class="lit" style="font-size:74px;font-weight:700;color:${INK};">Lingo Stories</div>
          <div style="height:20px;"></div>
          <div style="font-size:34px;font-weight:700;color:${INK_SOFT};">${t.ctaLine}</div>
          <div style="height:60px;"></div>
          <div style="font-size:26px;font-weight:800;color:${ACCENT};">${t.linkInBio}</div>
        </div>
      `),
    },
  ];
}

const LANGS = {
  en: {
    rtl: false,
    uiFont: "Nunito",
    word: "ephemeral",
    sentence: "The ephemeral glow of fireflies faded before she could name it.",
    pos: "ADJECTIVE",
    gloss: "lasting a very short time",
    t: {
      hook: "You can read this word. But do you actually know what it means?",
      didYouGetIt: "Did you catch the whole sentence?",
      answerLabel: "ANSWER",
      answerSub: "Fleeting. Gone almost as soon as it arrives.",
      mechanicHeadline: "TAP THE WORD WHILE YOU READ",
      listen: "Listen",
      save: "Save",
      benefitLine1: "No dictionary tab. No losing your place.",
      benefitLine2: "Tap. Learn. Keep reading.",
      books: "books",
      words: "words",
      levels: "levels",
      freeToRead: "Every book is free to read.",
      booktok1: "You already love reading.",
      booktok2: "Read your next book in English — the only difference is you can tap the words.",
      ctaLine: "Finish your first story tonight.",
      linkInBio: "↑ Link in bio",
    },
  },
  es: {
    rtl: false,
    uiFont: "Nunito",
    word: "wanderlust",
    sentence: "She felt a sudden wanderlust for places she'd never seen.",
    pos: "SUSTANTIVO",
    gloss: "deseo intenso de viajar",
    t: {
      hook: "Puedes leer esta palabra. ¿Pero sabes lo que significa?",
      didYouGetIt: "¿Entendiste la frase completa?",
      answerLabel: "RESPUESTA",
      answerSub: "Las ganas de explorar lugares que nunca has visto.",
      mechanicHeadline: "TOCA LA PALABRA MIENTRAS LEES",
      listen: "Escuchar",
      save: "Guardar",
      benefitLine1: "Sin diccionario. Sin perder el hilo.",
      benefitLine2: "Tocas, aprendes, sigues leyendo.",
      books: "libros",
      words: "palabras",
      levels: "niveles",
      freeToRead: "Leer es totalmente gratis.",
      booktok1: "Ya te encanta leer.",
      booktok2:
        "Lee tu próximo libro en inglés — la única diferencia es que puedes tocar las palabras.",
      ctaLine: "Termina tu primera historia esta noche.",
      linkInBio: "↑ Link en la bio",
    },
  },
  de: {
    rtl: false,
    uiFont: "Nunito",
    word: "bittersweet",
    sentence: "It was a bittersweet goodbye at the train station.",
    pos: "ADJEKTIV",
    gloss: "bittersüß",
    t: {
      hook: "Du kannst dieses Wort lesen. Aber weißt du, was es bedeutet?",
      didYouGetIt: "Hast du den ganzen Satz verstanden?",
      answerLabel: "ANTWORT",
      answerSub: "Schön und traurig zugleich.",
      mechanicHeadline: "WORT ANTIPPEN WÄHREND DU LIEST",
      listen: "Anhören",
      save: "Speichern",
      benefitLine1: "Kein Wörterbuch. Kein Fadenverlust.",
      benefitLine2: "Antippen, lernen, weiterlesen.",
      books: "Bücher",
      words: "Wörter",
      levels: "Niveaus",
      freeToRead: "Lesen ist komplett kostenlos.",
      booktok1: "Du liebst Lesen bereits.",
      booktok2:
        "Lies dein nächstes Buch auf Englisch — der einzige Unterschied: du kannst die Wörter antippen.",
      ctaLine: "Beende heute Abend deine erste Geschichte.",
      linkInBio: "↑ Link in der Bio",
    },
  },
  ar: {
    rtl: true,
    uiFont: "Cairo",
    word: "serendipity",
    sentence: "It was pure serendipity that they met that day.",
    pos: "اسم",
    gloss: "صدفة سعيدة",
    t: {
      hook: "تستطيع قراءة هذه الكلمة، لكن هل تعرف معناها؟",
      didYouGetIt: "هل فهمت الجملة كاملة؟",
      answerLabel: "الإجابة",
      answerSub: "أن يحدث شيء جميل من دون أن تخطط له.",
      mechanicHeadline: "اضغط على الكلمة أثناء القراءة",
      listen: "استمع",
      save: "احفظ",
      benefitLine1: "بدون قاموس. بدون فقدان التركيز.",
      benefitLine2: "تضغط، تتعلم، تكمل القراءة.",
      books: "كتابًا",
      words: "كلمة",
      levels: "مستوى",
      freeToRead: "القراءة مجانية بالكامل.",
      booktok1: "أنت بالفعل تحب القراءة.",
      booktok2: "اقرأ كتابك القادم بالإنجليزية — الفرق الوحيد أنك تستطيع الضغط على الكلمات.",
      ctaLine: "أنهِ قصتك الأولى الليلة.",
      linkInBio: "↑ الرابط في البايو",
    },
  },
};

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  let total = 0;
  for (const [langCode, cfg] of Object.entries(LANGS)) {
    const outDir = path.join(OUT_ROOT, langCode);
    fs.mkdirSync(outDir, { recursive: true });

    const slides = buildSlides(cfg);
    for (const slide of slides) {
      const bg = slide.dark ? "#241F19" : PAPER;
      const html = shell({
        bodyHtml: slide.html,
        bg,
        lang: langCode,
        rtl: cfg.rtl,
        uiFont: cfg.uiFont,
      });
      const tmpFile = path.join(TMP_DIR, `${langCode}-${slide.id}.html`);
      fs.writeFileSync(tmpFile, html, "utf8");
      await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const outFile = path.join(outDir, `${slide.id}.png`);
      await page.screenshot({ path: outFile });
      total += 1;
      console.log(`[${total}] ${outFile}`);
    }
  }

  await browser.close();
  console.log(`Bitti: ${total} görsel -> ${OUT_ROOT}\\{en,es,de,ar}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
