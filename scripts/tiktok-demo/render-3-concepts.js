const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ICON_B64 = fs.readFileSync(path.join(__dirname, "icon-b64.txt"), "utf8").trim();
const ICON_DATA_URI = `data:image/png;base64,${ICON_B64}`;

const OUT_ROOT = "C:\\Users\\PC\\Documents\\içerik\\gorseller";
const TMP_DIR = path.resolve(__dirname, ".tmp-3concepts");

const W = 1080;
const H = 1920;

// Uygulamanın GERÇEK marka tokenları -- mekanik (ekran görüntüsü) karesi
// HER konseptte bu paleti kullanıyor, konseptin kendi renginden bağımsız.
// NEDEN: rakip araştırması (docs/aso/rakip-arastirmasi.md) net -- gerçek
// ürünle uyuşmayan bir görsel dil kurulum sonrası hayal kırıklığına yol
// açıyor. Kanca/CTA gibi "paketleme" kareleri konseptin kendi kimliğinde,
// ama "işte uygulama bu" dediğimiz an her zaman gerçek.
const APP = {
  bg: "#FAF8F4",
  ink: "#1E1C19",
  readingInk: "#241F19",
  inkSoft: "#8A8378",
  hairline: "#E7E2D8",
  accent: "#A6572E",
};

// DENETİM BULGUSU: Anton ve Oswald bu Chromium sürümünde Türkçe "Ö"
// harfinin çift noktasını (dieresis) yanlış konumlandırıyor -- harfin
// üstünde, bir önceki satırın içine taşan kopuk bir şekil olarak
// görünüyor. İkisi de FONT_LINKS'ten çıkarıldı, "Bebas Neue" (aynı
// TikTok-native kalın/dar aile, ayrıca araştırmada doğrulanmış bir
// caption fontu) Türkçe glifleri doğru çiziyor.
const FONT_LINKS = {
  "Bebas Neue": "Bebas+Neue",
  "Space Grotesk": "Space+Grotesk:wght@500;700",
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,600;1,500",
  Jost: "Jost:wght@500;600;700",
  "Archivo Black": "Archivo+Black",
  "IBM Plex Mono": "IBM+Plex+Mono:wght@500;600;700",
  Literata: "Literata:ital,opsz,wght@0,7..72,600;0,7..72,700;1,7..72,400",
  Nunito: "Nunito:wght@600;700;800",
  Cairo: "Cairo:wght@600;700;800",
};

function fontsLinkTag(names) {
  const families = [...new Set(names)].map((n) => `family=${FONT_LINKS[n]}`).join("&");
  return (
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    `<link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet">`
  );
}

function shell({ body, bg, fonts, lang, rtl }) {
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">${fontsLinkTag(fonts)}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{width:${W}px;height:${H}px;background:${bg};position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;}
  .safe{padding:0 150px;}
</style></head><body>${body}</body></html>`;
}

/**
 * DENETİM BULGUSU: CSS `text-transform:uppercase`, içinde zaten büyük
 * "İ" (U+0130) geçen Türkçe metinle birleşince bazı Chromium
 * sürümlerinde bozuk/kopuk bir aksan işareti render ediyordu (satırın
 * üstünde asılı kalan bir nokta/kesik şekil). Büyütmeyi CSS'e değil
 * Node'a taşımak -- `toLocaleUpperCase("tr-TR")` doğru Türkçe büyütmeyi
 * (i→İ, ı→I) tek seferde, düz metin olarak yapıyor, tarayıcının kendi
 * transform'una hiç gerek kalmıyor.
 */
function toUpperSmart(str, lang) {
  return str.toLocaleUpperCase(lang === "tr" ? "tr-TR" : undefined);
}

function center(inner, extraStyle = "") {
  return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;${extraStyle}">${inner}</div>`;
}

