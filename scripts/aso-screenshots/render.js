const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { buildPage, CANVAS_W, CANVAS_H } = require("./master-template");

const content = require("./content.json");
const OUT_DIR = path.resolve(__dirname, "..", "..", "docs", "aso", "screenshots");
const TMP_DIR = path.resolve(__dirname, ".tmp");

const LANGS = ["tr", "en", "de", "fr", "it", "es", "ru", "ar", "zh", "ja"];

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: CANVAS_W, height: CANVAS_H } });

  let count = 0;
  for (const lang of LANGS) {
    const data = content[lang];
    const langDir = path.join(OUT_DIR, lang);
    fs.mkdirSync(langDir, { recursive: true });

    for (let i = 0; i < data.screens.length; i++) {
      const screen = data.screens[i];
      const html = buildPage({
        lang,
        dir: data.dir,
        screenIndex: i + 1,
        screen,
        chrome: data.chrome,
        sample: data.sample,
        languagePicker: content.__languagePicker,
      });

      const tmpFile = path.join(TMP_DIR, `${lang}-${screen.id}.html`);
      fs.writeFileSync(tmpFile, html, "utf8");

      await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);

      const outFile = path.join(langDir, `${String(i + 1).padStart(2, "0")}-${screen.id}.png`);
      await page.screenshot({ path: outFile });
      count += 1;
      console.log(`[${count}/80] ${outFile}`);
    }
  }

  await browser.close();
  console.log(`Bitti: ${count} görsel üretildi -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
