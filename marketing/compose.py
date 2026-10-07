"""App Store ekran görüntüleri (TR): iPhone 6.9" 1320x2868, iPad 13" 2064x2752."""
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
A = ROOT.parent / "assets"
RAW = ROOT / "screenshots" / "raw"
OUT = ROOT / "screenshots" / "tr"
OUT.mkdir(parents=True, exist_ok=True)


def u(p):
    return pathlib.Path(p).resolve().as_uri()


# (dosya, üst satır, vurgulu satır, ekran, maskot, maskot tarafı, zemin)
SLIDES = [
    ("01", "Hikâye okuyarak", "İngilizce öğren", "index.png", "home", "hero", "sky"),
    ("02", "Kelimeye dokun,", "Türkçesi anında", "reader_tap.png", "words", "left", "sun"),
    ("03", "Stüdyo sesiyle", "dinleyerek öğren", "reader_listen.png", "books", "right", "sky"),
    ("04", "Seviyene uygun", "500+ kitap", "library.png", "search", "left", "mint"),
    ("05", "Her kitapta", "3 basamaklı quiz", "bquiz.png", "quiz", "right", "sun"),
    ("06", "Her gün biraz oku,", "serini koru", "index.png", "party", "left", "sky"),
    ("07", "Seviye atla,", "XP topla", "stats.png", "crown", "right", "mint"),
    ("08", "10 dil,", "tek uygulama", None, "profile", "langs", "sky"),
]

BG = {
    "sky": "linear-gradient(180deg,#5EC2F2 0%,#9CDCF8 55%,#E9F7FE 100%)",
    "sun": "linear-gradient(180deg,#FFC94A 0%,#FFDF8C 55%,#FFF5DC 100%)",
    "mint": "linear-gradient(180deg,#6FD3A8 0%,#B3EBCF 55%,#EFFBF5 100%)",
}

CSS = """
*{box-sizing:border-box;margin:0}
body{width:%(W)dpx;height:%(H)dpx;overflow:hidden;font-family:Gabarito,sans-serif;position:relative}
.bg{position:absolute;inset:0}
.scene{position:absolute;inset:0;background:url('%(scene)s') center bottom/cover}
.head{position:absolute;left:0;right:0;top:%(ht)dpx;text-align:center;z-index:5}
.l1{font-weight:700;font-size:%(f1)dpx;color:#14244F;line-height:1.05;letter-spacing:-1px}
.l2{display:inline-block;margin-top:%(g)dpx;font-weight:800;font-size:%(f2)dpx;color:#14244F;line-height:1.05;
    background:#fff;padding:%(p1)dpx %(p2)dpx;border-radius:%(r)dpx;box-shadow:0 14px 0 rgba(20,36,79,.12);letter-spacing:-1.5px}
.phone{position:absolute;left:50%%;transform:translateX(-50%%);top:%(pt)dpx;width:%(pw)dpx;height:%(ph)dpx;
    background:#0E0F14;border-radius:%(pr)dpx;padding:%(bz)dpx;box-shadow:0 60px 120px rgba(20,36,79,.35),inset 0 0 0 6px #2a2c34;z-index:3}
.phone img.s{width:100%%;height:100%%;object-fit:cover;object-position:top;border-radius:%(sr)dpx;display:block}
.island{position:absolute;top:%(it)dpx;left:50%%;transform:translateX(-50%%);width:%(iw)dpx;height:%(ih)dpx;background:#000;border-radius:999px}
.lumi{position:absolute;z-index:6;filter:drop-shadow(0 24px 30px rgba(20,36,79,.28))}
.logo{position:absolute;left:50%%;transform:translateX(-50%%);z-index:6}
.bub{position:absolute;background:#fff;color:#2D8FD0;font-weight:700;border-radius:999px;box-shadow:0 10px 24px rgba(20,36,79,.15);z-index:4}
"""

LANGS = ["Hello", "Merhaba", "Hola", "Bonjour", "Hallo", "Ciao", "Привет", "你好", "こんにちは", "مرحبا"]