// ---------------- Konsept 1: MEME ENERJİSİ ----------------
const C1 = { bg: "#FFE94D", ink: "#0A0A0A", accent: "#FF3366", white: "#FFFFFF" };
function c1Display(t, size) {
  return `<div style="font-family:'Bebas Neue',sans-serif;font-size:${size}px;line-height:1.35;padding-top:.15em;color:${C1.ink};">${t}</div>`;
}
function c1Body(t, size, color) {
  return `<div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${size}px;color:${color || C1.ink};line-height:1.5;">${t}</div>`;
}
function c1Slides(cfg) {
  const { word, sentence, gloss, rtl } = cfg;
  const t = cfg;
  return [
    {
      id: "01",
      bg: C1.bg,
      html: center(`<div class="safe">${c1Display(toUpperSmart(t.s1, cfg.lang), 92)}</div>`),
    },
    {
      id: "02",
      bg: C1.bg,
      html: center(`
        <div class="safe">
          <div class="lit" dir="ltr" style="font-family:'Space Grotesk',sans-serif;font-weight:500;font-style:italic;font-size:38px;line-height:1.6;color:${C1.ink};text-align:${rtl ? "right" : "left"};">
            "${sentence.replace(word, `<b style="background:${C1.accent};color:${C1.white};padding:2px 6px;">${word}</b>`)}"
          </div>
          <div style="height:34px;"></div>
          ${c1Body(t.s2, 34, C1.accent)}
        </div>
      `),
    },
    {
      id: "03",
      bg: C1.bg,
      html: buildMechanicSlide({
        word,
        sentence,
        gloss,
        pos: t.pos,
        listen: t.listen,
        save: t.save,
        rtl,
        caption: t.s3,
        captionColor: C1.accent,
        captionFont: "Space Grotesk",
        captionSize: 30,
        lang: cfg.lang,
      }),
    },
    {
      id: "04",
      bg: C1.ink,
      html: center(`
        <div class="safe">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:118px;color:${C1.white};line-height:1;">119</div>
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;color:${C1.accent};margin-top:6px;">${t.books}</div>
          <div style="height:30px;"></div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:96px;color:${C1.white};line-height:1;">26.000+</div>
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;color:${C1.accent};margin-top:6px;">${t.words}</div>
          <div style="height:34px;"></div>
          ${c1Body(t.free, 30, C1.white)}
        </div>
      `),
    },
    {
      id: "05",
      bg: C1.accent,
      html: center(`
        <div class="safe">
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:30px;color:${C1.white};">${word}</div>
          <div style="height:14px;"></div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:64px;color:${C1.white};line-height:1.15;">${gloss}</div>
          <div style="height:44px;"></div>
          <img src="${ICON_DATA_URI}" style="width:96px;height:96px;border-radius:24px;margin:0 auto 20px;display:block;" />
          <div style="font-family:'Bebas Neue',sans-serif;font-size:44px;color:${C1.ink};">${t.cta}</div>
        </div>
      `),
    },
  ];
}

