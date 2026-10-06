"""Lingo logosu: maskot papağan + "Lingo" yazılı kitap (1406x1406, rx 280).

Kompozisyon referans uygulama ikonunun düzenini izler (karakter alttaki
büyük bir kitabın üstünden çıkıyor, marka adı kitabın kapağında), çizim
bizim: maskot `assets/anim/mascot-home.webp` sprite'ının ilk karesi (göz açık,
kanatlar "merhaba" der gibi açık), yazı Gabarito ExtraBold (uygulamanın
yazı tipi). Arka plan gökyüzü mavisi: kırmızı papağanın tamamlayıcısı,
ana ekranda uzaktan seçilir.

Çıktılar (assets/brand/):
  lingo-logo.svg       vektör (yazı yola çevrili; papağan gömülü PNG)
  lingo-logo-1024.png  App Store / uygulama ikonu boyutu
  lingo-logo-1406.png  tam boyut

KULLANIM
    pipeline/.venv/Scripts/python.exe scripts/build-logo.py
"""

from __future__ import annotations

import base64
import io
import math
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "brand"
FONT = ROOT / "node_modules/@expo-google-fonts/gabarito/800ExtraBold/Gabarito_800ExtraBold.ttf"
SPRITE = ROOT / "assets/anim/mascot-home.webp"

W = 1406
RADIUS = 280
SKY_TOP, SKY_BOTTOM = (102, 214, 255), (20, 150, 214)
GLOW = (255, 255, 255)
COVER_TOP, COVER_BOTTOM = (255, 196, 64), (245, 150, 30)
COVER_EDGE = (214, 116, 14)
PAGES = (255, 249, 236)
PAGE_LINE = (233, 220, 196)
TEXT = (255, 255, 255)
TEXT_SHADOW = (196, 96, 6)

PARROT_WIDTH = 1110
PARROT_TOP = 150
BOOK_EDGE_Y = 940        # sayfa şeridinin kenarlardaki üst noktası
BOOK_DIP = 70            # ortadaki çukurluk (açık kitap sırtı)
PAGES_THICK = 52
TEXT_SIZE = 312
TEXT_BASELINE = 1262


def hex_(c):
    return "#%02X%02X%02X" % c


def book_curve(offset: float, steps: int = 64) -> list[tuple[float, float]]:
    """Kitabın üst kenarı: iki kenardan ortaya hafifçe inen yumuşak yay."""
    pts = []
    for i in range(steps + 1):
        x = -40 + (W + 80) * i / steps
        t = (x - W / 2) / (W / 2)
        y = BOOK_EDGE_Y + offset + BOOK_DIP * (1 - t * t) ** 1.4 if abs(t) <= 1 else BOOK_EDGE_Y + offset
        pts.append((x, y))
    return pts


def parrot_image() -> Image.Image:
    sheet = Image.open(SPRITE).convert("RGBA")
    cell = sheet.crop((0, 0, sheet.width // 8, sheet.height // 6))
    cell = cell.crop(cell.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
    scale = PARROT_WIDTH / cell.width
    return cell.resize((PARROT_WIDTH, round(cell.height * scale)), Image.LANCZOS)


def sparkle(cx, cy, r) -> list[tuple[float, float]]:
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.32
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


SPARKLES = [(232, 300, 34), (1170, 250, 26), (1215, 560, 18), (190, 640, 20)]


def text_path() -> tuple[str, float]:
    font = TTFont(FONT)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = TEXT_SIZE / font["head"].unitsPerEm
    advance = sum(font["hmtx"][cmap[ord(ch)]][0] for ch in "Lingo") * scale
    x = (W - advance) / 2
    d = []
    for ch in "Lingo":
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyph_set)
        glyph_set[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, TEXT_BASELINE)))
        d.append(pen.getCommands())
        x += font["hmtx"][name][0] * scale
    return " ".join(d), (W - advance) / 2


def poly(pts):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"


