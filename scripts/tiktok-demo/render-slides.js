const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_DIR = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_DIR = path.resolve(__dirname, ".tmp");

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
  '<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">';

function shell(bodyHtml, bg) {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">${FONTS}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    width:${W}px;height:${H}px;background:${bg};color:${INK};
    font-family:'Nunito',sans-serif;position:relative;overflow:hidden;
    -webkit-font-smoothing:antialiased;
  }
  .lit{font-family:'Literata',Georgia,serif;}
  .eyebrow{font-size:26px;font-weight:800;letter-spacing:.06em;color:${ACCENT};}
  .pad{padding:0 90px;}
</style></head><body>${bodyHtml}</body></html>`;
}

function center(inner) {
  return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">${inner}</div>`;
}

const slides = [];

// 1 — hook
slides.push({
  id: "01-hook",
  html: shell(
    center(`
      <div class="pad">
        <div class="lit" style="font-size:120px;font-weight:700;color:${INK};letter-spacing:-.01em;">eavesdrop</div>
        <div style="height:36px;"></div>
        <div style="font-size:38px;font-weight:700;color:${INK_SOFT};max-width:820px;line-height:1.5;">Bu kelimeyi okuyabiliyorsun.<br>Peki ne demek olduğunu biliyor musun?</div>
      </div>
    `),
    PAPER,
  ),
});

// 2 — context sentence
slides.push({
  id: "02-cumle",
  html: shell(
    center(`
      <div class="pad">
        <div class="lit" style="font-size:56px;line-height:1.55;color:${READING_INK};font-style:italic;">
          &ldquo;She didn't mean to <span style="background:rgba(166,87,46,.18);text-decoration:underline dotted ${ACCENT} 2px;text-underline-offset:6px;">eavesdrop</span>, but the door was open.&rdquo;
        </div>
        <div style="height:44px;"></div>
        <div style="font-size:34px;font-weight:700;color:${INK_SOFT};">Cümlenin tamamını anladın mı?</div>
      </div>
    `),
    PAPER,
  ),
});

// 3 — reveal
slides.push({
  id: "03-cevap",
  html: shell(
    center(`
      <div class="pad">
        <div class="eyebrow">CEVAP</div>
        <div style="height:24px;"></div>
        <div class="lit" style="font-size:78px;font-weight:700;color:${INK};">kulak misafiri olmak</div>
        <div style="height:20px;"></div>
        <div style="font-size:36px;font-weight:700;color:${INK_SOFT};">İstemeden duymak.</div>
        <div style="height:44px;"></div>
        <div style="font-size:32px;font-weight:800;color:${ACCENT};max-width:760px;line-height:1.5;">Türkçede tek kelimesi yok.<br>İngilizcede var.</div>
      </div>
    `),
    PAPER,
  ),
});

// 4 — real app mechanic (reader + bottom sheet, real tokens)
slides.push({
  id: "04-mekanik",
  html: shell(
    `
    <div style="position:absolute;top:120px;left:0;right:0;text-align:center;">
      <div class="eyebrow">OKURKEN BİLMEDİĞİN KELİMEYE DOKUN</div>
    </div>
    <div style="position:absolute;top:280px;left:140px;right:140px;bottom:0;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:56px;overflow:hidden;box-shadow:0 40px 100px rgba(30,28,25,.18);">
      <div style="height:6px;background:${HAIRLINE};position:relative;"><i style="position:absolute;inset:0;width:31%;background:${ACCENT};display:block;"></i></div>
      <div class="lit" style="padding:60px 64px 0;font-size:42px;line-height:1.85;color:${READING_INK};">
        She didn't mean to <span style="background:rgba(166,87,46,.18);text-decoration:underline dotted ${ACCENT} 2px;text-underline-offset:6px;">eavesdrop</span>, but the door was open, and every word carried down the hallway.
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;margin:0 48px 48px;padding:44px 48px;background:#fff;border-radius:44px;box-shadow:0 30px 70px rgba(30,28,25,.16);">
        <div style="font-size:22px;font-weight:800;color:${INK_SOFT};letter-spacing:.06em;">FİİL</div>
        <div class="lit" style="font-style:italic;font-size:48px;margin-top:14px;color:${INK};">eavesdrop</div>
        <div style="font-size:34px;font-weight:800;color:${ACCENT};margin-top:10px;">kulak misafiri olmak</div>
        <div style="display:flex;gap:20px;margin-top:34px;">
          <div style="font-size:24px;font-weight:800;letter-spacing:.04em;border:2px solid ${INK};padding:18px 28px;border-radius:20px;color:${INK};">🔊 Dinle</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:.04em;background:${INK};color:${PAPER};padding:18px 28px;border-radius:20px;">⭐ Kaydet</div>
        </div>
      </div>
    </div>
    `,
    PAPER,
  ),
});

