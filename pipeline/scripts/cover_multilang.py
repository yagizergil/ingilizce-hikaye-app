"""Çok dilli kitaplar için tipografik kapak üretimi -- `src/cover.py`nin
(İngilizce/klasikler için kullanılan) AYNI ücretsiz, tipografik yaklaşımı,
ama script'e göre font seçimi eklenmiş hâli.

NEDEN AYRI DOSYA (cover.py'yi değiştirmek yerine): cover.py'nin
`generate_placeholder_cover()`'ı sabit `_DISPLAY_FONT` (Fraunces) ve
`_MONO_FONT` (IBM Plex Mono) kullanıyor. Fraunces Latin+Kiril'i kapsıyor
(test edildi: Rusça/Türkçe düzgün render ediyor) ama Çince/Japonca/Arapça
glyph'leri YOK -- o dillerde PIL ya boş kutu ya da hiçbir şey çizerdi.
cover.py'yi script-farkında yapmak, İngilizce/klasik kapakların (hâlâ tek
başına en çok kullanılan yol) davranışını değiştirme riski taşırdı; bu
yüzden aynı görsel dili KOPYALAYIP script-seçimli hâle getiren ayrı bir
fonksiyon yazıldı.

FONT KAYNAKLARI (hepsi ücretsiz, OFL lisanslı, Google Fonts/Noto):
  - Latin + Kiril (es/fr/de/it/ru/tr): mevcut Fraunces/IBM Plex Mono.
  - Çince/Japonca (zh/ja): Noto Sans CJK SC/JP Bold (assets/fonts/).
  - Arapça (ar): Noto Naskh Arabic (değişken font) + `arabic_reshaper` +
    `python-bidi` -- Arapça harfler konuma göre şekil değiştiriyor
    (başta/ortada/sonda farklı biçim) ve metin sağdan sola akıyor; PIL
    bunların İKİSİNİ de otomatik yapmıyor, ham metni olduğu gibi
    (yanlış şekillerle, soldan sağa) çizerdi. `arabic_reshaper` doğru
    harf biçimlerini seçiyor, `python-bidi` sağdan-sola sırayı düzeltiyor.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/cover_multilang.py --lang all
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import httpx
from bidi.algorithm import get_display

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from PIL import Image, ImageDraw, ImageFont

from src.settings import load_settings

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = PIPELINE_ROOT / "assets" / "fonts"
COVER_BUCKET = "book-covers"

_W, _H = 600, 900
_BG = (250, 248, 244)
_INK = (30, 28, 25)
_MUTED = (138, 131, 120)
_HAIRLINE = (231, 226, 216)
_ACCENT = (166, 87, 46)

_LATIN_DISPLAY_FONT = FONT_DIR / "Fraunces_600SemiBold.ttf"
_LATIN_MONO_FONT = FONT_DIR / "IBMPlexMono_500Medium.ttf"
_CJK_FONTS = {
    "zh": FONT_DIR / "NotoSansCJKsc-Bold.otf",
    "ja": FONT_DIR / "NotoSansCJKjp-Bold.otf",
}
_ARABIC_FONT = FONT_DIR / "NotoNaskhArabic-Variable.ttf"

_RTL_LANGS = {"ar"}


def _display_font_for(lang: str) -> Path:
    if lang in _CJK_FONTS:
        return _CJK_FONTS[lang]
    if lang == "ar":
        return _ARABIC_FONT
    return _LATIN_DISPLAY_FONT


def _mono_font_for(lang: str) -> Path:
    # Yazar adı/seviye rozeti her zaman Latin (Lingo Studio,
    # "A1" gibi) -- CJK/Arapça font gerekmiyor, mevcut mono font yeterli.
    return _LATIN_MONO_FONT


def _shape(text: str, lang: str) -> str:
    if lang != "ar":
        return text
    import arabic_reshaper

    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def generate_cover_multilang(
    title: str, author: str | None, level: str | None, lang: str
) -> bytes:
    """`src/cover.py`'nin `generate_placeholder_cover()`'ıyla AYNI
    tasarım (aynı ölçüler, renkler, düzen) -- yalnızca font script'e göre
    seçiliyor ve Arapça'da RTL şekillendirme uygulanıyor."""
    image = Image.new("RGB", (_W, _H), color=_BG)
    draw = ImageDraw.Draw(image)

    margin = 56
    inner = 18
    is_rtl = lang in _RTL_LANGS

    draw.rectangle([inner, inner, _W - inner - 1, _H - inner - 1], outline=_HAIRLINE, width=2)
    accent_x = _W - margin - 88 if is_rtl else margin
    draw.rectangle([accent_x, 150, accent_x + 88, 154], fill=_ACCENT)

    display_font_path = _display_font_for(lang)
    shaped_title = _shape(title, lang)
    max_text_width = _W - margin * 2
    lines = [shaped_title]
    size = 66
    for candidate_size in (66, 58, 50, 44, 38):
        title_font = _load_font(display_font_path, candidate_size)
        lines = _wrap(draw, shaped_title, title_font, max_text_width)
        size = candidate_size
        if len(lines) <= 4:
            break

    line_height = int(size * 1.22)
    y = 210
    for line in lines:
        line_width = draw.textlength(line, font=title_font)
        x = _W - margin - line_width if is_rtl else margin
        draw.text((x, y), line, font=title_font, fill=_INK)
        y += line_height

    if author:
        author_font = _load_font(_mono_font_for(lang), 22)
        for line in _wrap(draw, author, author_font, max_text_width)[:2]:
            line_width = draw.textlength(line, font=author_font)
            x = _W - margin - line_width if is_rtl else margin
            draw.text((x, y + 18), line, font=author_font, fill=_MUTED)
            y += 30

    if level:
        level_font = _load_font(_mono_font_for(lang), 24)
        label = " ".join(level.upper())
        x = margin if not is_rtl else _W - margin - draw.textlength(label, font=level_font)
        draw.text((x, _H - margin - 34), label, font=level_font, fill=_ACCENT)

    draw.rectangle([margin, _H - margin - 56, _W - margin, _H - margin - 55], fill=_HAIRLINE)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def upload_cover(settings, slug: str, image_bytes: bytes) -> str:
    path = f"{slug}.png"
    response = httpx.put(
        f"{settings.supabase_url}/storage/v1/object/{COVER_BUCKET}/{path}",
        content=image_bytes,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "image/png",
            "x-upsert": "true",
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return f"{settings.supabase_url}/storage/v1/object/public/{COVER_BUCKET}/{path}"


def main() -> None:
    import psycopg

    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True)
    args = parser.parse_args()

    settings = load_settings()
    langs = ["es", "fr", "de", "it", "ru", "zh", "ja", "tr", "ar"] if args.lang == "all" else [args.lang]

    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select id, slug, title, author, cefr_level, target_language
                from public.books
                where target_language = any(%s) and status = 'published' and cover_url is null
                """,
                (langs,),
            )
            rows = cur.fetchall()

        print(f"{len(rows)} kitap için kapak üretilecek.")
        for book_id, slug, title, author, level, lang in rows:
            image_bytes = generate_cover_multilang(title, author, level, lang)
            cover_url = upload_cover(settings, slug, image_bytes)
            with conn.cursor() as cur:
                cur.execute(
                    "update public.books set cover_url = %s where id = %s", (cover_url, book_id)
                )
            conn.commit()
            print(f"  {slug} -> {cover_url}")


if __name__ == "__main__":
    main()