// ---------------- Konsept 2: GECE OKUMASI ----------------
const C2 = { bg: "#12121A", ink: "#E8DCC8", accent: "#C9A227" };
function c2Display(t, size, style = "") {
  return `<div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:${size}px;line-height:1.4;color:${C2.ink};${style}">${t}</div>`;
}
function c2Label(t, size, color) {
  return `<div style="font-family:'Jost',sans-serif;font-weight:600;letter-spacing:.08em;font-size:${size}px;color:${color || C2.accent};">${t}</div>`;
}
function c2Slides(cfg) {
  const { word, sentence, gloss, rtl } = cfg;
  const t = cfg;
  return [
    { id: "01", bg: C2.bg, html: center(`<div class="safe">${c2Display(t.s1, 60)}</div>`) },
    {
      id: "02",
      bg: C2.bg,
      html: center(`
        <div class="safe">
          <div dir="ltr" style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:38px;line-height:1.7;color:${C2.ink};text-align:${rtl ? "right" : "left"};opacity:.92;">
            "${sentence.replace(word, `<span style="color:${C2.accent};">${word}</span>`)}"
          </div>
          <div style="height:34px;"></div>
          ${c2Label(t.s2, 22)}
        </div>
      `),
    },
    {
      id: "03",
      bg: C2.bg,
      html: buildMechanicSlide({
        word,
        sentence,
        gloss,
        pos: t.pos,
        listen: t.listen,
        save: t.save,
        rtl,
        dark: true,
        caption: t.s3,
        captionColor: C2.accent,
        captionFont: "Jost",
        captionSize: 24,
        captionUpper: true,
        lang: cfg.lang,
      }),
    },
    {
      id: "04",
      bg: C2.bg,
      html: center(`
        <div class="safe">
          ${c2Label(t.stats, 26)}
        </div>
      `),
    },
    {
      id: "05",
      bg: C2.bg,
      html: center(`
        <div class="safe">
          <div style="font-family:'Jost',sans-serif;font-weight:600;font-size:28px;color:${C2.ink};">${word} = ${gloss}</div>
          <div style="height:40px;"></div>
          ${c2Display(t.cta, 46)}
          <div style="height:36px;"></div>
          <div style="font-family:'Cormorant Garamond',serif;font-weight:600;font-size:34px;color:${C2.accent};">Lingo Stories</div>
        </div>
      `),
    },
  ];
}

// ---------------- Konsept 3: ÇIPLAK GERÇEK ----------------
const C3 = { bg: "#FFFFFF", ink: "#000000", accent: "#FF4B00" };
function c3Display(t, size, color) {
  return `<div style="font-family:'Archivo Black',sans-serif;font-size:${size}px;line-height:1.25;padding-top:.1em;color:${color || C3.ink};">${t}</div>`;
}
function c3Mono(t, size, color) {
  return `<div style="font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:${size}px;color:${color || C3.ink};line-height:1.6;">${t}</div>`;
}
function c3Slides(cfg) {
  const { rtl } = cfg;
  const t = cfg;
  const langGrid = ["TR", "EN", "DE", "FR", "IT", "ES", "RU", "AR", "ZH", "JA"];
  return [
    {
      id: "01",
      bg: C3.bg,
      html: center(
        `<div class="safe">${c3Mono(t.s1Label, 26, C3.accent)}<div style="height:20px;"></div>${c3Display("119", 190)}</div>`,
      ),
    },
    {
      id: "02",
      bg: C3.ink,
      html: center(
        `<div class="safe">${c3Display("26,000+", 130, "#fff")}<div style="height:18px;"></div>${c3Mono(t.s2, 30, C3.accent)}</div>`,
      ),
    },
    {
      id: "03",
      bg: C3.bg,
      html: center(
        `<div class="safe">${c3Display(t.s3big, 120)}<div style="height:18px;"></div>${c3Mono(t.s3, 28)}</div>`,
      ),
    },
    {
      id: "04",
      bg: C3.bg,
      html: buildMechanicSlide({
        word: cfg.word,
        sentence: cfg.sentence,
        gloss: cfg.gloss,
        pos: t.pos,
        listen: t.listen,
        save: t.save,
        rtl,
        mono: true,
        caption: t.s4,
        captionColor: C3.accent,
        captionFont: "IBM Plex Mono",
        captionSize: 26,
        lang: cfg.lang,
      }),
    },
    {
      id: "05",
      bg: C3.ink,
      html: center(`
        <div class="safe">
          ${c3Mono(t.s5label, 24, C3.accent)}
          <div style="height:22px;"></div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;max-width:760px;">
            ${langGrid.map((l) => `<div style="border:2px solid ${C3.accent};color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:22px;padding:10px 0;border-radius:8px;">${l}</div>`).join("")}
          </div>
          <div style="height:30px;"></div>
          ${c3Display(t.cta, 40, "#fff")}
        </div>
      `),
    },
  ];
}