def html(slide, W, H, ipad):
    sid, l1, l2, screen, lumi, side, bg = slide
    k = W / 1320
    if ipad:
        k = 1.55
    ph = (H - int(470 * k) + int(140 * k)) if not ipad else int(H * 0.74)
    pw = int(ph * 1170 / 2532 + 2 * 22 * k) if not ipad else int(ph * 0.75)
    vals = dict(W=W, H=H, scene=u(A / "splash" / "lingo-bg.jpg"), ht=int(150 * k), f1=int(96 * k), f2=int(118 * k),
                g=int(18 * k), p1=int(10 * k), p2=int(36 * k), r=int(34 * k), pt=H - ph + int(140 * k) if side != "hero" else (int(800 * k) if not ipad else H - ph + int(330 * k)),
                pw=pw, ph=ph, pr=int(110 * k), bz=int(22 * k), sr=int(90 * k), it=int(46 * k), iw=int(190 * k), ih=int(54 * k))
    body = []
    if side in ("hero", "langs"):
        body.append('<div class="scene"></div>')
    else:
        body.append(f'<div class="bg" style="background:{BG[bg]}"></div>')
    head = f'<div class="head"><div class="l1">{l1}</div><div class="l2">{l2}</div></div>'
    lsrc = u(ROOT / "build" / f"lumi-{lumi}.png")
    if side == "hero":
        lw = int(300 * k)
        body.append(f'<img class="logo" src="{u(A / "brand" / "lingo-wordmark.png")}" style="top:{int(110*k)}px;width:{int(620*k)}px">')
        head = head.replace(f'top:{vals["ht"]}', "")
        body.append(f'<div class="head" style="top:{int(380*k)}px"><div class="l1">{l1}</div><div class="l2">{l2}</div></div>')
        body.append(f'<img class="lumi" src="{lsrc}" style="width:{lw}px;right:{int(40*k) if not ipad else 30}px;top:{vals["pt"]-int((200 if not ipad else -150)*k)}px">')
        head = ""
    elif side == "langs":
        vals["ht"] = int(150 * k)
        body.append(f'<img class="lumi" src="{lsrc}" style="width:{int(560*k*(0.75 if ipad else 1))}px;left:50%;transform:translateX(-50%);top:{int(H*0.40)}px">')
        import random
        random.seed(4)
        spots = [(0.08, 0.30), (0.62, 0.29), (0.30, 0.36), (0.70, 0.40), (0.05, 0.44), (0.66, 0.53), (0.04, 0.58), (0.68, 0.66), (0.08, 0.72), (0.38, 0.33)]
        for (x, y), w in zip(spots, LANGS):
            body.append(f'<div class="bub" style="left:{int(x*W)}px;top:{int(y*H)}px;font-size:{int(58*k)}px;padding:{int(18*k)}px {int(40*k)}px">{w}</div>')
        body.append(f'<div class="bub" style="left:50%;transform:translateX(-50%);bottom:{int(170*k)}px;font-size:{int(52*k)}px;padding:{int(26*k)}px {int(54*k)}px;color:#14244F">Türkçe arayüz · İngilizce hikâyeler</div>')
    else:
        lw = int((330 if not ipad else 210) * k)
        pl = (W - pw) // 2
        off = pl - int(lw * 0.5) if not ipad else pl + int(40 * k)
        pos = f"left:{off}px" if side == "left" else f"right:{off}px"
        body.append(f'<img class="lumi" src="{lsrc}" style="width:{lw}px;{pos};top:{vals["pt"]-int(150*k) if not ipad else vals["pt"]-int(lw*0.95)}px">')
    if screen:
        if not ipad:
            body.append(f'<div class="phone"><img class="s" src="{u(RAW / screen)}"><div class="island"></div></div>')
        else:
            bz = int(26 * k)
            body.append(f'<div class="phone" style="border-radius:{int(70*k)}px;padding:{bz}px">'
                        f'<img src="{u(RAW / ("ipad_" + screen))}" style="width:100%;height:100%;object-fit:cover;object-position:top;'
                        f'border-radius:{int(46*k)}px;display:block"></div>')
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@600;700;800&display=swap" rel="stylesheet">
<style>{CSS % vals}</style></head><body>{''.join(body)}{head}</body></html>"""


with sync_playwright() as p:
    b = p.chromium.launch()
    for name, W, H, ipad in [("iphone69", 1320, 2868, False), ("iphone63", 1206, 2622, False), ("ipad", 2064, 2752, True)]:
        pg = b.new_page(viewport={"width": W, "height": H})
        for s in SLIDES:
            f = ROOT / "build" / f"{name}-{s[0]}.html"
            f.write_text(html(s, W, H, ipad), encoding="utf-8")
            pg.goto(u(f))
            pg.wait_for_timeout(1500)
            pg.screenshot(path=str(OUT / f"{name}-{s[0]}.png"))
        pg.close()
    b.close()
print("ok")
