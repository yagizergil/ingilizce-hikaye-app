"""Project Gutenberg'den bir dildeki kamu malı klasikleri toplu indirir.

KAPSAM: yalnızca Gutendex API + Gutenberg'in kendi `.txt.utf-8` formatı --
araştırma raporunun (docs/research/2026-09-14-...) önerdiği gibi ("mevcut
İngilizce pipeline'ı zaten TXT'den başlıyor... HTML/EPUB parse etmeye
gerek yok" -- ADR-007 ile tutarlı).

TELİF KURALI (CLAUDE.md İlke #3 + ADR-005'in ruhu): yalnızca
`author_year_end=1955` filtresiyle sorgulanıyor -- yazarı 1955'ten önce
ölmüş olmak, hem kaynak ülke hem ABD kamu malı kuralı için muhafazakâr,
tek bir eşik (bkz. araştırma raporu §1.0).

RATE LİMİT: Gutenberg'in resmi bir API rate limit dokümanı yok ama toplu
kazıma politikası istek başına makul aralık istiyor
(gutenberg.org/policy/robot_access.html) -- bu betik istek başına 2 sn
bekliyor.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/fetch_gutenberg.py --lang fr --count 20
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import httpx

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
HEADERS = {"User-Agent": "IngilizceHikaye-ContentPipeline/1.0 (research/education; contact via repo)"}

# Gutenberg TXT dosyalarının başında/sonunda duran, kitabın kendi metni
# OLMAYAN standart lisans/kimlik bloğu -- bu iki işaretçi arasındaki kısım
# gerçek metin. Format 2000'lerden beri stabil.
_START_RE = re.compile(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\*]*\*\*\*", re.IGNORECASE)
_END_RE = re.compile(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\*]*\*\*\*", re.IGNORECASE)


def _strip_boilerplate(raw: str) -> str:
    start_match = _START_RE.search(raw)
    end_match = _END_RE.search(raw)
    start = start_match.end() if start_match else 0
    end = end_match.start() if end_match else len(raw)
    return raw[start:end].strip()


def fetch_catalog(lang: str, count: int) -> list[dict]:
    books: list[dict] = []
    url = f"https://gutendex.com/books/?languages={lang}&author_year_end=1955"
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30.0) as client:
        while url and len(books) < count:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()
            for item in data["results"]:
                txt_url = item["formats"].get("text/plain; charset=utf-8") or item["formats"].get(
                    "text/plain"
                )
                if not txt_url:
                    continue
                books.append(
                    {
                        "id": item["id"],
                        "title": item["title"],
                        "authors": item.get("authors", []),
                        "txt_url": txt_url,
                    }
                )
                if len(books) >= count:
                    break
            url = data.get("next")
    return books


def _slugify(text: str, fallback: str) -> str:
    """ASCII-dışı başlıklar (Çince/Japonca/Arapça) tamamen süzülüp BOŞ
    slug üretebiliyordu -- bu, o dildeki HER kitabın aynı boş slug'a
    çakışıp "zaten var" sanılarak atlanmasına yol açan gerçek bir bug'dı
    (bkz. oturum notları, Çince fetch'te 18/20 kitap bu yüzden kayboldu).
    Boşsa `fallback` (gutenberg id) kullanılır."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:80] if slug else f"book-{fallback}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True)
    parser.add_argument("--count", type=int, default=20)
    args = parser.parse_args()

    out_dir = PIPELINE_ROOT / f"classics_{args.lang}"
    out_dir.mkdir(exist_ok=True)

    print(f"[{args.lang}] Gutendex kataloğu sorgulanıyor (author_year_end=1955)...")
    catalog = fetch_catalog(args.lang, args.count)
    print(f"[{args.lang}] {len(catalog)} eser bulundu.")

    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=60.0) as client:
        for book in catalog:
            slug = _slugify(book["title"], str(book["id"]))
            txt_path = out_dir / f"{slug}.txt"
            meta_path = out_dir / f"{slug}.json"
            if txt_path.exists():
                print(f"  [atla] {slug} zaten var.")
                continue

            print(f"  indiriliyor: {book['title']} (gutenberg #{book['id']})...")
            resp = client.get(book["txt_url"])
            if resp.status_code != 200:
                print(f"    HATA: HTTP {resp.status_code}")
                continue
            raw = resp.text
            body = _strip_boilerplate(raw)
            if len(body.split()) < 500:
                print(f"    ATLA: boilerplate temizlendikten sonra çok kısa ({len(body.split())} kelime)")
                continue

            txt_path.write_text(body, encoding="utf-8")
            author_names = [a.get("name", "") for a in book["authors"]]
            author_death_years = [a.get("death_year") for a in book["authors"] if a.get("death_year")]
            meta_path.write_text(
                json.dumps(
                    {
                        "title": book["title"],
                        "author": ", ".join(author_names) if author_names else None,
                        "author_death_year": min(author_death_years) if author_death_years else None,
                        "gutenberg_id": book["id"],
                        "source_url": f"https://www.gutenberg.org/ebooks/{book['id']}",
                        "license": "Public Domain (Project Gutenberg)",
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            time.sleep(2.0)

    print(f"[{args.lang}] tamamlandı -> {out_dir}")


if __name__ == "__main__":
    main()
