"""Uygulama ikonunu ve açılış görselini üretir.

TASARIM GEREKÇESİ
Uygulamanın görsel imzası, mockup'lardan gelen "aktif öğenin altındaki
terracotta çizgi" (bkz. src/theme/tokens/layout.ts `accentLineThickness`,
`TabBarButton`'daki alt çizgi). İkon bunu tekrar ediyor: sıcak kâğıt zemin,
Fraunces ile dizilmiş tek bir serif harf ve altında accent renginde bir
çizgi — yani "bir kelimeye dokundun, karşılığı açıldı" fikrinin en küçük
hâli.

Neden tek harf: 40×40 piksele düşen bir App Store arama sonucunda kelime
okunmaz. Tek harf hem o boyutta okunur hem de rafta ayırt edilir.

Neden görsel üretim modeli değil: ikon uygulamanın kendi tasarım
sisteminden (aynı renk token'ları, aynı yazı tipi) türemeli. Bunu kod ile
üretmek hem birebir markaya uygun hem de yeniden üretilebilir.

Kullanım:
    pipeline/.venv/Scripts/python.exe scripts/generate-app-icon.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
FONT = (
    ROOT
    / "node_modules"
    / "@expo-google-fonts"
    / "fraunces"
    / "600SemiBold"
    / "Fraunces_600SemiBold.ttf"
)

# src/theme/tokens/colors.ts ile birebir aynı değerler.
PAPER = "#FAF8F4"
INK = "#1E1C19"
ACCENT = "#A6572E"
DARK_GROUND = "#1C1712"

SIZE = 1024
GLYPH = "a"


def draw_icon(
    size: int,
    ground: str,
    ink: str,
    accent: str,
    *,
    margin_ratio: float = 0.0,
) -> Image.Image:
    """Kare ikonu çizer. `margin_ratio` Android adaptive icon için güvenli
    alan bırakır (dış %25'i maskelenebilir)."""
    image = Image.new("RGB", (size, size), ground)
    draw = ImageDraw.Draw(image)

    # Güvenli alan: adaptive icon maskesi köşeleri kırpar, harf içeride kalmalı.
    inner = size * (1 - 2 * margin_ratio)
    origin = (size - inner) / 2

    # Punto seçimini font boyutuna değil ÇİZİLEN MÜREKKEBE göre yapıyoruz:
    # küçük harf "a"nın çıkıntısı yok, dolayısıyla em kutusunun ancak yarısını
    # doldurur. Punto ile ölçeklersek ikon optik olarak küçük kalır (ilk
    # denemede tam bu oldu). Bunun yerine harfin gerçek yüksekliği hedef
    # oranı tutana kadar puntoyu büyütüyoruz.
    target_glyph_h = inner * 0.52
    font_size = int(target_glyph_h)
    for _ in range(24):
        candidate = ImageFont.truetype(str(FONT), font_size)
        box = draw.textbbox((0, 0), GLYPH, font=candidate)
        height = box[3] - box[1]
        if height <= 0:
            break
        ratio = target_glyph_h / height
        if abs(ratio - 1) < 0.01:
            break
        font_size = max(8, int(font_size * ratio))

    font = ImageFont.truetype(str(FONT), font_size)

    # Harfi gerçek mürekkep kutusuna göre ortala — font metrikleri değil,
    # çizilen pikseller esas alınıyor, yoksa optik olarak kayık durur.
    box = draw.textbbox((0, 0), GLYPH, font=font)
    glyph_w = box[2] - box[0]
    glyph_h = box[3] - box[1]

    # Alt çizgi için harfin altında yer bırak.
    rule_gap = inner * 0.085
    rule_height = max(2, int(inner * 0.055))
    block_h = glyph_h + rule_gap + rule_height

    x = origin + (inner - glyph_w) / 2 - box[0]
    y = origin + (inner - block_h) / 2 - box[1]

    draw.text((x, y), GLYPH, font=font, fill=ink)

    # Accent alt çizgi — harfin çizildiği gerçek yatay aralığa hizalı.
    # `x + box[0]` harfin sol mürekkep kenarı; genişlik de mürekkepten.
    glyph_left = x + box[0]
    rule_w = glyph_w * 0.96
    rule_x = glyph_left + (glyph_w - rule_w) / 2
    rule_y = y + box[1] + glyph_h + rule_gap
    draw.rectangle(
        [rule_x, rule_y, rule_x + rule_w, rule_y + rule_height],
        fill=accent,
    )

    return image


def draw_splash(size: int = 1024) -> Image.Image:
    """Açılış görseli: aynı işaret, zeminsiz ve daha küçük.

    expo-splash-screen `resizeMode: contain` ile ortalıyor ve zemini kendi
    veriyor (app.config.ts), o yüzden buradaki zemin yalnızca aynı renk
    olsun diye var."""
    return draw_icon(size, PAPER, INK, ACCENT, margin_ratio=0.18)


def main() -> int:
    if not FONT.exists():
        print(f"Yazı tipi bulunamadı: {FONT}", file=sys.stderr)
        return 1

    ASSETS.mkdir(exist_ok=True)

    # iOS ikonu: maske yok, kenardan kenara zemin.
    draw_icon(SIZE, PAPER, INK, ACCENT, margin_ratio=0.10).save(ASSETS / "icon.png")

    # Android adaptive icon: dış %25 maskelenebilir, harf ortada kalmalı.
    # Zemin app.config.ts'te ayrı veriliyor, burada şeffaf değil düz zemin
    # kullanıyoruz çünkü foregroundImage şeffaflığı destekliyor ama düz
    # zemin daha öngörülebilir sonuç veriyor.
    draw_icon(SIZE, PAPER, INK, ACCENT, margin_ratio=0.26).save(
        ASSETS / "adaptive-icon.png"
    )

    draw_splash(SIZE).save(ASSETS / "splash.png")

    # Koyu temada açılış için ayrı görsel (app.config.ts `dark` bloğu).
    draw_icon(SIZE, DARK_GROUND, PAPER, "#D08A5C", margin_ratio=0.18).save(
        ASSETS / "splash-dark.png"
    )

    for name in ("icon.png", "adaptive-icon.png", "splash.png", "splash-dark.png"):
        path = ASSETS / name
        print(f"  {name}: {path.stat().st_size:,} bayt")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
