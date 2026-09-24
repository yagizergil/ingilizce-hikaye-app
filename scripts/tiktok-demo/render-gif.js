const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_ROOT = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_DIR = path.resolve(__dirname, ".tmp-gif");

// GIF boyutu -- tam 1080x1920'de 10fps*8.6sn bir GIF onlarca MB'a çıkar.
// 540x960 (yine 9:16), TikTok'a taşınmadan önce paylaşılabilir/WhatsApp'a
// atılabilir bir boyutta kalıyor.
const W = 540;
const H = 960;
const FPS = 12;
const HOOK_END = 2000;
const TAP_AT = 400;
const SHEET_CLOSE_AT = 3300;
const DEMO_END = 6200;
const TOTAL = 8600;
const FRAME_MS = 1000 / FPS;
const FRAME_COUNT = Math.round(TOTAL / FRAME_MS);

const PAPER = "#FAF8F4";
const INK = "#1E1C19";
const READING_INK = "#241F19";
const INK_SOFT = "#8A8378";
const HAIRLINE = "#E7E2D8";
const ACCENT = "#A6572E";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&family=Nunito:wght@600;700;800&family=Cairo:wght@600;700;800&display=swap" rel="stylesheet">';

function buildHtml({ cfg, langCode }) {
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
  .scene{position:absolute;inset:0;opacity:0;display:flex;align-items:center;justify-content:center;text-align:center;}
  .scene.show{opacity:1;}
  .pad{padding:0 44px;}
  .word-hl{position:relative;border-radius:3px;padding:1px 2px;}
  .word-hl.active{background:${ACCENT};color:#fff;}
  .sheet{position:absolute;left:0;right:0;bottom:0;margin:0 22px 22px;padding:20px 22px;background:#fff;border-radius:22px;box-shadow:0 14px 34px rgba(30,28,25,.16);transform:translateY(120%);}
  .sheet.open{transform:translateY(0);}
</style></head><body>

<div class="scene" id="hook">
  <div class="pad">
    <div class="lit" style="font-size:58px;font-weight:700;color:${INK};">${word}</div>
    <div style="height:16px;"></div>
    <div style="font-size:18px;font-weight:700;color:${INK_SOFT};max-width:430px;line-height:1.5;">${t.hook}</div>
  </div>
</div>

<div class="scene" id="demo">
  <div style="position:absolute;top:58px;left:0;right:0;text-align:center;">
    <div style="font-size:13px;font-weight:800;letter-spacing:.03em;color:${ACCENT};">${t.mechanicHeadline}</div>
  </div>
  <div style="position:absolute;top:140px;left:70px;right:70px;bottom:0;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:28px;overflow:hidden;box-shadow:0 20px 50px rgba(30,28,25,.18);">
    <div style="height:3px;background:${HAIRLINE};position:relative;"><i style="position:absolute;${rtl ? "right" : "left"}:0;top:0;bottom:0;width:31%;background:${ACCENT};display:block;"></i></div>
    <div class="lit" dir="ltr" style="padding:30px 32px 0;font-size:20px;line-height:1.85;color:${READING_INK};text-align:${textAlign};">
      ${sentence.replace(word, `<span class="word-hl" id="w">${word}</span>`)}
    </div>
    <div class="sheet" id="sheet">
      <div style="font-size:11px;font-weight:800;color:${INK_SOFT};">${pos}</div>
      <div class="lit" dir="ltr" style="font-style:italic;font-size:24px;margin-top:7px;color:${INK};text-align:${textAlign};">${word}</div>
      <div style="font-size:16px;font-weight:800;color:${ACCENT};margin-top:5px;">${gloss}</div>
      <div style="display:flex;flex-direction:${cardDir};gap:10px;margin-top:17px;">
        <div style="font-size:11px;font-weight:800;border:1.5px solid ${INK};padding:9px 13px;border-radius:11px;color:${INK};">🔊 ${t.listen}</div>
        <div style="font-size:11px;font-weight:800;background:${INK};color:${PAPER};padding:9px 13px;border-radius:11px;">⭐ ${t.save}</div>
      </div>
    </div>
  </div>
</div>

<div class="scene" id="cta">
  <div class="pad">
    <img src="${ICON_DATA_URI}" style="width:88px;height:88px;border-radius:22px;margin:0 auto 20px;display:block;" />
    <div class="lit" style="font-size:36px;font-weight:700;color:${INK};">Lingo Stories</div>
    <div style="height:10px;"></div>
    <div style="font-size:17px;font-weight:700;color:${INK_SOFT};">${t.ctaLine}</div>
    <div style="height:26px;"></div>
    <div style="font-size:13px;font-weight:800;color:${ACCENT};">${t.linkInBio}</div>
  </div>
</div>

<script>
  var hook = document.getElementById('hook');
  var demo = document.getElementById('demo');
  var cta = document.getElementById('cta');
  var w = document.getElementById('w');
  var sheet = document.getElementById('sheet');

  window.__applyState = function (time) {
    var showHook = time < ${HOOK_END};
    var showDemo = time >= ${HOOK_END} && time < ${DEMO_END};
    var showCta = time >= ${DEMO_END};
    hook.classList.toggle('show', showHook);
    demo.classList.toggle('show', showDemo);
    cta.classList.toggle('show', showCta);

    var sinceDemo = time - ${HOOK_END};
    var open = showDemo && sinceDemo >= ${TAP_AT} && sinceDemo < ${SHEET_CLOSE_AT};
    w.classList.toggle('active', open);
    sheet.classList.toggle('open', open);
  };
  window.__applyState(0);
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

async function encodeGif(framesRgba, outFile) {
  const gif = GIFEncoder();
  for (const rgba of framesRgba) {
    const palette = quantize(rgba, 128);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, W, H, { palette, delay: FRAME_MS });
  }
  gif.finish();
  fs.writeFileSync(outFile, gif.bytes());
}

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  for (const [langCode, cfg] of Object.entries(LANGS)) {
    const html = buildHtml({ cfg, langCode });
    const tmpFile = path.join(TMP_DIR, `${langCode}.html`);
    fs.writeFileSync(tmpFile, html, "utf8");
    await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const t = Math.round(i * FRAME_MS);
      await page.evaluate((time) => window.__applyState(time), t);
      const buf = await page.screenshot({ type: "png" });
      const png = PNG.sync.read(buf);
      frames.push(new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength));
    }

    const outDir = path.join(OUT_ROOT, langCode);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "animasyon.gif");
    await encodeGif(frames, outFile);
    console.log(`[${langCode}] ${FRAME_COUNT} kare -> ${outFile}`);
  }

  await browser.close();
  console.log("Bitti.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
