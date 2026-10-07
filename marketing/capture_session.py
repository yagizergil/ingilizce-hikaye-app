"""Demo hesap oturumu: temiz bir tarayıcı profiliyle uygulamayı açar ve
anonim kullanıcının kimliğini yazdırır. Profil `marketing/.profile`ta kalır
(sonraki yakalamalar aynı hesabı kullanır)."""
import json, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context("marketing/.profile", viewport={"width": 390, "height": 844}, device_scale_factor=3, locale="tr-TR")
    pg = ctx.new_page(); pg.goto("http://localhost:8082/"); pg.wait_for_timeout(12000)
    keys = pg.evaluate("Object.keys(localStorage)")
    for k in keys:
        if "auth" in k:
            v = json.loads(pg.evaluate(f"localStorage.getItem({json.dumps(k)})"))
            print("USER", (v.get("user") or {}).get("id"))
    print(pg.inner_text("body")[:120].replace("\n"," | "))
    ctx.close()
