"""Çok dilli özgün hikâyeleri (stories_{lang}/*.md) doğrudan veritabanına
yayınlar -- `pipeline publish` (src/publish.py) KASITLI OLARAK
KULLANILMADI, iki nedenle:

1. `publish_book()` yayın kararını `_check_lemma_gloss_coverage()`'a
   bağlıyor, o da `lemmas` tablosuna (İngilizce->Türkçe SABİT sözlük,
   ADR-008) karşı kontrol ediyor. Yeni diller o tabloyla HİÇ ilgili
   değil -- kelime karşılığı artık `lemma_translations` (ADR-013) ile
   ÇALIŞMA ANINDA LLM'den geliyor, publish zamanında önceden
   doldurulması gerekmiyor. `publish_book()`'u olduğu gibi çağırmak her
   çok dilli kitabı yanlışlıkla 'needs_review'a düşürürdü.
2. `profiler.py`/`validator.py` tamamen İngilizce'ye sabit (spaCy
   en_core_web_sm, CEFR-J kelime listesi) -- bu betik onlara hiç
   dokunmuyor, kalibre edilmiş İngilizce yolunu riske atmıyor (bkz.
   generate_stories_multi.py'nin aynı gerekçesi).

Bunun yerine: `src.markdown.parser.extract_markdown()` (format-agnostik,
zaten var olan) ile ayrıştırılıyor, `target_language`/`genres`/`themes`
frontmatter'dan ayrıca okunuyor (parser bunları es geçiyor), ve
`books`/`book_sections`/`book_paragraphs`'a DOĞRUDAN yazılıyor --
`src.db.copy_rows`/`delete_book_content` (aynı toplu-yazma altyapısı)
kullanılarak.

DOĞRULAMA: Bu hikâyeler zaten `generate_stories_multi.py`'nin kapalı
döngüsünden geçmiş (kelime kapsamı + cümle uzunluğu kontrolü) -- bu
yüzden hepsi doğrudan `status='published'` ile yazılıyor, `needs_review`
YOK. Bu, İngilizce STRICT doğrulayıcısından daha gevşek bir kapıdan
geçmiş içerik anlamına geliyor (bkz. o script'in NEDEN notu) -- bilinçli
bir risk, ilk kullanıcı geri bildirimiyle kalibrasyon iyileştirilecek.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/publish_multilang.py --lang es
    .venv/Scripts/python.exe scripts/publish_multilang.py --lang all
"""

from __future__ import annotations

import argparse
import re
import uuid
from pathlib import Path

import yaml

from src.db import connect, copy_rows, delete_book_content
from src.markdown.parser import extract_markdown
from src.settings import load_settings

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
WORDS_PER_MINUTE = 200
LANGS = ["es", "fr", "de", "it", "ru", "zh", "ja", "tr", "ar"]

_FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?\n)---\s*\n?", re.DOTALL)


def _read_extra_frontmatter(md_path: Path) -> dict:
    """extract_markdown()'ın es geçtiği alanları (target_language,
    genres, themes) ayrıca okur -- parser'ı değiştirmeden."""
    raw = md_path.read_text(encoding="utf-8")
    match = _FRONTMATTER_RE.match(raw)
    if not match:
        return {}
    return yaml.safe_load(match.group(1)) or {}


def _slug_from_filename(path: Path) -> str:
    # "a1-el-gato-perdido.md" -> "el-gato-perdido-es-a1" (dil+seviye
    # sonek -- aynı hikâye ADI farklı dillerde/seviyelerde çakışmasın).
    stem = path.stem
    if "-" in stem and stem.split("-", 1)[0] in ("a1", "a2", "b1", "b2"):
        level, rest = stem.split("-", 1)
        return rest, level
    return stem, None


