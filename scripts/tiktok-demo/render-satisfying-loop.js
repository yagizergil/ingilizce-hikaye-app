const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_ROOT = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_DIR = path.resolve(__dirname, ".tmp-loop");

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

function shell({ bodyHtml, lang, rtl, uiFont }) {
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">${FONTS}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    width:${W}px;height:${H}px;background:${PAPER};color:${INK};
    font-family:'${uiFont}',sans-serif;position:relative;overflow:hidden;
    -webkit-font-smoothing:antialiased;
  }
  .lit{font-family:'Literata',Georgia,serif;}
  .safe{padding:0 170px;}
</style></head><body>${bodyHtml}</body></html>`;
}

function center(inner) {
  return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">${inner}</div>`;
}

// ---------- statik kareler (1,2,4,5,6) ----------

function buildStaticSlides(cfg) {
  const { t } = cfg;
  return [
    {
      id: "01-hook",
      html: center(`
        <div class="safe">
          <div class="lit" style="font-size:64px;line-height:1.4;color:${INK};font-weight:700;">${t.hook}</div>
        </div>
      `),
    },
    {
      id: "02-pain",
      html: center(`
        <div class="safe">
          <div style="font-size:42px;font-weight:800;color:${ACCENT};line-height:1.5;">${t.pain}</div>
        </div>
      `),
    },
    {
      id: "04-stats",
      html: center(`
        <div class="safe">
          <div style="display:flex;gap:60px;justify-content:center;flex-wrap:wrap;">
            <div><div class="lit" style="font-size:88px;font-weight:700;color:${INK};">119</div><div style="font-size:22px;font-weight:700;color:${INK_SOFT};margin-top:4px;">${t.books}</div></div>
            <div><div class="lit" style="font-size:88px;font-weight:700;color:${INK};">26,000+</div><div style="font-size:22px;font-weight:700;color:${INK_SOFT};margin-top:4px;">${t.words}</div></div>
          </div>
          <div style="height:36px;"></div>
          <div style="font-size:32px;font-weight:800;color:${ACCENT};">${t.free}</div>
        </div>
      `),
    },
    {
      id: "05-level",
      html: center(`
        <div class="safe">
          <div class="lit" style="font-size:56px;line-height:1.5;color:${INK};font-weight:700;">${t.levelLine}</div>
          <div style="height:26px;"></div>
          <div style="font-size:34px;font-weight:800;color:${ACCENT};letter-spacing:.02em;">A1 → C2</div>
        </div>
      `),
    },
    {
      id: "06-cta",
      html: center(`
        <div class="safe">
          <img src="${ICON_DATA_URI}" style="width:160px;height:160px;border-radius:40px;margin:0 auto 40px;display:block;box-shadow:0 20px 50px rgba(30,28,25,.16);" />
          <div class="lit" style="font-size:68px;font-weight:700;color:${INK};">Lingo Stories</div>
          <div style="height:18px;"></div>
          <div style="font-size:32px;font-weight:700;color:${INK_SOFT};">${t.ctaLine}</div>
        </div>
      `),
    },
  ];
}

// ---------- GIF kare (3): hızlı, tatmin edici döngü ----------

