import sys
from playwright.sync_api import sync_playwright
jobs=[l.split(":",1) for l in sys.argv[1:]]
with sync_playwright() as p:
    ctx=p.chromium.launch_persistent_context("marketing/.profile",viewport={"width":1032,"height":1376},device_scale_factor=2,locale="tr-TR")
    for n,path in jobs:
        pg=ctx.new_page(); pg.goto("http://localhost:8082"+path); pg.wait_for_timeout(18000)
        pg.screenshot(path=f"marketing/screenshots/raw/ipad_{n}.png"); print(n,pg.url); pg.close()
    ctx.close()
