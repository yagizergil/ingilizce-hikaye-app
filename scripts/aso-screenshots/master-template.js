const { renderPhone, BASE_STYLE, esc } = require("./phones");

const FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">';

/**
 * Kanvas boyutu -- App Store'un 6,7" iPhone galerisi için kabul ettiği
 * çözünürlük (App Store Connect bunu diğer boyutlara otomatik ölçekliyor,
 * tek bir set yüklemek yeterli). Rakip araştırması farklı bir kesin sayı
 * çıkarırsa (`docs/aso/rakip-arastirmasi.md`) burası tek satırdan güncellenir.
 */
const CANVAS_W = 1290;
const CANVAS_H = 2796;

// Telefon içeriği mockups/*.html'deki fiziksel piksel boyutu (390x844).
const PHONE_W = 390;
const PHONE_H = 844;
const DEVICE_PADDING = 14; // siyah çerçeve kalınlığı
const DEVICE_CONTENT_W = 870; // ekranın kanvasta kaplayacağı iç genişlik (bezel hariç)
const SCALE = DEVICE_CONTENT_W / PHONE_W;
const DEVICE_CONTENT_H = Math.round(PHONE_H * SCALE);
const DEVICE_W = DEVICE_CONTENT_W + DEVICE_PADDING * 2;
const DEVICE_H = DEVICE_CONTENT_H + DEVICE_PADDING * 2;

function buildPage({ lang, dir, screenIndex, screen, chrome, sample, languagePicker }) {
  const isDark = screenIndex % 2 === 0; // 2,4,6,8 -> koyu zemin, ritim için
  const bg = isDark ? "#1F3A5F" : "#FAF8F4";
  const ink = isDark ? "#FAF8F4" : "#1E1C19";
  const inkSoft = isDark ? "#B9C9DC" : "#8A8378";
  const accent = "#A6572E";

  const phoneHtml = renderPhone(screen.phone, {
    chrome,
    sample,
    __languagePicker: languagePicker,
    dir,
  });

  // NEDEN html'e dir="rtl" YOK: kanvasın kendisi (başlık/telefon çerçevesi
  // yerleşimi) HER ZAMAN soldan sağa kalıyor -- yalnızca telefon EKRANININ
  // İÇERİĞİ (gerçek uygulamanın Arapça'da yaptığı gibi) sağdan sola akıyor.
  // İlk denemede dir="rtl" <html>'e konunca, ölçeklenmiş .screen div'i
  // .device kutusunun içinde "başlangıç" (artık sağ) kenarına yapışıp
  // siyah çerçeveden taştı -- bu yalnızca metin hizası değil, kutu
  // yerleşimini de tersine çeviren bir CSS mantık hatasıydı.
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8" />
<title>${esc(lang)}-${esc(screen.id)}</title>
${FONTS_LINK}
<style>
  html,body{ margin:0; padding:0; direction:ltr; }
  body{
    width:${CANVAS_W}px; height:${CANVAS_H}px; background:${bg}; color:${ink};
    -webkit-font-smoothing:antialiased; overflow:hidden; position:relative;
    font-family:'IBM Plex Mono', monospace;
  }
  ${BASE_STYLE}
  .canvas{ display:flex; flex-direction:column; align-items:center; width:100%; height:100%; padding:110px 90px 0; }
  .eyebrow{ font-size:28px; letter-spacing:.14em; text-transform:uppercase; color:${accent}; text-align:center; font-weight:600; direction:${dir}; }
  .headline{ font-family:'Fraunces', Georgia, serif; font-weight:700; font-size:76px; line-height:1.1;
    letter-spacing:-.01em; text-align:center; margin:22px 0 0; max-width:1080px; text-wrap:balance; color:${ink}; direction:${dir}; }
  .sub{ font-family:'Literata', Georgia, serif; font-size:34px; line-height:1.4; text-align:center;
    color:${inkSoft}; margin:24px 0 0; max-width:920px; direction:${dir}; }
  .device{ margin-top:56px; position:relative; width:${DEVICE_W}px; height:${DEVICE_H}px; border-radius:64px;
    background:#0c0c0c; box-shadow:0 60px 120px rgba(0,0,0,.35); flex-shrink:0; }
  .device .screen{ position:absolute; top:${DEVICE_PADDING}px; left:${DEVICE_PADDING}px;
    width:${PHONE_W}px; height:${PHONE_H}px; border-radius:52px; overflow:hidden;
    transform-origin:top left; transform: scale(${SCALE.toFixed(5)}); direction:ltr; }
  .notch{ position:absolute; top:14px; left:50%; transform:translateX(-50%); width:120px; height:34px;
    background:#0c0c0c; border-radius:20px; z-index:5; }
</style>
</head>
<body>
  <div class="canvas">
    ${screen.eyebrow ? `<div class="eyebrow">${esc(screen.eyebrow)}</div>` : ""}
    <div class="headline">${esc(screen.headline)}</div>
    <div class="sub">${esc(screen.sub)}</div>
    <div class="device">
      <div class="notch"></div>
      <div class="screen phone-body" dir="${dir}">
        ${phoneHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildPage, CANVAS_W, CANVAS_H };
