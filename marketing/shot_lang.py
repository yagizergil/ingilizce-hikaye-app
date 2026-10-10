"""Uygulama ekranlarını verilen arayüz dilinde yakalar: python marketing/shot_lang.py <dil>
iPhone (390x844 @3x) -> raw/<dil>/<ad>.png, iPad (1032x1376 @2x) -> raw/<dil>/ipad_<ad>.png"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

L = sys.argv[1]
ONLY = sys.argv[2:]  # isteğe bağlı: yalnızca bu ekranlar
ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "screenshots" / "raw" / L
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:8082"
SCREENS = {"index": "/", "library": "/library", "bquiz": "/book-quiz/0875b4f2-1db7-45ef-b6d7-0eb7d6f86666", "stats": "/statistics"}
LOCALE = {"en": "en-US", "de": "de-DE", "fr": "fr-FR", "it": "it-IT", "es": "es-ES", "ru": "ru-RU", "ar": "ar-SA", "zh": "zh-CN", "ja": "ja-JP", "tr": "tr-TR"}[L]

with sync_playwright() as p:
    for kind, vp, dsf in [("iphone", {"width": 390, "height": 844}, 3), ("ipad", {"width": 1032, "height": 1376}, 2)]:
        ctx = p.chromium.launch_persistent_context(str(ROOT / ".profile"), viewport=vp, device_scale_factor=dsf, locale=LOCALE)
        pg = ctx.new_page()
        pg.goto(BASE + "/")
        pg.evaluate(f"localStorage.setItem('i18n.uiLanguage', '{L}')")
        pg.reload()
        pg.wait_for_timeout(15000)
        pg.close()
        for n, path in SCREENS.items():
            if ONLY and n not in ONLY:
                continue
            pg = ctx.new_page()
            pg.goto(BASE + path)
            pg.wait_for_timeout(18000)
            name = n if kind == "iphone" else "ipad_" + n
            pg.screenshot(path=str(OUT / f"{name}.png"))
            print(kind, n, pg.url, pg.evaluate("document.body.innerText.slice(0,120).replace(/\\n/g,' | ')"))
            pg.close()
        ctx.close()
