"""Özgün hikâyelerin tür/tema bilgisini frontmatter'dan veritabanına yazar.

NEDEN AYRI BİR SCRIPT: `markdown/parser.py` frontmatter'daki `genres` ve
`themes` alanlarını okuyor ama `del genres, themes` ile atıyor — publish
aşaması bu alanları hiç desteklemiyordu (dosyadaki yorum bunu açıkça
söylüyor). Kitapları yeniden publish etmek lemma çevirisini de yeniden
üretir ve gereksiz maliyet çıkarır; bu script yalnızca iki sütunu
güncelliyor.

İleride publish.py bu alanları yazmaya başlarsa bu script'e gerek kalmaz.

Kullanım:
    pipeline/.venv/Scripts/python.exe pipeline/scripts/backfill_genres_themes.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
STORIES = ROOT / "stories"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def parse_list_field(raw: str, key: str) -> list[str]:
    """`key: [a, b]` satırını listeye çevirir. Yoksa boş liste."""
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped.startswith(f"{key}:"):
            continue
        value = stripped.split(":", 1)[1].strip()
        if not value.startswith("["):
            continue
        inner = value.strip("[]")
        return [item.strip() for item in inner.split(",") if item.strip()]
    return []


def read_front_matter(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end != -1 else ""


def main() -> int:
    files = sorted(STORIES.glob("*.md"))
    if not files:
        print(f"{STORIES} altında .md yok")
        return 2

    updated = 0
    skipped = 0

    with httpx.Client(timeout=60) as client:
        for path in files:
            slug = path.stem
            head = read_front_matter(path)
            genres = parse_list_field(head, "genres")
            themes = parse_list_field(head, "themes")

            if not genres and not themes:
                skipped += 1
                continue

            response = client.patch(
                f"{SUPABASE_URL}/rest/v1/books",
                params={"slug": f"eq.{slug}"},
                json={"genres": genres, "themes": themes},
                headers={
                    "Authorization": f"Bearer {SERVICE_KEY}",
                    "apikey": SERVICE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
            )
            response.raise_for_status()
            print(f"  ✓ {slug}: {genres} / {themes}")
            updated += 1

    print(f"\n{updated} kitap güncellendi, {slugless} atlandı." if False else
          f"\n{updated} kitap güncellendi, {skipped} dosyada tür/tema yoktu.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
