"""App Store creative assets (TR): ürün sayfası başlığı + arama sonucu görseli.
Desteklenen ölçüler: 5244x2950 ve 3840x1646. Odak noktası ortada (kırpma güvenli alanı)."""
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
A = ROOT.parent / "assets"
from i18n_shots import RAW, OUT, BUILD, LANG, CAPTIONS, FAMILY, DIR, font_link
OUT.mkdir(parents=True, exist_ok=True)
BUILD.mkdir(parents=True, exist_ok=True)
C = CAPTIONS[LANG]


def u(p):
    return pathlib.Path(p).resolve().as_uri()


FONT = font_link()


def phone(src, h, rot=0, extra=""):
    w = int(h * 1170 / 2532) + int(h * 0.036)
    bz = int(h * 0.018)
    return (f'<div style="position:relative;width:{w}px;height:{h}px;background:#0E0F14;border-radius:{int(h*.085)}px;'
            f'padding:{bz}px;box-shadow:0 {int(h*.04)}px {int(h*.08)}px rgba(20,36,79,.35),inset 0 0 0 {max(3,int(h*.004))}px #2a2c34;'
            f'transform:rotate({rot}deg);flex:none;{extra}">'
            f'<img src="{u(RAW / src)}" style="width:100%;height:100%;object-fit:cover;object-position:top;border-radius:{int(h*.07)}px;display:block">'
            f'<div style="position:absolute;top:{int(h*.035)}px;left:50%;transform:translateX(-50%);width:{int(h*.15)}px;height:{int(h*.042)}px;background:#000;border-radius:999px"></div></div>')


def header(W, H):
    s = H / 1646
    return f"""<!doctype html><html><head><meta charset="utf-8">{FONT}<style>
*{{margin:0;box-sizing:border-box}}body{{width:{W}px;height:{H}px;overflow:hidden;font-family:{FAMILY};position:relative;
background:url('{u(A / "splash" / "lingo-bg.jpg")}') center 62%/cover}}
.c{{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:{int(90*s)}px}}
.t{{text-align:left;white-space:nowrap}}
.l1{{font-weight:700;font-size:{int(118*s)}px;color:#14244F;line-height:1.05;letter-spacing:-2px}}
.l2{{display:inline-block;margin-top:{int(22*s)}px;font-weight:800;font-size:{int(150*s)}px;color:#14244F;background:#fff;
padding:{int(10*s)}px {int(44*s)}px;border-radius:{int(40*s)}px;box-shadow:0 {int(16*s)}px 0 rgba(20,36,79,.12);letter-spacing:-3px}}
</style></head><body><div class="c">
<img src="{u(ROOT / "build" / "lumi-words.png")}" style="width:{int(520*s)}px;filter:drop-shadow(0 30px 40px rgba(20,36,79,.3))">
<div class="t"{DIR}><img src="{u(A / "brand" / "lingo-wordmark.png")}" style="width:{int(560*s)}px;display:block;margin-bottom:{int(40*s)}px">
<div class="l1">{C[0][0]}</div><div class="l2">{C[0][1]}</div></div>
{phone("reader_tap.png", int(1300*s), 4)}
</div></body></html>"""


def search(W, H):
    s = H / 1646
    ph = int(H * 0.78)
    def chip(a, b, col):
        return (f'<div{DIR} style="text-align:center;margin-bottom:{int(26*s)}px;white-space:nowrap">'
                f'<div style="font-weight:700;font-size:{int(70*s)}px;color:#14244F;line-height:1.05">{a}</div>'
                f'<div style="display:inline-block;font-weight:800;font-size:{int(92*s)}px;color:#14244F;background:{col};'
                f'border-radius:{int(26*s)}px;padding:{int(2*s)}px {int(30*s)}px;margin-top:{int(8*s)}px;letter-spacing:-2px;'
                f'box-shadow:0 {int(10*s)}px 0 rgba(20,36,79,.14)">{b}</div></div>')
    def col(a, b, c, src, rot, dy):
        return (f'<div style="display:flex;flex-direction:column;align-items:center;transform:translateY({int(dy*s)}px)">'
                f'{chip(a, b, c)}{phone(src, ph, rot)}</div>')
    lumi = u(ROOT / "build" / "lumi-party.png")
    return f"""<!doctype html><html><head><meta charset="utf-8">{FONT}<style>*{{margin:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden;font-family:{FAMILY};position:relative;
background:url('{u(A / "splash" / "lingo-bg.jpg")}') center 70%/cover}}
.row{{position:absolute;left:50%;top:{int(70*s)}px;transform:translateX(-50%);display:flex;align-items:flex-start;gap:{int(300*s)}px}}
</style></head><body>
<div class="row">
{col(*C[1], "#FFC94A", "reader_tap.png", -5, 40)}
{col(*C[8], "#FFFFFF", "reader_listen.png", 0, 0)}
{col(*C[3], "#8BE0B8", "library.png", 5, 40)}
</div>
<img src="{lumi}" style="position:absolute;left:50%;bottom:{int(-10*s)}px;transform:translateX(-50%) translateX(-{int(560*s)}px);width:{int(380*s)}px;z-index:9;filter:drop-shadow(0 30px 40px rgba(20,36,79,.35))">
<img src="{u(ROOT / "build" / "lumi-books.png")}" style="position:absolute;left:50%;bottom:{int(-10*s)}px;transform:translateX(-50%) translateX({int(560*s)}px);width:{int(270*s)}px;z-index:9;filter:drop-shadow(0 30px 40px rgba(20,36,79,.35))">
</body></html>"""


with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in [(3840, 1646), (5244, 2950)]:
        pg = b.new_page(viewport={"width": W, "height": H})
        for name, fn in [("header", header), ("search", search)]:
            f = BUILD / f"{name}-{W}.html"
            f.write_text(fn(W, H), encoding="utf-8")
            pg.goto(u(f))
            pg.wait_for_timeout(2000)
            pg.screenshot(path=str(OUT / f"{name}-{W}x{H}.png"))
        pg.close()
    b.close()
from PIL import Image
for f in OUT.glob("*.png"):
    im = Image.open(f)
    if im.mode != "RGB":
        im.convert("RGB").save(f)
print("ok")
