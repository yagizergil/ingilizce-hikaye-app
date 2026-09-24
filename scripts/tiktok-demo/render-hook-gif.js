const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const OUT_ROOT = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_DIR = path.resolve(__dirname, ".tmp-hookgif");

// Carousel'in 1. karesi -- tam boy (1080x1920), TikTok'a doğrudan
// yüklenebilir. Kısa ve kusursuz döngü (ilk kare == son kare) olacak
// şekilde kurgulandı: sinüs eğrisiyle nefes alan kelime + zıplayan
// "buraya dokun" işareti. Dosya küçük kalıyor çünkü hareket minimal ve
// zemin sabit (gifenc'in palet kotası az renk kullanıyor).
const W = 1080;
const H = 1920;
const FPS = 14;
const LOOP_MS = 1800;
const FRAME_MS = 1000 / FPS;
const FRAME_COUNT = Math.round(LOOP_MS / FRAME_MS);

const PAPER = "#FAF8F4";
const INK = "#1E1C19";
const INK_SOFT = "#8A8378";
const ACCENT = "#A6572E";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,700;1,7..72,400&family=Nunito:wght@700;800&family=Cairo:wght@700;800&display=swap" rel="stylesheet">';

function buildHtml({ cfg, langCode }) {
  const { word, hook, rtl, uiFont } = cfg;
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
  /* Güvenli alan: TikTok arayüzü (kullanıcı adı, açıklama, sağ ikon
     çubuğu) alt/sağ kenarları kapatıyor -- metin 1080 genişliğin orta
     ~720px'lik diliminde, üstte/altta bolca boşlukla duruyor. */
  .safe{padding:0 180px;}
</style></head><body>

<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
  <div class="safe">
    <div id="word" class="lit" style="font-size:130px;font-weight:700;color:${INK};transform-origin:center;">${word}</div>
    <div style="height:40px;"></div>
    <div style="font-size:38px;font-weight:700;color:${INK_SOFT};max-width:800px;line-height:1.5;">${hook}</div>
  </div>
</div>

<div id="tap" style="position:absolute;left:50%;bottom:520px;width:64px;height:64px;margin-left:-32px;border-radius:50%;background:${ACCENT};display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(166,87,46,.35);">
  <span style="font-size:30px;">👆</span>
</div>

<script>
  var word = document.getElementById('word');
  var tap = document.getElementById('tap');
  window.__applyState = function (t) {
    var phase = (t / ${LOOP_MS}) * Math.PI * 2;
    var scale = 1 + 0.035 * Math.sin(phase);
    word.style.transform = 'scale(' + scale.toFixed(4) + ')';
    var bob = Math.sin(phase) * 14;
    tap.style.transform = 'translateY(' + bob.toFixed(2) + 'px)';
    tap.style.opacity = String(0.75 + 0.25 * Math.sin(phase));
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
    hook: "Bu kelimeyi okuyabiliyorsun. Peki ne demek olduğunu biliyor musun?",
  },
  en: {
    rtl: false,
    uiFont: "Nunito",
    word: "ephemeral",
    hook: "You can read this word. But do you actually know what it means?",
  },
  es: {
    rtl: false,
    uiFont: "Nunito",
    word: "wanderlust",
    hook: "Puedes leer esta palabra. ¿Pero sabes lo que significa?",
  },
  de: {
    rtl: false,
    uiFont: "Nunito",
    word: "bittersweet",
    hook: "Du kannst dieses Wort lesen. Aber weißt du, was es bedeutet?",
  },
  ar: {
    rtl: true,
    uiFont: "Cairo",
    word: "serendipity",
    hook: "تستطيع قراءة هذه الكلمة، لكن هل تعرف معناها؟",
  },
};

async function encodeGif(framesRgba, outFile) {
  const gif = GIFEncoder();
  for (const rgba of framesRgba) {
    const palette = quantize(rgba, 64);
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
    const outFile = path.join(outDir, "01-hook.gif");
    await encodeGif(frames, outFile);

    // Eski statik 01-hook.png artık slayt 1 için KULLANILMAYACAK (GIF
    // onun yerini alıyor) -- karışıklık olmasın diye siliniyor. 02-08
    // aynen duruyor.
    const staticHook = path.join(outDir, "01-hook.png");
    if (fs.existsSync(staticHook)) fs.unlinkSync(staticHook);

    console.log(`[${langCode}] ${FRAME_COUNT} kare -> ${outFile}`);
  }

  await browser.close();
  console.log("Bitti.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
