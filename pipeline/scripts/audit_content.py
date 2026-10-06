"""Yayındaki katalogu içerik uygunluğu için denetler (src/content_check.py).

Uygun bulunmayan kitap `needs_review`'a alınır (SİLİNMEZ; silme ayrı ve
bilinçli bir karar). Özgün hikâyeler (is_original) atlanır.

Kullanım:
    .venv/Scripts/python.exe scripts/audit_content.py            # rapor + uygula
    .venv/Scripts/python.exe scripts/audit_content.py --dry-run  # yalnızca rapor
    .venv/Scripts/python.exe scripts/audit_content.py --lang de
"""

from __future__ import annotations

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg
from dotenv import load_dotenv

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from src.settings import load_settings  # noqa: E402
from src.content_check import check_book  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--lang")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    load_dotenv(PIPELINE_ROOT / ".env")
    settings = load_settings()

    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        query = (
            "select id, slug, title, author from books "
            "where status = 'published' and not is_original"
        )
        params: list[str] = []
        if args.lang:
            query += " and target_language = %s"
            params.append(args.lang)
        books = conn.execute(query + " order by slug", params).fetchall()

        # Örnekler TEK bağlantıyla, sırayla çekiliyor (kitap başına bağlantı
        # açmak yük altında DNS/bağlantı hatası veriyordu); yalnızca LLM
        # incelemesi paralel.
        def sample_for(book_id: str) -> list[str]:
            rows = conn.execute(
                "select p.text from book_paragraphs p join book_sections s on s.id = p.section_id "
                "where s.book_id = %s order by s.order_index, p.order_index",
                (book_id,),
            ).fetchall()
            return [r[0] for r in rows]

        samples = {book[0]: sample_for(book[0]) for book in books}

        def review(book):
            book_id, slug, title, author = book
            return book, check_book(title, author, samples[book_id])

        print(f"{len(books)} kitap denetleniyor...")
        flagged = []
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            for (book_id, slug, title, author), decision in pool.map(review, books):
                mark = "✓" if decision.suitable else "✗"
                if not decision.suitable:
                    flagged.append((book_id, slug, decision))
                    print(f"{mark} {slug} [{decision.category}] {'; '.join(decision.reasons)}")

        print(f"\nUygun değil: {len(flagged)} / {len(books)}")
        if flagged and not args.dry_run:
            conn.execute(
                "update books set status = 'needs_review' where id = any(%s)",
                ([f[0] for f in flagged],),
            )
            print("Hepsi needs_review'a alındı (silinmedi).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
