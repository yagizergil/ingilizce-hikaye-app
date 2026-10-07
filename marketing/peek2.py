import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context("marketing/.profile", viewport={"width": 390, "height": 844}, device_scale_factor=3, locale="tr-TR")
    pg = ctx.new_page(); pg.goto("http://localhost:8082/"); pg.wait_for_timeout(8000)
    q = json.loads(pg.evaluate("localStorage.getItem('analytics.queue.v1')") or "[]")
    seen=set()
    for e in q:
        s = json.dumps(e.get("params") or e.get("properties") or e)[:220]
        if s not in seen: seen.add(s); print(e.get("name"), s)
    ctx.close()