function buildLoopHtml(cfg, langCode) {
  const { word, sentence, gloss, pos, t, rtl, uiFont } = cfg;
  const cardDir = rtl ? "row-reverse" : "row";
  const align = rtl ? "right" : "left";

  const body = `
  <div style="position:absolute;top:70px;left:0;right:0;text-align:center;">
    <div style="font-size:26px;font-weight:800;letter-spacing:.03em;color:${ACCENT};">${t.loopCaption}</div>
  </div>
  <div style="position:absolute;top:180px;left:90px;right:90px;bottom:120px;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:56px;overflow:hidden;box-shadow:0 40px 100px rgba(30,28,25,.18);">
    <div class="lit" dir="ltr" style="padding:70px 64px 0;font-size:42px;line-height:1.9;color:${READING_INK};text-align:${align};">
      ${sentence.replace(word, `<span id="w" style="border-radius:4px;padding:1px 2px;">${word}</span>`)}
    </div>
    <div id="sheet" style="position:absolute;left:0;right:0;bottom:0;margin:0 48px 48px;padding:40px 46px;background:#fff;border-radius:40px;box-shadow:0 24px 60px rgba(30,28,25,.16);">
      <div style="font-size:20px;font-weight:800;color:${INK_SOFT};">${pos}</div>
      <div class="lit" dir="ltr" style="font-style:italic;font-size:42px;margin-top:10px;color:${INK};text-align:${align};">${word}</div>
      <div style="font-size:28px;font-weight:800;color:${ACCENT};margin-top:8px;">${gloss}</div>
      <div style="display:flex;flex-direction:${cardDir};gap:16px;margin-top:26px;">
        <div style="font-size:19px;font-weight:800;border:2px solid ${INK};padding:14px 22px;border-radius:16px;color:${INK};">🔊</div>
        <div style="font-size:19px;font-weight:800;background:${INK};color:${PAPER};padding:14px 22px;border-radius:16px;">⭐ ${t.save}</div>
      </div>
    </div>
  </div>
  <div id="tap" style="position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:${ACCENT};opacity:0;box-shadow:0 10px 26px rgba(166,87,46,.4);"></div>
  <script>
    var w = document.getElementById('w');
    var sheet = document.getElementById('sheet');
    var tap = document.getElementById('tap');
    var wRect = null;
    function measure() { wRect = w.getBoundingClientRect(); }
    window.addEventListener('load', measure);
    setTimeout(measure, 50);

    // Döngü: 1400ms -- 0-150 dokunma belirir, 150-450 sheet açılır (hızlı,
    // "satisfying" hissi hız veriyor), 450-950 açık kalır, 950-1200 kapanır.
    var CYCLE = 1400;
    window.__applyState = function (t) {
      var p = t % CYCLE;
      if (!wRect) measure();
      var cx = wRect ? wRect.left + wRect.width / 2 : ${W / 2};
      var cy = wRect ? wRect.top + wRect.height / 2 : ${H / 2};
      tap.style.left = cx + 'px';
      tap.style.top = cy + 'px';

      var tapVisible = p >= 0 && p < 250;
      tap.style.opacity = tapVisible ? '0.9' : '0';
      var tapScale = tapVisible ? (1 - 0.3 * (p / 250)) : 1;
      tap.style.transform = 'scale(' + tapScale.toFixed(3) + ')';

      var open = p >= 150 && p < 1150;
      sheet.style.transform = open ? 'translateY(0)' : 'translateY(120%)';
      sheet.style.transition = 'transform ' + (open ? '220ms' : '260ms') + ' cubic-bezier(.22,1,.36,1)';
      w.style.background = open ? '${ACCENT}' : 'transparent';
      w.style.color = open ? '#fff' : '${READING_INK}';
    };
    window.__applyState(0);
  </script>
  `;
  return shell({ bodyHtml: body, lang: langCode, rtl, uiFont });
}