def publish_file(conn, md_path: Path, lang: str) -> str:
    extra = _read_extra_frontmatter(md_path)
    target_language = extra.get("target_language", lang)
    genres = extra.get("genres") or []
    themes = extra.get("themes") or []
    generation_prompt_version = extra.get("generation_prompt_version")

    slug_base, level_from_filename = _slug_from_filename(md_path)
    book = extract_markdown(str(md_path), slug=f"{slug_base}-{lang}")
    meta = book.meta
    target_level = meta.target_level or level_from_filename

    story_sections = [s for s in book.sections if not s.is_frontmatter]
    total_words = sum(len(p.text.split()) for s in story_sections for p in s.paragraphs)
    all_sentence_lengths: list[int] = []
    for s in story_sections:
        for p in s.paragraphs:
            for sent in re.split(r"(?<=[.!?。！？؟])\s+", p.text):
                n = len(sent.split())
                if n:
                    all_sentence_lengths.append(n)
    avg_sentence = (
        sum(all_sentence_lengths) / len(all_sentence_lengths) if all_sentence_lengths else None
    )
    max_sentence = max(all_sentence_lengths) if all_sentence_lengths else None
    estimated_minutes = round(total_words / WORDS_PER_MINUTE) if total_words else 0

    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into public.books (
                  slug, title, author, source, license, content_type,
                  is_adaptation, is_original, cefr_level, target_level,
                  target_language, word_count, avg_sentence_length,
                  max_sentence_length, estimated_minutes, genres, themes,
                  status, generation_prompt_version, published_at
                ) values (
                  %(slug)s, %(title)s, %(author)s, 'original', 'proprietary',
                  'short_story', false, true, %(cefr_level)s, %(target_level)s,
                  %(target_language)s, %(word_count)s, %(avg_sentence_length)s,
                  %(max_sentence_length)s, %(estimated_minutes)s, %(genres)s,
                  %(themes)s, 'published', %(generation_prompt_version)s, now()
                )
                on conflict (slug) do update set
                  title = excluded.title,
                  author = excluded.author,
                  cefr_level = excluded.cefr_level,
                  target_level = excluded.target_level,
                  target_language = excluded.target_language,
                  word_count = excluded.word_count,
                  avg_sentence_length = excluded.avg_sentence_length,
                  max_sentence_length = excluded.max_sentence_length,
                  estimated_minutes = excluded.estimated_minutes,
                  genres = excluded.genres,
                  themes = excluded.themes,
                  status = excluded.status,
                  generation_prompt_version = excluded.generation_prompt_version,
                  updated_at = now()
                returning id
                """,
                {
                    "slug": meta.slug,
                    "title": meta.title,
                    "author": meta.author,
                    "cefr_level": target_level,
                    "target_level": target_level,
                    "target_language": target_language,
                    "word_count": total_words,
                    "avg_sentence_length": avg_sentence,
                    "max_sentence_length": max_sentence,
                    "estimated_minutes": estimated_minutes,
                    "genres": genres,
                    "themes": themes,
                    "generation_prompt_version": generation_prompt_version,
                },
            )
            row = cur.fetchone()
            if row is None:
                raise RuntimeError(f"'{meta.slug}' için INSERT ... RETURNING id satır dönmedi")
            book_id = str(row[0])

        delete_book_content(conn, book_id)

        section_rows = []
        paragraph_rows = []
        for section in story_sections:
            section_id = str(uuid.uuid4())
            word_count = sum(len(p.text.split()) for p in section.paragraphs)
            section_rows.append(
                (
                    section_id,
                    book_id,
                    section.order_index,
                    section.title,
                    section.kind,
                    word_count,
                    round(word_count / WORDS_PER_MINUTE) if word_count else 0,
                )
            )
            for paragraph in section.paragraphs:
                paragraph_rows.append(
                    (str(uuid.uuid4()), section_id, paragraph.order_index, paragraph.text)
                )

        copy_rows(
            conn,
            "public.book_sections",
            ["id", "book_id", "order_index", "title", "kind", "word_count", "estimated_minutes"],
            section_rows,
        )
        copy_rows(
            conn,
            "public.book_paragraphs",
            ["id", "section_id", "order_index", "text"],
            paragraph_rows,
        )

    return book_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True, choices=[*LANGS, "all"])
    args = parser.parse_args()

    langs = LANGS if args.lang == "all" else [args.lang]
    settings = load_settings()

    with connect(settings.database_url) as conn:
        for lang in langs:
            stories_dir = PIPELINE_ROOT / f"stories_{lang}"
            if not stories_dir.exists():
                print(f"[{lang}] stories_{lang}/ yok, atlanıyor.")
                continue
            md_files = sorted(stories_dir.glob("*.md"))
            print(f"[{lang}] {len(md_files)} dosya bulundu.")
            for md_path in md_files:
                try:
                    book_id = publish_file(conn, md_path, lang)
                    print(f"  {md_path.name} -> {book_id}")
                except Exception as exc:  # noqa: BLE001 -- toplu işlemde bir dosya patlarsa devam et
                    print(f"  {md_path.name} -> HATA: {exc}")


if __name__ == "__main__":
    main()
