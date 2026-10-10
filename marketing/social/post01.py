"""TikTok carousel #1: Lumi tanışma postu. 1080x1920 JPEG."""
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
M = ROOT.parent
A = M.parent / "assets"
OUT = ROOT / "out" / "post01"
OUT.mkdir(parents=True, exist_ok=True)


def u(p):
    return pathlib.Path(p).resolve().as_uri()


BG = u(A / "splash" / "lingo-bg.jpg")
LUMI = {k: u(M / "build" / f"lumi-{k}.png") for k in ["home", "party", "words", "books", "quiz", "crown", "search", "profile"]}

CSS = f"""*{{margin:0;box-sizing:border-box}}
body{{width:1080px;height:1920px;overflow:hidden;font-family:Gabarito,sans-serif;position:relative;
background:url('{BG}') center/cover;color:#14244F}}
.bubble{{position:absolute;background:#fff;border-radius:56px;padding:44px 56px;box-shadow:0 18px 0 rgba(20,36,79,.12);
font-size:64px;font-weight:700;line-height:1.15}}
.big{{font-size:92px;font-weight:800;letter-spacing:-2px}}
.hl{{background:#FFC94A;border-radius:18px;padding:0 16px}}
.lumi{{position:absolute;filter:drop-shadow(0 30px 40px rgba(20,36,79,.3))}}
.tag{{position:absolute;left:50%;transform:translateX(-50%);bottom:120px;background:#14244F;color:#fff;border-radius:999px;
padding:22px 48px;font-size:40px;font-weight:700;white-space:nowrap}}
.card{{background:#fff;border-radius:40px;padding:36px 44px;box-shadow:0 12px 0 rgba(20,36,79,.1);margin-bottom:28px;
display:flex;align-items:center;gap:32px}}
.en{{font-size:66px;font-weight:800}} .tr{{font-size:50px;color:#b5760a;font-weight:700}}
"""

SLIDES = [
    f"""<div class="bubble big" style="left:80px;right:80px;top:260px;text-align:center">Merhaba,<br>ben <span class="hl">Lumi!</span> 🦜</div>
<img class="lumi" src="{LUMI['party']}" style="width:700px;left:190px;top:820px">
<div class="tag">Kaydır →</div>""",
    f"""<div class="bubble" style="left:80px;right:80px;top:220px">İngilizceyi <span class="hl">ezberleyerek</span> değil,<br><b>hikâye okuyarak</b> öğreniyoruz 📖</div>
<img class="lumi" src="{LUMI['books']}" style="width:520px;left:280px;top:820px">""",
    f"""<div class="bubble" style="left:80px;right:80px;top:180px">Bilmediğin kelimeye <span class="hl">dokun</span>,<br>Türkçesi anında gelsin ✨</div>
<img src="{u(M / 'screenshots' / 'raw' / 'reader_tap.png')}" style="position:absolute;left:250px;top:620px;width:580px;border-radius:60px;border:16px solid #0E0F14;box-shadow:0 40px 80px rgba(20,36,79,.35)">
<img class="lumi" src="{LUMI['words']}" style="width:330px;left:20px;top:1420px">""",
    f"""<div class="bubble" style="left:80px;right:80px;top:180px;text-align:center">Bugünün kelimeleri 👇</div>
<div style="position:absolute;left:80px;right:80px;top:470px">
<div class="card"><span class="en">flour</span><span class="tr">un</span></div>
<div class="card"><span class="en">whisper</span><span class="tr">fısıldamak</span></div>
<div class="card"><span class="en">brave</span><span class="tr">cesur</span></div>
<div class="card"><span class="en">journey</span><span class="tr">yolculuk</span></div>
</div>
<img class="lumi" src="{LUMI['quiz']}" style="width:380px;right:60px;top:1370px">""",
    f"""<div class="bubble big" style="left:80px;right:80px;top:240px;text-align:center">Her gün yeni<br><span class="hl">kelimeler</span> için<br>takip et! 🦜</div>
<img src="{u(A / 'brand' / 'lingo-wordmark.png')}" style="position:absolute;left:290px;top:1000px;width:500px">
<img class="lumi" src="{LUMI['crown']}" style="width:380px;left:350px;top:1260px">
<div class="tag">App Store'da: Lingo</div>""",
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1080, "height": 1920})
    for i, body in enumerate(SLIDES, 1):
        f = OUT / f"s{i}.html"
        f.write_text(f'<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@600;700;800&family=Noto+Color+Emoji&display=swap" rel="stylesheet"><style>{CSS}</style></head><body>{body}</body></html>', encoding="utf-8")
        pg.goto(u(f))
        pg.wait_for_timeout(1800)
        png = OUT / f"s{i}.png"
        pg.screenshot(path=str(png))
        Image.open(png).convert("RGB").save(OUT / f"s{i}.jpg", quality=92)
    b.close()
print("ok")
