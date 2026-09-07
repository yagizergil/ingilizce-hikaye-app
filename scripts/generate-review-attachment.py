"""App Store Connect "Review Information -> Screenshot" ekini uretir.

NEDEN BU DOSYA VAR (2026-09-07): App Store Connect gonderim sayfasi
"The dimensions of one or more screenshots are wrong" hatasi veriyordu.
Review Information ekini gecerli bir cihaz ekran goruntusu olcusunde
istiyor; rastgele boyutlu bir gorsel reddediliyor.

NEDEN GORSEL URETEN BIR MODEL DEGIL DE KOD: bu ekin isi denetciye METIN
okutmak (hesap gerekmiyor, kitaplar ucretsiz, paywall nerede). Goruntu
uretim modelleri metni guvenilir yazamaz ve tam piksel olcusu veremez.
Pillow her ikisini de garanti ediyor.

Olcu: 1284 x 2778 — iPhone 6.5"/6.7" portre ekran goruntusu olcusu, App
Store Connect'in kabul ettigi standart boyutlardan biri.

Kullanim:
    pipeline/.venv/Scripts/python.exe scripts/generate-review-attachment.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "store" / "review-attachment.png"
WIDTH, HEIGHT = 1284, 2778

# Uygulamanin kendi token'lari (src/theme/tokens/colors.ts).
BG = (250, 248, 244)
INK = (30, 28, 25)
INK_SOFT = (138, 131, 120)
ACCENT = (166, 87, 46)
DEEP = (31, 58, 95)
HAIRLINE = (231, 226, 216)
PAPER = (255, 255, 255)

FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def wrap(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    """Metni max_w pikselden tasmayacak satirlara boler."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=f) <= max_w:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def main() -> int:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    f_eyebrow = font("arialbd.ttf", 34)
    f_title = font("arialbd.ttf", 88)
    f_h2 = font("arialbd.ttf", 52)
    f_body = font("arial.ttf", 42)
    f_mono = font("arialbd.ttf", 38)

    margin = 96
    content_w = WIDTH - margin * 2

    # --- Ust blok: koyu lacivert baslik alani ---
    header_h = 430
    draw.rectangle([0, 0, WIDTH, header_h], fill=DEEP)

    # Uygulama isaretcisi
    mark = 132
    mx, my = margin, 110
    draw.rounded_rectangle([mx, my, mx + mark, my + mark], radius=30, fill=ACCENT)
    letter = "I"
    lw = draw.textlength(letter, font=f_title)
    draw.text((mx + (mark - lw) / 2, my + 16), letter, font=f_title, fill=BG)

    draw.text((mx + mark + 40, my + 18), "APP REVIEW", font=f_eyebrow, fill=(160, 185, 215))
    draw.text((mx + mark + 40, my + 66), "Ingilizce Hikaye", font=f_h2, fill=BG)

    sub = "Reading app for Turkish learners of English"
    draw.text((margin, my + mark + 40), sub, font=f_body, fill=(190, 208, 230))

    y = header_h + 90

    # Kartlari once OLC, sonra ciz: toplam yukseklik sayfaya sigmazsa
    # tasan bir kart ve alt yaziyla cakisma cikiyordu.
    def measure(lines: list[str]) -> tuple[list[str], int]:
        pad, head_h, line_h = 44, 74, 62
        body: list[str] = []
        for line in lines:
            if line == "":
                body.append("")
            else:
                body.extend(wrap(draw, line, f_body, content_w - pad * 2))
        return body, pad * 2 + head_h + len(body) * line_h

    sections = [
        (
            "No account needed",
            [
                "The app creates an anonymous account on first launch.",
                "There is no sign-in wall — open it and start reading.",
            ],
            True,
        ),
        (
            "All content is free",
            [
                "All 85 books are free for everyone; nothing in the reading "
                "experience is behind a paywall. "
                "47 public-domain classics (Standard Ebooks) and 38 original "
                "graded stories written by us.",
            ],
            False,
        ),
        (
            "How to test the core loop",
            [
                "1. Library tab, open any book, open a chapter.",
                "2. Tap an English word: a sheet shows the Turkish meaning, "
                "part of speech and pronunciation.",
                "3. Long-press a sentence for an AI translation.",
                "4. Save a word, then open the Words tab to review it.",
            ],
            False,
        ),
        (
            "Where the subscription is",
            [
                "Profile tab, Subscription row. The paywall is never shown "
                "inside the reading screen.",
                "Premium adds unlimited saved words, unlimited spaced "
                "repetition, a higher AI translation quota and detailed "
                "statistics. It unlocks no book.",
            ],
            False,
        ),
        (
            "Contact",
            ["etkinlikyweb@gmail.com"],
            False,
        ),
    ]

    measured = [(h, measure(lines), accent) for h, lines, accent in sections]
    footer_zone = 180
    available = HEIGHT - y - footer_zone
    total_cards = sum(m[1][1] for m in measured)
    gap = max(28, (available - total_cards) // max(len(measured) - 1, 1))

    if total_cards + gap * (len(measured) - 1) > available:
        raise SystemExit(
            f"Icerik sigmiyor: {total_cards + gap * (len(measured) - 1)}px > {available}px. "
            "Metni kisalt ya da yazi boyutunu dusur."
        )

    pad, head_h, line_h = 44, 74, 62
    for heading, (body_lines, card_h), accent in measured:
        draw.rounded_rectangle(
            [margin, y, WIDTH - margin, y + card_h],
            radius=28,
            fill=PAPER,
            outline=ACCENT if accent else HAIRLINE,
            width=3 if accent else 2,
        )
        draw.text((margin + pad, y + pad), heading, font=f_h2, fill=ACCENT if accent else INK)
        ty = y + pad + head_h
        for line in body_lines:
            if line:
                draw.text((margin + pad, ty), line, font=f_body, fill=INK)
            ty += line_h
        y += card_h + gap

    footer = "Interface language is Turkish; the reading content is English."
    fw = draw.textlength(footer, font=f_mono)
    draw.text(((WIDTH - fw) / 2, HEIGHT - 110), footer, font=f_mono, fill=INK_SOFT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, "PNG")
    print(f"{OUT}  {image.size[0]}x{image.size[1]}  {OUT.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
