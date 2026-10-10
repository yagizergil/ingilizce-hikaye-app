"""App Store In-App Event görselleri: kart 1920x1080 (16:9) + detay 1080x1920 (9:16).
Apple kartın altına etkinlik adını kendisi yazar; görselde az metin, odak ortada."""
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
M = ROOT.parent
A = M.parent / "assets"
OUT = ROOT / "out" / "events"
OUT.mkdir(parents=True, exist_ok=True)


def u(p):
    return pathlib.Path(p).resolve().as_uri()


BG = u(A / "splash" / "lingo-bg.jpg")
L = lambda k: u(M / "build" / f"lumi-{k}.png")  # noqa: E731
RAW = M / "screenshots" / "raw"

EVENTS = {
    "challenge": dict(word="7 gün", sub="Okuma Meydan Okuması", lumi="crown", shot="index.png"),
    "update": dict(word="Yeni", sub="Kitap quizleri ve Lumi", lumi="quiz", shot="bquiz.png"),
}

CSS = f"""*{{margin:0;box-sizing:border-box}}body{{overflow:hidden;font-family:Gabarito,sans-serif;color:#14244F;
background:url('{BG}') center/cover;position:relative}}
.chip{{display:table;margin-left:auto;margin-right:auto;background:#fff;border-radius:40px;padding:14px 36px;font-weight:800;box-shadow:0 12px 0 rgba(20,36,79,.12)}}
.hl{{background:#FFC94A;border-radius:22px;padding:0 18px}}
.phone{{position:absolute;background:#0E0F14;border-radius:70px;padding:16px;box-shadow:0 40px 80px rgba(20,36,79,.35)}}
.phone img{{display:block;width:100%;border-radius:56px}}
.lumi{{position:absolute;filter:drop-shadow(0 30px 40px rgba(20,36,79,.3))}}"""


def card(e):  # 1920x1080
    return f"""<div style="position:absolute;left:120px;top:300px;width:1000px">
<div class="chip" style="font-size:110px;line-height:1.1"><span class="hl">{e['word']}</span></div>
<div class="chip" style="font-size:64px;margin-top:30px">{e['sub']}</div></div>
<div class="phone" style="left:1180px;top:120px;width:420px"><img src="{u(RAW / e['shot'])}"></div>
<img class="lumi" src="{L(e['lumi'])}" style="width:340px;left:1500px;top:560px">"""


def detail(e):  # 1080x1920 — üst ve alt bölge boş (Apple metni ve düğmeyi bindirir)
    return f"""<div style="position:absolute;left:0;right:0;top:330px;text-align:center">
<div class="chip" style="font-size:120px;line-height:1.1"><span class="hl">{e['word']}</span></div>
<div class="chip" style="font-size:60px;margin-top:28px">{e['sub']}</div></div>
<div class="phone" style="left:300px;top:760px;width:480px"><img src="{u(RAW / e['shot'])}"></div>
<img class="lumi" src="{L(e['lumi'])}" style="width:330px;left:690px;top:1080px">"""


with sync_playwright() as p:
    b = p.chromium.launch()
    for name, e in EVENTS.items():
        for kind, (w, h), fn in [("card", (1920, 1080), card), ("detail", (1080, 1920), detail)]:
            pg = b.new_page(viewport={"width": w, "height": h})
            f = OUT / f"{name}-{kind}.html"
            f.write_text('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?'
                         f'family=Gabarito:wght@700;800&display=swap" rel="stylesheet"><style>{CSS}</style></head>'
                         f'<body style="width:{w}px;height:{h}px">{fn(e)}</body></html>', encoding="utf-8")
            pg.goto(u(f))
            pg.wait_for_timeout(1500)
            png = OUT / f"lingo-event-{name}-{kind}.png"
            pg.screenshot(path=str(png))
            Image.open(png).convert("RGB").save(OUT / f"lingo-event-{name}-{kind}.jpg", quality=92)
            png.unlink()
            pg.close()
    b.close()
print(OUT)
