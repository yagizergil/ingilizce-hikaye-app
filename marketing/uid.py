from playwright.sync_api import sync_playwright
import json,base64
with sync_playwright() as p:
    ctx=p.chromium.launch_persistent_context("marketing/.profile",viewport={"width":390,"height":844})
    pg=ctx.new_page(); pg.goto("http://localhost:8082/quiz"); pg.wait_for_timeout(6000)
    d=pg.evaluate("()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k).slice(0,3000)]))")
    for k,v in d.items():
        if 'sub' in v or 'auth' in k.lower(): 
            import re; m=re.search(r'"sub":"([0-9a-f-]{36})"',v) or re.search(r'"id":"([0-9a-f-]{36})"',v); print(k, m and m.group(1))
    ctx.close()