// ---------------- Mekanik (gerçek uygulama görünümü) ----------------
function buildMechanicSlide({
  word,
  sentence,
  gloss,
  pos,
  listen,
  save,
  rtl,
  dark,
  mono,
  caption,
  captionColor,
  captionFont,
  captionSize,
  captionUpper,
  lang,
}) {
  const bg = dark ? "#1B1712" : APP.bg;
  const ink = dark ? "#F3EEE6" : APP.readingInk;
  const cardBg = dark ? "#26211A" : "#FFFFFF";
  const cardInk = dark ? "#F3EEE6" : APP.ink;
  const hairline = dark ? "#3A332B" : APP.hairline;
  const align = rtl ? "right" : "left";
  const cardDir = rtl ? "row-reverse" : "row";
  const captionText = captionUpper ? toUpperSmart(caption, lang) : caption;
  const captionStyle = `font-family:'${captionFont}',sans-serif;font-weight:700;font-size:${captionSize}px;color:${captionColor};${captionUpper ? "letter-spacing:.05em;" : ""}`;

  return `
  <div style="position:absolute;top:70px;left:0;right:0;text-align:center;">
    <div style="${captionStyle}">${captionText}</div>
  </div>
  <div style="position:absolute;top:170px;left:80px;right:80px;bottom:70px;background:${bg};border:1px solid ${hairline};border-radius:52px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.18);">
    <div style="height:5px;background:${hairline};position:relative;"><i style="position:absolute;${rtl ? "right" : "left"}:0;top:0;bottom:0;width:31%;background:${APP.accent};display:block;"></i></div>
    <div dir="ltr" style="padding:56px 58px 0;font-family:${mono ? "'IBM Plex Mono',monospace" : "'Literata',Georgia,serif"};font-size:${mono ? 30 : 38}px;line-height:1.85;color:${ink};text-align:${align};">
      ${sentence.replace(word, `<span style="background:rgba(166,87,46,.22);text-decoration:underline dotted ${APP.accent} 2px;text-underline-offset:6px;">${word}</span>`)}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;margin:0 44px 44px;padding:38px 42px;background:${cardBg};border-radius:38px;box-shadow:0 20px 50px rgba(0,0,0,.16);">
      <div style="font-family:'Nunito',sans-serif;font-size:19px;font-weight:800;color:${dark ? "#B7AEA1" : APP.inkSoft};">${pos}</div>
      <div dir="ltr" style="font-family:'Literata',Georgia,serif;font-style:italic;font-size:42px;margin-top:8px;color:${cardInk};text-align:${align};">${word}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:28px;font-weight:800;color:${APP.accent};margin-top:6px;">${gloss}</div>
      <div style="display:flex;flex-direction:${cardDir};gap:14px;margin-top:22px;">
        <div style="font-family:'Nunito',sans-serif;font-size:18px;font-weight:800;border:2px solid ${cardInk};padding:12px 18px;border-radius:14px;color:${cardInk};">🔊 ${listen}</div>
        <div style="font-family:'Nunito',sans-serif;font-size:18px;font-weight:800;background:${cardInk};color:${cardBg};padding:12px 18px;border-radius:14px;">⭐ ${save}</div>
      </div>
    </div>
  </div>`;
}

// ==================== İÇERİK: 5 dil × 3 konsept ====================

