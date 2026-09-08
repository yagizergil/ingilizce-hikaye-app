"""Kapak görseli: EPUB'dan çıkarma veya tipografik kapak üretme,
Supabase Storage'a yükleme."""

from __future__ import annotations

import io
from pathlib import Path

import httpx
from PIL import Image, ImageDraw, ImageFont

from src.settings import Settings

COVER_BUCKET = "book-covers"

# ---------------------------------------------------------------------------
# Tipografik kapak
#
# NEDEN TİPOGRAFİK: önceki üretici, başlığın karma değerinden rastgele bir
# renk seçip ortasına başlığın ilk harfini basıyordu. Kütüphane rafında beş
# farklı doygun renkte dikdörtgen, uygulamanın kendi sıcak/sakin kimliğiyle
# hiç ilgisi olmayan bir görüntü veriyordu.
#
# Bu üretici uygulamanın KENDİ tasarım token'larını kullanıyor
# (src/theme/tokens/colors.ts): krem zemin, terracotta vurgu, aynı yazı
# tipleri. Sonuç, gerçek seviyeli okuma serilerinin (graded reader) yaptığı
# işin aynısı — çoğu tipografiktir, çünkü seri hissi resimden değil
# tutarlılıktan gelir.
#
# YAPAY ZEKÂ KAPAĞI OLAN KİTAPLAR BUNU KULLANMAZ: `scripts/apply_covers.py`
# üretilmiş bir görsel yüklediğinde o kitabın kapağı onunla değişiyor. Bu
# üretici, görsel olmayan her kitabın taban çizgisi.
# ---------------------------------------------------------------------------

_W, _H = 600, 900
_BG = (250, 248, 244)  # --bg      #FAF8F4
_INK = (30, 28, 25)  # --ink       #1E1C19
_MUTED = (138, 131, 120)  # --ink-soft #8A8378
_HAIRLINE = (231, 226, 216)  # --hairline #E7E2D8
_ACCENT = (166, 87, 46)  # --accent   #A6572E

_FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
_DISPLAY_FONT = _FONT_DIR / "Fraunces_600SemiBold.ttf"
_MONO_FONT = _FONT_DIR / "IBMPlexMono_500Medium.ttf"


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Yazı tipi bulunamazsa PIL'in gömülü fontuna düşer.

    Depoda font olmaması üretimi durdurmamalı — kapak çirkinleşir ama
    pipeline çalışmaya devam eder.
    """
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _wrap(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    """Kelime bazlı sarma. Tek başına sığmayan kelime kendi satırında kalır."""
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


def generate_placeholder_cover(
    title: str,
    author: str | None = None,
    level: str | None = None,
) -> bytes:
    """Uygulamanın tasarım diliyle tipografik bir kapak üretir."""
    image = Image.new("RGB", (_W, _H), color=_BG)
    draw = ImageDraw.Draw(image)

    margin = 56
    inner = 18

    # İnce çerçeve — kapağı raf zemininden ayırıyor.
    draw.rectangle(
        [inner, inner, _W - inner - 1, _H - inner - 1],
        outline=_HAIRLINE,
        width=2,
    )

    # Üstteki accent çizgisi: uygulamanın ilerleme çubuğuyla aynı dil.
    draw.rectangle([margin, 150, margin + 88, 154], fill=_ACCENT)

    # --- Başlık ---
    # Uzun başlıklar küçülüyor: dört satırı aşan bir başlık kapağı
    # doldurup okunmaz hâle getiriyordu.
    max_text_width = _W - margin * 2
    for size in (66, 58, 50, 44, 38):
        title_font = _load_font(_DISPLAY_FONT, size)
        lines = _wrap(draw, title, title_font, max_text_width)
        if len(lines) <= 4:
            break

    line_height = int(size * 1.22)
    y = 210
    for line in lines:
        draw.text((margin, y), line, font=title_font, fill=_INK)
        y += line_height

    # --- Yazar ---
    if author:
        author_font = _load_font(_MONO_FONT, 22)
        for line in _wrap(draw, author, author_font, max_text_width)[:2]:
            draw.text((margin, y + 18), line, font=author_font, fill=_MUTED)
            y += 30

    # --- Seviye rozeti (alt) ---
    if level:
        level_font = _load_font(_MONO_FONT, 24)
        label = " ".join(level.upper())  # harf arası açılmış görünüm
        draw.text((margin, _H - margin - 34), label, font=level_font, fill=_ACCENT)

    # Alt hairline — üstteki accent çizgisinin karşılığı.
    draw.rectangle([margin, _H - margin - 56, _W - margin, _H - margin - 55], fill=_HAIRLINE)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def upload_cover(settings: Settings, slug: str, image_bytes: bytes, ext: str = "png") -> str:
    path = f"{slug}.{ext}"
    content_type = "image/png" if ext == "png" else f"image/{ext}"

    response = httpx.put(
        f"{settings.supabase_url}/storage/v1/object/{COVER_BUCKET}/{path}",
        content=image_bytes,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        },
        timeout=30.0,
    )
    response.raise_for_status()

    return f"{settings.supabase_url}/storage/v1/object/public/{COVER_BUCKET}/{path}"
