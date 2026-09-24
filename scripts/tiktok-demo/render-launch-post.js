const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_DIR = "C:\\Users\\PC\\Documents\\içerik\\gorseller\\lansman-postu";
const TMP_DIR = path.resolve(__dirname, ".tmp-launch");

const W = 1080;
const H = 1920;

// "Gece Okuması" konseptinin paleti -- gerçek bir mahkeme/gizem hikayesine
// (What Crosses, B2) atmosferik ton kanca-enerjisinden çok daha uygun.
const BG = "#12121A";
const INK = "#E8DCC8";
const ACCENT = "#C9A227";
const APP_PAPER = "#FAF8F4";
const APP_READING_INK = "#241F19";
const APP_INK_SOFT = "#8A8378";
const APP_HAIRLINE = "#E7E2D8";
const APP_ACCENT = "#A6572E";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Jost:wght@500;600;700&family=Literata:ital,opsz,wght@0,7..72,600;0,7..72,700;1,7..72,400&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">';

function shell(body) {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">${FONTS}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{width:${W}px;height:${H}px;background:${BG};position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;}
  .safe{padding:0 150px;}
  .serif{font-family:'Cormorant Garamond',serif;}
  .label{font-family:'Jost',sans-serif;font-weight:600;letter-spacing:.08em;color:${ACCENT};}
</style></head><body>${body}</body></html>`;
}

function center(inner) {
  return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">${inner}</div>`;
}

const slides = [];

// 1 — kanca: gerçek hikayenin öncülüne dayanan dramatik soru
slides.push({
  id: "01-hook",
  html: shell(
    center(`
    <div class="safe">
      <div class="serif" style="font-style:italic;font-weight:600;font-size:58px;line-height:1.5;color:${INK};">
        Bir mahkeme çevirmeni, duyduğu tek bir fiil çekimini yanlış aktarsa ne olur?
      </div>
    </div>
  `),
  ),
});

// 2 — gerçek alıntı (birebir, "What Crosses" adlı yayında olan hikayeden)
slides.push({
  id: "02-alinti",
  html: shell(
    center(`
    <div class="safe">
      <div dir="ltr" style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:40px;line-height:1.75;color:${INK};text-align:left;opacity:.95;">
        "He was watching her with the <span style="color:${ACCENT};">unhurried</span> calm of somebody who had recognised her long before."
      </div>
      <div style="height:28px;"></div>
      <div class="label" style="font-size:20px;">— WHAT CROSSES, LINGO STORIES'TE OKUNUYOR</div>
    </div>
  `),
  ),
});

// 3 — kelime kancası
slides.push({
  id: "03-soru",
  html: shell(
    center(`
    <div class="safe">
      <div class="label" style="font-size:24px;">BU KELİMEYİ BİLİYOR MUYDUN</div>
      <div style="height:20px;"></div>
      <div class="serif" style="font-style:italic;font-weight:700;font-size:96px;color:${INK};">unhurried</div>
    </div>
  `),
  ),
});

// 4 — mekanik: gerçek uygulama ekranı (dark tema, gerçek marka tokenları)
slides.push({
  id: "04-mekanik",
  html: shell(`
    <div style="position:absolute;top:110px;left:0;right:0;text-align:center;">
      <div class="label" style="font-size:22px;">DOKUNUYORSUN. ÇEVİRİ GELİYOR. HİKAYE DURMUYOR.</div>
    </div>
    <div style="position:absolute;top:220px;left:90px;right:90px;bottom:90px;background:#1B1712;border:1px solid #3A332B;border-radius:56px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.35);">
      <div style="height:5px;background:#3A332B;position:relative;"><i style="position:absolute;left:0;top:0;bottom:0;width:38%;background:${APP_ACCENT};display:block;"></i></div>
      <div dir="ltr" style="padding:60px 60px 0;font-family:'Literata',Georgia,serif;font-size:36px;line-height:1.85;color:#F3EEE6;text-align:left;">
        He was watching her with the <span style="background:rgba(166,87,46,.28);text-decoration:underline dotted ${APP_ACCENT} 2px;text-underline-offset:6px;">unhurried</span> calm of somebody who had recognised her.
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;margin:0 44px 44px;padding:40px 44px;background:#26211A;border-radius:40px;box-shadow:0 24px 60px rgba(0,0,0,.3);">
        <div style="font-family:'Nunito',sans-serif;font-size:19px;font-weight:800;color:#B7AEA1;">SIFAT</div>
        <div dir="ltr" style="font-family:'Literata',Georgia,serif;font-style:italic;font-size:42px;margin-top:8px;color:#F3EEE6;">unhurried</div>
        <div style="font-family:'Nunito',sans-serif;font-size:28px;font-weight:800;color:#E0A374;margin-top:6px;">acelesi olmayan, sakin</div>
        <div style="display:flex;gap:14px;margin-top:22px;">
          <div style="font-family:'Nunito',sans-serif;font-size:18px;font-weight:800;border:2px solid #F3EEE6;padding:12px 18px;border-radius:14px;color:#F3EEE6;">🔊 Dinle</div>
          <div style="font-family:'Nunito',sans-serif;font-size:18px;font-weight:800;background:#F3EEE6;color:#1B1712;padding:12px 18px;border-radius:14px;">⭐ Kaydet</div>
        </div>
      </div>
    </div>
  `),
});

// 5 — hikayenin gerçek bağlamı (dürüstlük ilkesi: sadece gerçek envanter)
slides.push({
  id: "05-hikaye",
  html: shell(
    center(`
    <div class="safe">
      <div class="serif" style="font-style:italic;font-weight:600;font-size:52px;line-height:1.55;color:${INK};">
        "What Crosses" — bir kelimeyi yanlış çeviren bir tercümanın hikayesi.
      </div>
      <div style="height:30px;"></div>
      <div class="label" style="font-size:22px;">GİZEM · B2 SEVİYE · LİNGO STORIES'TE ÜCRETSİZ</div>
    </div>
  `),
  ),
});

// 6 — envanter (yalnızca doğrulanabilir sayılar)
slides.push({
  id: "06-envanter",
  html: shell(
    center(`
    <div class="safe">
      <div class="label" style="font-size:24px;">"WHAT CROSSES" TEK BAŞINA DEĞİL</div>
      <div style="height:24px;"></div>
      <div class="serif" style="font-style:italic;font-weight:700;font-size:80px;color:${INK};">119 hikaye</div>
      <div style="height:14px;"></div>
      <div class="label" style="font-size:22px;">A1'DEN C2'YE · 26.000+ KELİME · ÜCRETSİZ</div>
    </div>
  `),
  ),
});

// 7 — lansman CTA (gerçek: uygulama şu an yayında)
slides.push({
  id: "07-cta",
  html: shell(
    center(`
    <div class="safe">
      <img src="${ICON_DATA_URI}" style="width:150px;height:150px;border-radius:38px;margin:0 auto 36px;display:block;box-shadow:0 20px 50px rgba(0,0,0,.35);" />
      <div class="serif" style="font-style:italic;font-weight:700;font-size:68px;color:${INK};">Lingo Stories</div>
      <div style="height:16px;"></div>
      <div class="label" style="font-size:24px;">ŞİMDİ APP STORE'DA</div>
      <div style="height:34px;"></div>
      <div style="font-family:'Jost',sans-serif;font-weight:600;font-size:30px;color:#B7AEA1;">İlk hikayeni bugün oku.</div>
    </div>
  `),
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
  console.log(`Bitti -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
