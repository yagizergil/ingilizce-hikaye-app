const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_ROOT = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_VIDEO_DIR = path.resolve(__dirname, ".tmp-video");

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

// Sahne zamanlaması (ms) -- hepsi bu üç perdede.
const HOOK_END = 2000;
const DEMO_END = 6200;
const TOTAL = 8600;
const TAP_AT = 400; // demo sahnesi başladıktan sonra
const SHEET_CLOSE_AT = 3300; // demo sahnesi başladıktan sonra

function page({ cfg, langCode }) {
  const { word, sentence, pos, gloss, t, rtl, uiFont } = cfg;
  const cardDir = rtl ? "row-reverse" : "row";
  const textAlign = rtl ? "right" : "left";

  return `<!doctype html>
<html lang="${langCode}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">${FONTS}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    width:${W}px;height:${H}px;background:${PAPER};color:${INK};
    font-family:'${uiFont}',sans-serif;position:relative;overflow:hidden;
    -webkit-font-smoothing:antialiased;
  }
  .lit{font-family:'Literata',Georgia,serif;}
  .scene{position:absolute;inset:0;opacity:0;transition:opacity .25s ease;display:flex;align-items:center;justify-content:center;text-align:center;}
  .scene.show{opacity:1;}
  .pad{padding:0 90px;}
  .word-hl{position:relative;border-radius:4px;padding:1px 2px;transition:background .2s ease,color .2s ease;}
  .word-hl.active{background:${ACCENT};color:#fff;}
  .sheet{position:absolute;left:0;right:0;bottom:0;margin:0 48px 48px;padding:44px 48px;background:#fff;border-radius:44px;box-shadow:0 30px 70px rgba(30,28,25,.16);transform:translateY(120%);transition:transform .45s cubic-bezier(.22,1,.36,1);}
  .sheet.open{transform:translateY(0);}
</style></head><body>

<div class="scene show" id="hook">
  <div class="pad">
    <div class="lit" style="font-size:120px;font-weight:700;color:${INK};">${word}</div>
    <div style="height:36px;"></div>
    <div style="font-size:36px;font-weight:700;color:${INK_SOFT};max-width:860px;line-height:1.55;">${t.hook}</div>
  </div>
</div>

<div class="scene" id="demo" style="display:block;">
  <div style="position:absolute;top:120px;left:0;right:0;text-align:center;">
    <div style="font-size:26px;font-weight:800;letter-spacing:.04em;color:${ACCENT};">${t.mechanicHeadline}</div>
  </div>
  <div style="position:absolute;top:280px;left:140px;right:140px;bottom:0;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:56px;overflow:hidden;box-shadow:0 40px 100px rgba(30,28,25,.18);">
    <div style="height:6px;background:${HAIRLINE};position:relative;"><i style="position:absolute;${rtl ? "right" : "left"}:0;top:0;bottom:0;width:31%;background:${ACCENT};display:block;"></i></div>
    <div class="lit" dir="ltr" style="padding:60px 64px 0;font-size:40px;line-height:1.85;color:${READING_INK};text-align:${textAlign};">
      ${sentence.replace(word, `<span class="word-hl" id="w">${word}</span>`)}
    </div>
    <div class="sheet" id="sheet">
      <div style="font-size:22px;font-weight:800;color:${INK_SOFT};letter-spacing:.04em;">${pos}</div>
      <div class="lit" dir="ltr" style="font-style:italic;font-size:48px;margin-top:14px;color:${INK};text-align:${textAlign};">${word}</div>
      <div style="font-size:32px;font-weight:800;color:${ACCENT};margin-top:10px;">${gloss}</div>
      <div style="display:flex;flex-direction:${cardDir};gap:20px;margin-top:34px;">
        <div style="font-size:22px;font-weight:800;border:2px solid ${INK};padding:18px 26px;border-radius:20px;color:${INK};">🔊 ${t.listen}</div>
        <div style="font-size:22px;font-weight:800;background:${INK};color:${PAPER};padding:18px 26px;border-radius:20px;">⭐ ${t.save}</div>
      </div>
    </div>
  </div>
</div>

<div class="scene" id="cta">
  <div class="pad">
    <img src="${ICON_DATA_URI}" style="width:170px;height:170px;border-radius:44px;margin:0 auto 44px;display:block;box-shadow:0 20px 50px rgba(30,28,25,.18);" />
    <div class="lit" style="font-size:74px;font-weight:700;color:${INK};">Lingo Stories</div>
    <div style="height:20px;"></div>
    <div style="font-size:34px;font-weight:700;color:${INK_SOFT};">${t.ctaLine}</div>
    <div style="height:60px;"></div>
    <div style="font-size:26px;font-weight:800;color:${ACCENT};">${t.linkInBio}</div>
  </div>
</div>

<script>
  var hook = document.getElementById('hook');
  var demo = document.getElementById('demo');
  var cta = document.getElementById('cta');
  var w = document.getElementById('w');
  var sheet = document.getElementById('sheet');

  setTimeout(function () {
    hook.classList.remove('show');
    demo.classList.add('show');
  }, ${HOOK_END});

  setTimeout(function () {
    w.classList.add('active');
    sheet.classList.add('open');
  }, ${HOOK_END + TAP_AT});

  setTimeout(function () {
    sheet.classList.remove('open');
    w.classList.remove('active');
  }, ${HOOK_END + SHEET_CLOSE_AT});

  setTimeout(function () {
    demo.classList.remove('show');
    cta.classList.add('show');
  }, ${DEMO_END});
</script>
</body></html>`;
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
      hook: "Bu kelimeyi okuyabiliyorsun. Peki ne demek olduğunu biliyor musun?",
      mechanicHeadline: "OKURKEN BİLMEDİĞİN KELİMEYE DOKUN",
      listen: "Dinle",
      save: "Kaydet",
      ctaLine: "İlk hikâyeni bu akşam bitir.",
      linkInBio: "↑ Biyodaki linkten indir",
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
      hook: "You can read this word. But do you actually know what it means?",
      mechanicHeadline: "TAP THE WORD WHILE YOU READ",
      listen: "Listen",
      save: "Save",
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
      mechanicHeadline: "TOCA LA PALABRA MIENTRAS LEES",
      listen: "Escuchar",
      save: "Guardar",
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
      mechanicHeadline: "WORT ANTIPPEN WÄHREND DU LIEST",
      listen: "Anhören",
      save: "Speichern",
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
      mechanicHeadline: "اضغط على الكلمة أثناء القراءة",
      listen: "استمع",
      save: "احفظ",
      ctaLine: "أنهِ قصتك الأولى الليلة.",
      linkInBio: "↑ الرابط في البايو",
    },
  },
};

async function main() {
  fs.mkdirSync(TMP_VIDEO_DIR, { recursive: true });
  const browser = await chromium.launch();

  for (const [langCode, cfg] of Object.entries(LANGS)) {
    const langVideoDir = path.join(TMP_VIDEO_DIR, langCode);
    fs.mkdirSync(langVideoDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: W, height: H },
      recordVideo: { dir: langVideoDir, size: { width: W, height: H } },
    });
    const pg = await context.newPage();

    const html = page({ cfg, langCode });
    const tmpFile = path.join(TMP_VIDEO_DIR, `${langCode}.html`);
    fs.writeFileSync(tmpFile, html, "utf8");

    await pg.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.waitForTimeout(TOTAL + 400);

    const video = pg.video();
    await context.close();

    const rawPath = await video.path();
    const outDir = path.join(OUT_ROOT, langCode);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "video.webm");
    fs.copyFileSync(rawPath, outFile);

    console.log(`[${langCode}] -> ${outFile}`);
  }

  await browser.close();
  console.log("Bitti: 5 video üretildi.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