const LANGS = {
  tr: {
    rtl: false,
    uiFont: "Nunito",
    word: "eavesdrop",
    sentence: "She didn't mean to eavesdrop, but the door was open.",
    pos: "FİİL",
    gloss: "kulak misafiri olmak",
    t: {
      hook: "İngilizce okurken bilmediğin kelimeye ne yapıyorsun?",
      pain: "Sözlüğe mi bakıyorsun? Cümlenin ortasında mı kayboluyorsun?",
      loopCaption: "DOKUN → ÇEVİR → KAYDET",
      save: "Kaydet",
      books: "kitap",
      words: "kelime",
      free: "Hepsi ücretsiz.",
      levelLine: "Seviyene uygun bir hikaye seç.",
      ctaLine: "Bu döngüyü kendin dene.",
    },
  },
  en: {
    rtl: false,
    uiFont: "Nunito",
    word: "ephemeral",
    sentence: "The ephemeral glow of fireflies faded before she could name it.",
    pos: "ADJECTIVE",
    gloss: "lasting a very short time",
    t: {
      hook: "What do you do when you hit a word you don't know?",
      pain: "Open a dictionary? Lose your place in the story?",
      loopCaption: "TAP → TRANSLATE → SAVE",
      save: "Save",
      books: "books",
      words: "words",
      free: "All free.",
      levelLine: "Pick a story that matches your level.",
      ctaLine: "Try this loop yourself.",
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
      hook: "¿Qué haces cuando encuentras una palabra que no conoces?",
      pain: "¿Abres el diccionario? ¿Pierdes el hilo de la historia?",
      loopCaption: "TOCA → TRADUCE → GUARDA",
      save: "Guardar",
      books: "libros",
      words: "palabras",
      free: "Todo gratis.",
      levelLine: "Elige una historia según tu nivel.",
      ctaLine: "Pruébalo tú mismo.",
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
      hook: "Was machst du, wenn du ein unbekanntes Wort liest?",
      pain: "Wörterbuch aufschlagen? Den Faden verlieren?",
      loopCaption: "ANTIPPEN → ÜBERSETZEN → SPEICHERN",
      save: "Speichern",
      books: "Bücher",
      words: "Wörter",
      free: "Alles kostenlos.",
      levelLine: "Wähle eine Geschichte passend zu deinem Niveau.",
      ctaLine: "Probier diesen Loop selbst aus.",
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
      hook: "ماذا تفعل عندما تصادف كلمة لا تعرفها أثناء القراءة؟",
      pain: "تفتح قاموسًا؟ تفقد التركيز في منتصف الجملة؟",
      loopCaption: "اضغط  ←  ترجم  ←  احفظ",
      save: "احفظ",
      books: "كتابًا",
      words: "كلمة",
      free: "كل ذلك مجانًا.",
      levelLine: "اختر قصة تناسب مستواك.",
      ctaLine: "جربها بنفسك.",
    },
  },
};

const GIF_W = 1080,
  GIF_H = 1920,
  GIF_FPS = 16,
  GIF_LOOPS = 3,
  GIF_CYCLE_MS = 1400;
const GIF_TOTAL_MS = GIF_LOOPS * GIF_CYCLE_MS;
const GIF_FRAME_MS = 1000 / GIF_FPS;
const GIF_FRAME_COUNT = Math.round(GIF_TOTAL_MS / GIF_FRAME_MS);

async function encodeGif(framesRgba, outFile) {
  const gif = GIFEncoder();
  for (const rgba of framesRgba) {
    const palette = quantize(rgba, 96);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, GIF_W, GIF_H, { palette, delay: GIF_FRAME_MS });
  }
  gif.finish();
  fs.writeFileSync(outFile, gif.bytes());
}

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  for (const [langCode, cfg] of Object.entries(LANGS)) {
    const outDir = path.join(OUT_ROOT, langCode, "loop-post");
    fs.mkdirSync(outDir, { recursive: true });

    // statik kareler
    for (const slide of buildStaticSlides(cfg)) {
      const html = shell({
        bodyHtml: slide.html,
        lang: langCode,
        rtl: cfg.rtl,
        uiFont: cfg.uiFont,
      });
      const tmpFile = path.join(TMP_DIR, `${langCode}-${slide.id}.html`);
      fs.writeFileSync(tmpFile, html, "utf8");
      await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);
      const outFile = path.join(outDir, `${slide.id}.png`);
      await page.screenshot({ path: outFile });
      console.log(`[${langCode}] ${outFile}`);
    }

    // GIF kare (3)
    const loopHtml = buildLoopHtml(cfg, langCode);
    const loopTmp = path.join(TMP_DIR, `${langCode}-loop.html`);
    fs.writeFileSync(loopTmp, loopHtml, "utf8");
    await page.goto(`file://${loopTmp}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);

    const frames = [];
    for (let i = 0; i < GIF_FRAME_COUNT; i += 1) {
      const t = Math.round(i * GIF_FRAME_MS);
      await page.evaluate((time) => window.__applyState(time), t);
      const buf = await page.screenshot({ type: "png" });
      const png = PNG.sync.read(buf);
      frames.push(new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength));
    }
    const gifOut = path.join(outDir, "03-loop.gif");
    await encodeGif(frames, gifOut);
    console.log(`[${langCode}] ${GIF_FRAME_COUNT} kare -> ${gifOut}`);
  }

  await browser.close();
  console.log("Bitti.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