const CONTENT = {
  c1: {
    tr: {
      word: "nonchalant",
      sentence: "He tried to stay nonchalant, but his hands were shaking.",
      gloss: "kayıtsız/soğukkanlı görünmek",
      pos: "SIFAT",
      listen: "Dinle",
      save: "Kaydet",
      rtl: false,
      uiFont: "Nunito",
      s1: "İngilizce öğrenemem sanıyordum valla",
      s2: "Kanka bu kelimeyi bilmiyorsan normal 👆",
      s3: "dokunuyorsun, çıkıyor",
      books: "kitap",
      words: "kelime",
      free: "Bedava. Hepsi.",
      cta: "İNDİR, DENE, TEŞEKKÜR ETME",
    },
    en: {
      word: "nonchalant",
      sentence: "He tried to stay nonchalant, but his hands were shaking.",
      gloss: "pretending not to care",
      pos: "ADJECTIVE",
      listen: "Listen",
      save: "Save",
      rtl: false,
      uiFont: "Nunito",
      s1: "not me thinking i was good at english 💀",
      s2: "the way i could NOT tell you this one 👆",
      s3: "you just tap it. that's it.",
      books: "books",
      words: "words",
      free: "Free. All of it.",
      cta: "DOWNLOAD, THANK ME LATER",
    },
    es: {
      word: "nonchalant",
      sentence: "He tried to stay nonchalant, but his hands were shaking.",
      gloss: "fingir que no te importa",
      pos: "ADJETIVO",
      listen: "Escuchar",
      save: "Guardar",
      rtl: false,
      uiFont: "Nunito",
      s1: "yo pensando que ya sabía inglés 💀",
      s2: "si no sabes esta palabra, tranqui 👆",
      s3: "tocas la palabra y ya",
      books: "libros",
      words: "palabras",
      free: "Gratis. Todo.",
      cta: "DESCÁRGALA, LUEGO ME AGRADECES",
    },
    de: {
      word: "nonchalant",
      sentence: "He tried to stay nonchalant, but his hands were shaking.",
      gloss: "gespielt gleichgültig",
      pos: "ADJEKTIV",
      listen: "Anhören",
      save: "Speichern",
      rtl: false,
      uiFont: "Nunito",
      s1: "dachte ich kann schon gut englisch 💀",
      s2: "kennst du dieses wort nicht — guter käse, kein stress 👆",
      s3: "antippen, fertig.",
      books: "Bücher",
      words: "Wörter",
      free: "Kostenlos. Alles.",
      cta: "LAD'S RUNTER, DANK MIR SPÄTER",
    },
    ar: {
      word: "nonchalant",
      sentence: "He tried to stay nonchalant, but his hands were shaking.",
      gloss: "التظاهر بعدم الاهتمام",
      pos: "صفة",
      listen: "استمع",
      save: "احفظ",
      rtl: true,
      uiFont: "Cairo",
      s1: "كنت أظن أن إنجليزيتي جيدة 💀",
      s2: "إذا لا تعرف هذه الكلمة، عادي 👆",
      s3: "تضغط على الكلمة، وتظهر الترجمة",
      books: "كتابًا",
      words: "كلمة",
      free: "مجانًا. بالكامل.",
      cta: "حمّل التطبيق وجربه",
    },
  },
  c2: {
    tr: {
      word: "solitude",
      sentence: "She found a strange solitude in the empty train car.",
      gloss: "yalnızlık, ama huzurlu olanı",
      pos: "İSİM",
      listen: "Dinle",
      save: "Kaydet",
      rtl: false,
      uiFont: "Nunito",
      s1: "Gece yarısı, tek bir cümleye takıldım.",
      s2: "BU KELİMEYİ BİLİYOR MUYDUN: SOLITUDE",
      s3: "dokunuyorum. çeviri geliyor. hikaye durmuyor.",
      stats: "119 KİTAP · A1'DEN C2'YE · ÜCRETSİZ",
      cta: "Hikayene dön.",
    },
    en: {
      word: "solitude",
      sentence: "She found a strange solitude in the empty train car.",
      gloss: "the peaceful kind of alone",
      pos: "NOUN",
      listen: "Listen",
      save: "Save",
      rtl: false,
      uiFont: "Nunito",
      s1: "midnight, one sentence, and i couldn't move past it.",
      s2: "DID YOU KNOW SOLITUDE",
      s3: "i tap it. the translation appears. the story doesn't stop.",
      stats: "119 BOOKS · A1 TO C2 · FREE",
      cta: "Go back to the story.",
    },
    es: {
      word: "solitude",
      sentence: "She found a strange solitude in the empty train car.",
      gloss: "la soledad tranquila",
      pos: "SUSTANTIVO",
      listen: "Escuchar",
      save: "Guardar",
      rtl: false,
      uiFont: "Nunito",
      s1: "medianoche, una frase, y no pude seguir leyendo.",
      s2: "¿CONOCÍAS 'SOLITUDE'?",
      s3: "toco la palabra. aparece la traducción. la historia sigue.",
      stats: "119 LIBROS · DE A1 A C2 · GRATIS",
      cta: "Vuelve a la historia.",
    },
    de: {
      word: "solitude",
      sentence: "She found a strange solitude in the empty train car.",
      gloss: "die friedliche art, allein zu sein",
      pos: "NOMEN",
      listen: "Anhören",
      save: "Speichern",
      rtl: false,
      uiFont: "Nunito",
      s1: "mitternacht, ein satz, und ich kam nicht weiter.",
      s2: "KANNTEST DU 'SOLITUDE'?",
      s3: "ich tippe drauf. die übersetzung erscheint. die geschichte hört nicht auf.",
      stats: "119 BÜCHER · A1 BIS C2 · KOSTENLOS",
      cta: "Geh zurück zur Geschichte.",
    },
    ar: {
      word: "solitude",
      sentence: "She found a strange solitude in the empty train car.",
      gloss: "الوحدة الهادئة",
      pos: "اسم",
      listen: "استمع",
      save: "احفظ",
      rtl: true,
      uiFont: "Cairo",
      s1: "منتصف الليل، جملة واحدة، ولم أستطع المتابعة.",
      s2: "هل كنت تعرف كلمة solitude؟",
      s3: "أضغط عليها. تظهر الترجمة. القصة لا تتوقف.",
      stats: "119 كتابًا · من A1 إلى C2 · مجانًا",
      cta: "عد إلى القصة.",
    },
  },
  c3: {
    tr: {
      word: "eloquent",
      sentence: "Her eloquent speech moved the entire room.",
      gloss: "etkileyici şekilde konuşan",
      pos: "SIFAT",
      listen: "Dinle",
      save: "Kaydet",
      rtl: false,
      uiFont: "Nunito",
      s1Label: "BİLİYOR MUYDUN?",
      s2: "TEK DOKUNUŞLA KELİME ÇEVİRİSİ",
      s3big: "A1 → C2",
      s3: "SEVİYENE GÖRE KİTAP SEÇ",
      s4: "KELİMEYE DOKUN. ÇEVİRİ ANINDA ÇIKAR.",
      s5label: "10 DİLDE ÇALIŞIYOR",
      cta: "İNGİLİZCE OKUMAYA BÖYLE BAŞLANIR.",
    },
    en: {
      word: "eloquent",
      sentence: "Her eloquent speech moved the entire room.",
      gloss: "fluent and persuasive in speech",
      pos: "ADJECTIVE",
      listen: "Listen",
      save: "Save",
      rtl: false,
      uiFont: "Nunito",
      s1Label: "DID YOU KNOW?",
      s2: "WORD TRANSLATIONS, ONE TAP",
      s3big: "A1 → C2",
      s3: "PICK A BOOK FOR YOUR LEVEL",
      s4: "TAP THE WORD. GET THE TRANSLATION INSTANTLY.",
      s5label: "WORKS IN 10 LANGUAGES",
      cta: "THIS IS HOW YOU START READING IN ENGLISH.",
    },
    es: {
      word: "eloquent",
      sentence: "Her eloquent speech moved the entire room.",
      gloss: "que habla de forma fluida y persuasiva",
      pos: "ADJETIVO",
      listen: "Escuchar",
      save: "Guardar",
      rtl: false,
      uiFont: "Nunito",
      s1Label: "¿SABÍAS QUE?",
      s2: "TRADUCCIÓN DE PALABRAS, UN TOQUE",
      s3big: "A1 → C2",
      s3: "ELIGE UN LIBRO PARA TU NIVEL",
      s4: "TOCAS LA PALABRA. TRADUCCIÓN INSTANTÁNEA.",
      s5label: "FUNCIONA EN 10 IDIOMAS",
      cta: "ASÍ SE EMPIEZA A LEER EN INGLÉS.",
    },
    de: {
      word: "eloquent",
      sentence: "Her eloquent speech moved the entire room.",
      gloss: "redegewandt und überzeugend",
      pos: "ADJEKTIV",
      listen: "Anhören",
      save: "Speichern",
      rtl: false,
      uiFont: "Nunito",
      s1Label: "WUSSTEST DU?",
      s2: "WORTÜBERSETZUNGEN, EIN ANTIPPEN",
      s3big: "A1 → C2",
      s3: "WÄHLE EIN BUCH FÜR DEIN NIVEAU",
      s4: "WORT ANTIPPEN. SOFORTIGE ÜBERSETZUNG.",
      s5label: "FUNKTIONIERT IN 10 SPRACHEN",
      cta: "SO FÄNGT MAN AN, ENGLISCH ZU LESEN.",
    },
    ar: {
      word: "eloquent",
      sentence: "Her eloquent speech moved the entire room.",
      gloss: "بليغ ومؤثر في الكلام",
      pos: "صفة",
      listen: "استمع",
      save: "احفظ",
      rtl: true,
      uiFont: "Cairo",
      s1Label: "هل تعلم؟",
      s2: "ترجمة الكلمات بضغطة واحدة",
      s3big: "A1 → C2",
      s3: "اختر كتابًا يناسب مستواك",
      s4: "اضغط على الكلمة. تظهر الترجمة فورًا.",
      s5label: "يعمل بـ 10 لغات",
      cta: "هكذا تبدأ بقراءة الإنجليزية.",
    },
  },
};

