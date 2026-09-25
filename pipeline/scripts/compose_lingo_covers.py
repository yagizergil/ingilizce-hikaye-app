"""Lingo Studio kapakları: üretilen resmin altına başlık bandı basar.

Kullanıcı bulgusu (2026-09-25): Lingo Studio kapaklarında ne kitap adı ne
yazar yazıyordu; kullanıcı bir resme bakıp kitabı tanıyamıyordu. Bant
düzeni klasiklerin (ör. Castle Rackrent) kapaklarıyla aynı: altta koyu,
yarı saydam bir kutu, içinde büyük harfle başlık ve "LINGO STUDIO".

Yazı modele YAZDIRILMIYOR -- görsel modeller harfleri bozuyor; bant
burada, gerçek fontla basılıyor.

Kullanım:
    python scripts/compose_lingo_covers.py <urls.txt> <scenes.json> <books.json> <çıktı klasörü>
"""

from __future__ import annotations

import json
import sys
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image, ImageDraw, ImageFont

SIZE = (1200, 1800)
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"
FONTS_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"
# Segoe UI'da CJK/Arapça glif yok -- o dillerde başlık Noto ile basılıyor.
SCRIPT_FONTS = {
    "zh": FONTS_DIR / "NotoSansCJKsc-Bold.otf",
    "ja": FONTS_DIR / "NotoSansCJKjp-Bold.otf",
    "ar": FONTS_DIR / "NotoNaskhArabic-Variable.ttf",
}
AUTHOR = "LINGO STUDIO"


def display_title(title: str, language: str) -> str:
    """Büyük harfe çevirir (Türkçe i->İ) ve Arapçayı şekillendirip sağdan sola dizer."""
    if language == "ar":
        import arabic_reshaper
        from bidi.algorithm import get_display

        return get_display(arabic_reshaper.reshape(title))
    if language in ("zh", "ja"):
        return title
    if language == "tr":
        title = title.replace("i", "İ").replace("ı", "I")
    return title.upper()


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def wrap_chars(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        if draw.textlength(current + char, font=font) <= width:
            current += char
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def fit_cover(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    target = SIZE[0] / SIZE[1]
    w, h = image.size
    if w / h > target:
        nw = int(h * target)
        image = image.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < target:
        nh = int(w / target)
        image = image.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return image.resize(SIZE, Image.LANCZOS)


def compose(image: Image.Image, title: str, language: str = "en") -> Image.Image:
    image = fit_cover(image).convert("RGBA")
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    margin = 44
    inner = SIZE[0] - 2 * margin - 80
    size = 104
    while True:
        font = ImageFont.truetype(str(SCRIPT_FONTS.get(language, FONT_BOLD)), size)
        text = display_title(title, language)
        # CJK'de boşluk yok: kelime yerine karakter karakter kırılıyor.
        lines = (
            wrap_chars(draw, text, font, inner)
            if language in ("zh", "ja")
            else wrap(draw, text, font, inner)
        )
        if len(lines) <= 3 or size <= 64:
            break
        size -= 6
    author_font = ImageFont.truetype(FONT_SEMI, 44)

    line_h = int(size * 1.12)
    block_h = line_h * len(lines) + 40 + 52
    box_bottom = SIZE[1] - 110
    box_top = box_bottom - block_h - 96
    draw.rectangle((margin, box_top, SIZE[0] - margin, box_bottom), fill=(0, 0, 0, 185))

    y = box_top + 48
    for line in lines:
        tw = draw.textlength(line, font=font)
        draw.text(((SIZE[0] - tw) / 2, y), line, font=font, fill=(255, 255, 255, 255))
        y += line_h
    y += 40
    aw = draw.textlength(AUTHOR, font=author_font)
    draw.text(((SIZE[0] - aw) / 2, y), AUTHOR, font=author_font, fill=(255, 255, 255, 255))

    return Image.alpha_composite(image, overlay).convert("RGB")


def main() -> int:
    urls_path, scenes_path, books_path, out_dir = map(Path, sys.argv[1:5])
    books = json.loads(books_path.read_text(encoding="utf-8"))
    # scenes.json verilmezse ("-") sıra kitap listesinin kendi sırası.
    order = (
        [b["slug"] for b in books]
        if str(scenes_path) == "-"
        else list(json.loads(scenes_path.read_text(encoding="utf-8")).keys())
    )
    titles = {b["slug"]: b["title"] for b in books}
    languages = {b["slug"]: b.get("target_language", "en") for b in books}
    out_dir.mkdir(parents=True, exist_ok=True)

    with httpx.Client(timeout=120) as client:
        for line in urls_path.read_text().splitlines():
            index, url = line.split(" ", 1)
            slug = order[int(index)]
            data = client.get(url).content
            cover = compose(Image.open(BytesIO(data)), titles[slug], languages[slug])
            cover.save(out_dir / f"{slug}.png")
            print("ok", slug)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
