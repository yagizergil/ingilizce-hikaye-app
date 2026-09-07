"""Üretilen kapak görsellerini işler ve Supabase Storage'a yükler.

Girdi: bir klasördeki `<slug>.png` dosyaları (herhangi bir boyutta).
Çıktı: 600x900 JPEG olarak `book-covers/<slug>.jpg` ve `books.cover_url`
güncellemesi.

Neden 600x900: mevcut kapak sözleşmesi bu (bkz. `src/cover.py`
`generate_placeholder_cover`). Uygulama kapakları küçük gösteriyor;
5 MB'lık PNG'leri olduğu gibi yüklemek kütüphane ekranını gereksiz yere
yavaşlatır.

Kullanım:
    pipeline/.venv/Scripts/python.exe pipeline/scripts/upload_covers.py <klasor>
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BUCKET = "book-covers"
TARGET_SIZE = (600, 900)
JPEG_QUALITY = 88

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def to_cover_jpeg(path: Path) -> bytes:
    """Görseli 600x900'e ortalayarak kırpar ve JPEG'e çevirir."""
    with Image.open(path) as image:
        image = image.convert("RGB")

        # Hedef en-boy oranına göre ortadan kırp (kapaklar 2:3).
        target_ratio = TARGET_SIZE[0] / TARGET_SIZE[1]
        width, height = image.size
        ratio = width / height

        if ratio > target_ratio:
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            image = image.crop((left, 0, left + new_width, height))
        elif ratio < target_ratio:
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            image = image.crop((0, top, width, top + new_height))

        image = image.resize(TARGET_SIZE, Image.LANCZOS)

        from io import BytesIO

        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return buffer.getvalue()


def upload(client: httpx.Client, slug: str, data: bytes) -> str:
    """Storage'a yükler (varsa üzerine yazar) ve public URL döndürür."""
    path = f"{BUCKET}/{slug}.jpg"
    response = client.post(
        f"{SUPABASE_URL}/storage/v1/object/{path}",
        content=data,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "image/jpeg",
            # Var olan dosyanın üzerine yazılmasına izin ver.
            "x-upsert": "true",
            "Cache-Control": "public, max-age=31536000",
        },
    )
    response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{path}"


def update_book(client: httpx.Client, slug: str, url: str) -> None:
    response = client.patch(
        f"{SUPABASE_URL}/rest/v1/books",
        params={"slug": f"eq.{slug}"},
        json={"cover_url": url},
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    response.raise_for_status()


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    source = Path(sys.argv[1])
    files = sorted(source.glob("*.png"))
    if not files:
        print(f"{source} altında .png yok")
        return 2

    ok = 0
    with httpx.Client(timeout=120) as client:
        for path in files:
            slug = path.stem
            try:
                data = to_cover_jpeg(path)
                url = upload(client, slug, data)
                update_book(client, slug, url)
                print(f"  ✓ {slug}  ({len(data) // 1024} KB)")
                ok += 1
            except Exception as error:  # noqa: BLE001 - tek tek raporlanıyor
                print(f"  ✗ {slug}: {error}")

    print(f"\n{ok}/{len(files)} kapak yüklendi.")
    return 0 if ok == len(files) else 1


if __name__ == "__main__":
    raise SystemExit(main())