def build_svg(parrot: Image.Image) -> str:
    buf = io.BytesIO()
    parrot.save(buf, "PNG", optimize=True)
    parrot_b64 = base64.b64encode(buf.getvalue()).decode()
    px = (W - parrot.width) / 2
    top = book_curve(0)
    pages = top + [(W + 40, W + 40), (-40, W + 40)]
    cover = book_curve(PAGES_THICK) + [(W + 40, W + 40), (-40, W + 40)]
    lines = "".join(
        f'<path d="M{" L".join(f"{x:.1f},{y:.1f}" for x, y in book_curve(o))}" '
        f'stroke="{hex_(PAGE_LINE)}" stroke-width="5" fill="none"/>'
        for o in (14, 28, 40)
    )
    text_d, _ = text_path()
    sparkles = "".join(f'<path d="{poly(sparkle(*s))}" fill="#FFFFFF" opacity="0.9"/>' for s in SPARKLES)
    return f"""<svg width="{W}" height="{W}" viewBox="0 0 {W} {W}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="{W}" gradientUnits="userSpaceOnUse">
<stop stop-color="{hex_(SKY_TOP)}"/><stop offset="1" stop-color="{hex_(SKY_BOTTOM)}"/></linearGradient>
<radialGradient id="glow" cx="703" cy="560" r="520" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFFFFF" stop-opacity="0.38"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<linearGradient id="cover" x1="0" y1="{BOOK_EDGE_Y}" x2="0" y2="{W}" gradientUnits="userSpaceOnUse">
<stop stop-color="{hex_(COVER_TOP)}"/><stop offset="1" stop-color="{hex_(COVER_BOTTOM)}"/></linearGradient>
<clipPath id="clip"><rect width="{W}" height="{W}" rx="{RADIUS}"/></clipPath>
</defs>
<g clip-path="url(#clip)">
<rect width="{W}" height="{W}" fill="url(#sky)"/>
<circle cx="703" cy="560" r="520" fill="url(#glow)"/>
{sparkles}
<image href="data:image/png;base64,{parrot_b64}" x="{px:.1f}" y="{PARROT_TOP}" width="{parrot.width}" height="{parrot.height}"/>
<path d="{poly(pages)}" fill="{hex_(PAGES)}"/>
{lines}
<path d="{poly(cover)}" fill="url(#cover)"/>
<path d="M{" L".join(f"{x:.1f},{y:.1f}" for x, y in book_curve(PAGES_THICK))}" stroke="{hex_(COVER_EDGE)}" stroke-width="8" fill="none"/>
<path d="{text_d}" fill="{hex_(TEXT_SHADOW)}" transform="translate(0 12)"/>
<path d="{text_d}" fill="{hex_(TEXT)}"/>
</g>
</svg>
"""


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def build_png(parrot: Image.Image, size: int) -> Image.Image:
    s = 2  # süper örnekleme
    S = W * s
    img = Image.new("RGBA", (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(SKY_TOP, SKY_BOTTOM, y / S))
    glow = Image.new("L", (S, S), 0)
    gd = ImageDraw.Draw(glow)
    for r in range(520 * s, 0, -6):
        gd.ellipse([703 * s - r, 560 * s - r, 703 * s + r, 560 * s + r], fill=round(97 * (1 - r / (520 * s))))
    img = Image.composite(Image.new("RGBA", (S, S), GLOW + (255,)), img, glow)
    d = ImageDraw.Draw(img)
    for sp in SPARKLES:
        d.polygon([(x * s, y * s) for x, y in sparkle(*sp)], fill=(255, 255, 255, 230))
    big_parrot = parrot.resize((parrot.width * s, parrot.height * s), Image.LANCZOS)
    img.alpha_composite(big_parrot, (round((W - parrot.width) / 2 * s), PARROT_TOP * s))
    d = ImageDraw.Draw(img)
    scaled = lambda pts: [(x * s, y * s) for x, y in pts]  # noqa: E731
    d.polygon(scaled(book_curve(0) + [(W + 40, W + 40), (-40, W + 40)]), fill=PAGES)
    for o in (14, 28, 40):
        d.line(scaled(book_curve(o)), fill=PAGE_LINE, width=5 * s)
    cover_mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(cover_mask).polygon(scaled(book_curve(PAGES_THICK) + [(W + 40, W + 40), (-40, W + 40)]), fill=255)
    cover = Image.new("RGBA", (S, S))
    cd = ImageDraw.Draw(cover)
    for y in range(BOOK_EDGE_Y * s, S):
        cd.line([(0, y), (S, y)], fill=lerp(COVER_TOP, COVER_BOTTOM, (y - BOOK_EDGE_Y * s) / (S - BOOK_EDGE_Y * s)))
    img.paste(cover, (0, 0), cover_mask)
    d = ImageDraw.Draw(img)
    d.line(scaled(book_curve(PAGES_THICK)), fill=COVER_EDGE, width=8 * s)
    font = ImageFont.truetype(str(FONT), TEXT_SIZE * s)
    _, left = text_path()
    d.text((left * s, (TEXT_BASELINE + 12) * s), "Lingo", font=font, fill=TEXT_SHADOW, anchor="ls")
    d.text((left * s, TEXT_BASELINE * s), "Lingo", font=font, fill=TEXT, anchor="ls")
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=RADIUS * s, fill=255)
    img.putalpha(ImageChops.multiply(img.getchannel("A"), mask))
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    parrot = parrot_image()
    (OUT / "lingo-logo.svg").write_text(build_svg(parrot), encoding="utf-8")
    build_png(parrot, W).save(OUT / "lingo-logo-1406.png", optimize=True)
    build_png(parrot, 1024).save(OUT / "lingo-logo-1024.png", optimize=True)
    print("yazıldı:", *(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
