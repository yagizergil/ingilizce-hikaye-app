import sys
from playwright.sync_api import sync_playwright
path, out = sys.argv[1], sys.argv[2]
wait = int(sys.argv[3]) if len(sys.argv) > 3 else 9000
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context("marketing/.profile", viewport={"width": 390, "height": 844}, device_scale_factor=3, locale="tr-TR")
    pg = ctx.new_page(); pg.goto("http://localhost:8082" + path); pg.wait_for_timeout(wait)
    print(pg.url); pg.screenshot(path=out); ctx.close()
