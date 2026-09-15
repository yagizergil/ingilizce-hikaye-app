"""Elemeden geçmiş klasikleri YAYINA alır -- eksiksizlik kapısıyla.

NEDEN AYRI BİR ADIM: `publish_classics.py` kitabı veritabanına yazıyor ama
`status='needs_review'` bırakıyor (o betiğin kendi gerekçesi: ham klasiğin
seviye tahmini gözden geçirilmeden canlıya çıkmamalı). Gözden geçirmenin
otomatikleştirilebilir kısmı `vet_classics.py`'da (telif + kalite); geriye
kalan "kitap gerçekten SUNULABİLİR durumda mı" sorusu burada.

KAPI (hepsi zorunlu, biri eksikse kitap yayına ALINMAZ):
  1. Kapak görseli var.
  2. Tanıtım metni var (kitabın kendi dilinde).
  3. En az bir bölüm ve en az 20 paragraf var.
  4. İlk paragraf biçim artığı ya da yazıcı notu değil.
  5. `author_death_year` dolu ve + 70 < bu yıl (vet_classics ile aynı
     kural; burada bir kez daha kontrol ediliyor çünkü bu betik
     doğrudan da çalıştırılabilir ve yayın son kapı).

Eksik olan kitap sessizce atlanıyor ve NEDENİ yazdırılıyor -- "yayınlandı"
deyip yarısını atlamak, katalogda neyin neden olmadığını görünmez yapardı.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/publish_vetted.py --dry-run
    .venv/Scripts/python.exe scripts/publish_vetted.py --apply
    .venv/Scripts/python.exe scripts/publish_vetted.py --apply --lang fr
"""

from __future__ import annotations

import argparse
import datetime
import io
import os
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg  # noqa: E402

from src.settings import load_settings  # noqa: E402

COPYRIGHT_TERM_YEARS = 70
MIN_PARAGRAPHS = 20

LEFTOVER_PATTERNS = [
    r"^\s*</?pre>",
    r"^\s*title:\s",
    r"produced by",
    r"transcriber",
    r"proofreading",
    r"gutenberg",
]


def blockers(
    cover_url: str | None,
    description: str | None,
    paragraph_count: int,
    first_text: str,
    death_year: int | None,
    this_year: int,
) -> list[str]:
    found: list[str] = []
    if not cover_url:
        found.append("kapak yok")
    if not (description or "").strip():
        found.append("tanıtım metni yok")
    if paragraph_count < MIN_PARAGRAPHS:
        found.append(f"yalnızca {paragraph_count} paragraf")
    lowered = (first_text or "").lower()
    if any(re.search(pattern, lowered) for pattern in LEFTOVER_PATTERNS):
        found.append("ilk paragraf biçim artığı/yazıcı notu")
    if death_year is None:
        found.append("ölüm yılı yok")
    elif death_year + COPYRIGHT_TERM_YEARS >= this_year:
        found.append(f"telif sürebilir (ö. {death_year})")
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--lang", default=None, help="Yalnızca bu dil")
    args = parser.parse_args()
    if not args.apply and not args.dry_run:
        parser.error("--apply ya da --dry-run ver")

    this_year = datetime.date.today().year
    settings = load_settings()

    with psycopg.connect(settings.database_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select b.id, b.slug, b.target_language, b.cefr_level, b.cover_url,
                       b.description, b.author_death_year,
                       (select count(*) from public.book_paragraphs p
                        join public.book_sections s on s.id = p.section_id
                        where s.book_id = b.id) as paragraf,
                       coalesce((
                         select p.text from public.book_paragraphs p
                         join public.book_sections s on s.id = p.section_id
                         where s.book_id = b.id
                         order by s.order_index, p.order_index limit 1
                       ), '')
                from public.books b
                where b.status = 'needs_review'
                  and (%s::text is null or b.target_language = %s::text)
                order by b.target_language, b.slug
                """,
                (args.lang, args.lang),
            )
            rows = cur.fetchall()

        ready: list[tuple[str, str]] = []
        blocked: list[tuple[str, str, list[str]]] = []

        for (
            book_id,
            slug,
            language,
            _level,
            cover_url,
            description,
            death_year,
            paragraph_count,
            first_text,
        ) in rows:
            problems = blockers(
                cover_url, description, paragraph_count, first_text, death_year, this_year
            )
            if problems:
                blocked.append((slug, language, problems))
            else:
                ready.append((book_id, language))

        by_language: dict[str, int] = {}
        for _, language in ready:
            by_language[language] = by_language.get(language, 0) + 1

        print(f"İNCELENEN: {len(rows)}   YAYINA HAZIR: {len(ready)}   ENGELLİ: {len(blocked)}\n")
        print("Yayınlanacaklar:", by_language, "\n")
        if blocked:
            print("Engelliler:")
            for slug, language, problems in blocked:
                print(f"  {language} {slug}: {'; '.join(problems)}")

        if args.apply and ready:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    update public.books
                    set status = 'published',
                        published_at = coalesce(published_at, now())
                    where id = any(%s)
                    """,
                    ([book_id for book_id, _ in ready],),
                )
            conn.commit()
            print(f"\nUYGULANDI: {len(ready)} kitap yayına alındı.")
        elif args.apply:
            print("\nYayına alınacak kitap yok.")
        else:
            print(f"\nKURU ÇALIŞMA: {len(ready)} kitap yayına alınacaktı.")


if __name__ == "__main__":
    main()
