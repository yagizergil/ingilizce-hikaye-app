import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context("marketing/.profile", viewport={"width": 390, "height": 844}, device_scale_factor=3, locale="tr-TR")
    pg = ctx.new_page(); pg.goto("http://localhost:8082/"); pg.wait_for_timeout(10000)
    print(pg.url)
    for k in pg.evaluate("Object.keys(localStorage)"):
        v = pg.evaluate(f"localStorage.getItem({json.dumps(k)})") or ""
        print(k, len(v), v[:80])
    ctx.close()
