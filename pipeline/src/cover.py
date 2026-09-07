"""Kapak görseli: EPUB'dan çıkarma veya tipografik placeholder üretme,
Supabase Storage'a yükleme."""

from __future__ import annotations

import hashlib
import io

import httpx
from PIL import Image, ImageDraw, ImageFont

from src.settings import Settings

COVER_BUCKET = "book-covers"
_PALETTE = [
    (47, 111, 78),
    (201, 162, 39),
    (91, 125, 177),
    (179, 86, 74),
    (107, 91, 149),
]


def generate_placeholder_cover(title: str) -> bytes:
    color = _PALETTE[int(hashlib.sha256(title.encode("utf-8")).hexdigest(), 16) % len(_PALETTE)]
    img = Image.new("RGB", (600, 900), color=color)
    draw = ImageDraw.Draw(img)

    initial = (title.strip()[:1] or "?").upper()
    font = ImageFont.load_default(size=280)
    bbox = draw.textbbox((0, 0), initial, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((600 - text_w) / 2 - bbox[0], (900 - text_h) / 2 - bbox[1]),
        initial,
        fill=(255, 255, 255),
        font=font,
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


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