// 5 — benefit
slides.push({
  id: "05-fayda",
  html: shell(
    center(`
      <div class="pad">
        <div class="lit" style="font-size:64px;line-height:1.5;color:${INK};max-width:820px;">
          Sözlük açmıyorsun.<br>Hikâyeden çıkmıyorsun.
        </div>
        <div style="height:36px;"></div>
        <div style="font-size:36px;font-weight:800;color:${ACCENT};">Dokunuyorsun, öğreniyorsun,<br>okumaya devam ediyorsun.</div>
      </div>
    `),
    PAPER,
  ),
});

// 6 — inventory (dark surface for rhythm, matches the ASO gallery pattern)
slides.push({
  id: "06-envanter",
  html: shell(
    center(`
      <div class="pad" style="color:#FAF8F4;">
        <div style="display:flex;gap:70px;justify-content:center;flex-wrap:wrap;">
          <div><div class="lit" style="font-size:96px;font-weight:700;">119</div><div style="font-size:26px;font-weight:700;color:#C9BEB1;margin-top:6px;">kitap</div></div>
          <div><div class="lit" style="font-size:96px;font-weight:700;">26.000+</div><div style="font-size:26px;font-weight:700;color:#C9BEB1;margin-top:6px;">kelime</div></div>
          <div><div class="lit" style="font-size:96px;font-weight:700;">A1–C2</div><div style="font-size:26px;font-weight:700;color:#C9BEB1;margin-top:6px;">seviye</div></div>
        </div>
        <div style="height:56px;"></div>
        <div style="font-size:38px;font-weight:800;">Okumak tamamen ücretsiz.</div>
      </div>
    `),
    "#241F19",
  ),
});

// 7 — booktok bridge
slides.push({
  id: "07-booktok",
  html: shell(
    center(`
      <div class="pad">
        <div class="lit" style="font-size:66px;line-height:1.5;color:${INK};max-width:840px;">
          Kitap okumayı zaten seviyorsun.
        </div>
        <div style="height:30px;"></div>
        <div style="font-size:36px;font-weight:700;color:${INK_SOFT};max-width:760px;line-height:1.55;">
          Bir sonrakini İngilizce oku — tek fark, kelimelere dokunabiliyor olman.
        </div>
      </div>
    `),
    PAPER,
  ),
});

// 8 — CTA
slides.push({
  id: "08-cta",
  html: shell(
    center(`
      <div class="pad">
        <img src="${ICON_DATA_URI}" style="width:170px;height:170px;border-radius:44px;margin:0 auto 44px;display:block;box-shadow:0 20px 50px rgba(30,28,25,.18);" />

        <div class="lit" style="font-size:76px;font-weight:700;color:${INK};">Lingo Stories</div>
        <div style="height:20px;"></div>
        <div style="font-size:36px;font-weight:700;color:${INK_SOFT};">İlk hikâyeni bu akşam bitir.</div>
        <div style="height:60px;"></div>
        <div style="font-size:28px;font-weight:800;color:${ACCENT};letter-spacing:.02em;">↑ Biyodaki linkten indir</div>
      </div>
    `),
    PAPER,
  ),
});

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  let count = 0;
  for (const slide of slides) {
    const tmpFile = path.join(TMP_DIR, `${slide.id}.html`);
    fs.writeFileSync(tmpFile, slide.html, "utf8");
    await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const outFile = path.join(OUT_DIR, `${slide.id}.png`);
    await page.screenshot({ path: outFile });
    count += 1;
    console.log(`[${count}/${slides.length}] ${outFile}`);
  }

  await browser.close();
  console.log(`Bitti: ${count} görsel -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