const CONCEPTS = {
  c1: {
    name: "meme-enerjisi",
    fonts: ["Bebas Neue", "Space Grotesk", "Literata", "Nunito"],
    build: c1Slides,
  },
  c2: {
    name: "gece-okumasi",
    fonts: ["Cormorant Garamond", "Jost", "Literata", "Nunito"],
    build: c2Slides,
  },
  c3: {
    name: "ciplak-gerçek",
    fonts: ["Archivo Black", "IBM Plex Mono", "Literata", "Nunito"],
    build: c3Slides,
  },
};

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  let total = 0;
  for (const [conceptKey, concept] of Object.entries(CONCEPTS)) {
    for (const [langCode, cfg] of Object.entries(CONTENT[conceptKey])) {
      const outDir = path.join(OUT_ROOT, langCode, concept.name);
      fs.mkdirSync(outDir, { recursive: true });
      const fonts = concept.fonts.includes(cfg.uiFont)
        ? concept.fonts
        : [...concept.fonts, cfg.uiFont];

      const slides = concept.build({ ...cfg, lang: langCode });
      for (const slide of slides) {
        const html = shell({ body: slide.html, bg: slide.bg, fonts, lang: langCode, rtl: cfg.rtl });
        const tmpFile = path.join(TMP_DIR, `${conceptKey}-${langCode}-${slide.id}.html`);
        fs.writeFileSync(tmpFile, html, "utf8");
        await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(120);
        const outFile = path.join(outDir, `${slide.id}.png`);
        await page.screenshot({ path: outFile });
        total += 1;
      }
      console.log(`[${conceptKey}/${langCode}] ${slides.length} kare -> ${outDir}`);
    }
  }

  await browser.close();
  console.log(`Bitti: ${total} görsel.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
