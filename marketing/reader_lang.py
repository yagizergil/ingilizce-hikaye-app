"""Okuyucu kopyalarını (reader.html / reader_listen.html) SHOT_LANG diline çevirip yakalar.
iPhone 390x844 @3x ve iPad 1032x1376 @2x -> raw/<dil>/."""
import pathlib

from playwright.sync_api import sync_playwright

from i18n_shots import BUILD, LANG, RAW, READER

ROOT = pathlib.Path(__file__).resolve().parent
TR = READER["tr"]
R = READER[LANG]
RAW.mkdir(parents=True, exist_ok=True)
BUILD.mkdir(parents=True, exist_ok=True)
FONTS = "&family=Noto+Sans+SC:wght@400;700;800&family=Noto+Sans+JP:wght@400;700;800&family=Noto+Sans+Arabic:wght@400;700;800&family=Noto+Sans:wght@400;600;700;800"
FAM = "Gabarito,'Noto Sans','Noto Sans " + {"zh": "SC'", "ja": "JP'", "ar": "Arabic'"}.get(LANG, "SC'") + ",sans-serif"


def localize(s):
    s = s.replace(f">{TR[0]}<", f">{R[0]}<")
    s = s.replace(">Oku<", f">{R[1]}<").replace(">Dinle<", f">{R[2]}<")
    s = s.replace("· isim<", f"· {R[3]}<").replace(f">{TR[4]}<", f">{R[4]}<")
    s = s.replace('<div class="tr">un</div>', f'<div class="tr"{" dir=rtl" if LANG == "ar" else ""}>{R[5]}</div>')
    s = s.replace(f">{TR[6]}<", f">{R[6]}<").replace(f">{TR[7]}<", f">{R[7]}<").replace(f">{TR[8]} 1.0x<", f">{R[8]} 1.0x<")
    s = s.replace("&display=swap", FONTS + "&display=swap").replace("font-family:Gabarito,sans-serif", "font-family:" + FAM)
    if LANG == "en":  # tanım, tek kelimelik karşılıktan uzun
        s = s.replace(".tr{font-size:24px", ".tr{font-size:21px")
    return s


IPAD = "body{width:100vw;height:100vh;"


with sync_playwright() as p:
    b = p.chromium.launch()
    for src, name in [("reader.html", "reader_tap"), ("reader_listen.html", "reader_listen")]:
        html = localize((ROOT / src).read_text(encoding="utf-8"))
        assert html.count(R[1]) and html.count(R[2])
        f = BUILD / f"{name}.html"
        f.write_text(html, encoding="utf-8")
        ipad = html.replace("body{width:390px;height:844px;", IPAD).replace(
            ".text{font-family:Literata,serif;font-size:19px;", ".text{font-family:Literata,serif;font-size:30px;max-width:820px;margin:0 auto;")
        fi = BUILD / f"ipad_{name}.html"
        fi.write_text(ipad, encoding="utf-8")
        for path, out, vp, dsf in [(f, name, (390, 844), 3), (fi, "ipad_" + name, (1032, 1376), 2)]:
            pg = b.new_page(viewport={"width": vp[0], "height": vp[1]}, device_scale_factor=dsf)
            pg.goto(path.resolve().as_uri())
            pg.wait_for_timeout(2500)
            pg.screenshot(path=str(RAW / f"{out}.png"))
            pg.close()
    b.close()
print("ok", LANG)
