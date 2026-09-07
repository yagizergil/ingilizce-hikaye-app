"""Tek transaction, toplu COPY ile yayınlama. Idempotent: aynı slug
tekrar çalıştırılırsa günceller, çift kayıt oluşturmaz."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import psycopg

from src.db import copy_rows, delete_book_content
from src.lemmas import get_lemmas_with_gloss
from src.models import BookMeta, BookMetrics, ExtractedBook
from src.validator import ValidationResult

WORDS_PER_MINUTE = 200
# Kitaptaki (lemma, pos) çiftlerinin en az bu oranı lemmas tablosunda
# dolu bir tr_gloss'a sahip olmalı, aksi halde status='published'
# YAZILMAZ — aksi takdirde kitap "yayında" görünür ama uygulamada
# kelimeye dokunma çoğu kelimede çalışmaz (bkz. gerçek olay: lemmas
# aşaması hiç çalıştırılmadan Frankenstein published oldu).
LEMMA_GLOSS_COVERAGE_THRESHOLD = 98.0


@dataclass
class PublishResult:
    book_id: str
    status: str
    section_count: int
    paragraph_count: int
    lemma_count: int
    lemma_gloss_coverage: float
    missing_gloss_count: int
    new_series_slug: str | None = None


def _check_lemma_gloss_coverage(
    conn: psycopg.Connection, metrics: BookMetrics
) -> tuple[float, int, int]:
    """Döner: (kapsam_yüzdesi, eksik_sayısı, toplam_lemma_sayısı)."""
    candidates = sorted(
        {(lemma, metrics.lemma_pos.get(lemma, "noun")) for lemma in metrics.lemma_counts}
    )
    if not candidates:
        return 100.0, 0, 0
    with_gloss = get_lemmas_with_gloss(conn, candidates)
    total = len(candidates)
    missing = total - len(with_gloss)
    coverage = len(with_gloss) / total * 100
    return coverage, missing, total


def _upsert_book(
    conn: psycopg.Connection,
    meta: BookMeta,
    metrics: BookMetrics,
    status: str,
    cover_url: str | None,
) -> tuple[str, str]:
    estimated_minutes = round(metrics.word_count / WORDS_PER_MINUTE) if metrics.word_count else 0

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.books (
              slug, title, subtitle, author, author_death_year, source, source_url,
              license, license_text, content_type, is_adaptation, cover_url,
              cefr_level, word_count, unique_lemma_count, avg_sentence_length,
              max_sentence_length, coverage_a1, coverage_a2, coverage_b1, coverage_b2,
              coverage_c1, coverage_c2, off_list_ratio, dialect_ratio, dialogue_ratio,
              archaic_ratio, estimated_minutes, status, is_original, target_level,
              generation_prompt_version, published_at
            ) values (
              %(slug)s, %(title)s, %(subtitle)s, %(author)s, %(author_death_year)s,
              %(source)s, %(source_url)s, %(license)s, %(license_text)s, %(content_type)s,
              %(is_adaptation)s, %(cover_url)s, %(cefr_level)s, %(word_count)s,
              %(unique_lemma_count)s, %(avg_sentence_length)s, %(max_sentence_length)s,
              %(coverage_a1)s, %(coverage_a2)s, %(coverage_b1)s, %(coverage_b2)s,
              %(coverage_c1)s, %(coverage_c2)s, %(off_list_ratio)s, %(dialect_ratio)s,
              %(dialogue_ratio)s, %(archaic_ratio)s, %(estimated_minutes)s, %(status)s,
              %(is_original)s, %(target_level)s, %(generation_prompt_version)s,
              case when %(status)s = 'published' then now() else null end
            )
            on conflict (slug) do update set
              title = excluded.title,
              subtitle = excluded.subtitle,
              author = excluded.author,
              author_death_year = excluded.author_death_year,
              source = excluded.source,
              source_url = excluded.source_url,
              license = excluded.license,
              license_text = excluded.license_text,
              content_type = excluded.content_type,
              is_adaptation = excluded.is_adaptation,
              cover_url = coalesce(excluded.cover_url, public.books.cover_url),
              cefr_level = excluded.cefr_level,
              word_count = excluded.word_count,
              unique_lemma_count = excluded.unique_lemma_count,
              avg_sentence_length = excluded.avg_sentence_length,
              max_sentence_length = excluded.max_sentence_length,
              coverage_a1 = excluded.coverage_a1,
              coverage_a2 = excluded.coverage_a2,
              coverage_b1 = excluded.coverage_b1,
              coverage_b2 = excluded.coverage_b2,
              coverage_c1 = excluded.coverage_c1,
              coverage_c2 = excluded.coverage_c2,
              off_list_ratio = excluded.off_list_ratio,
              dialect_ratio = excluded.dialect_ratio,
              dialogue_ratio = excluded.dialogue_ratio,
              archaic_ratio = excluded.archaic_ratio,
              estimated_minutes = excluded.estimated_minutes,
              status = excluded.status,
              is_original = excluded.is_original,
              target_level = excluded.target_level,
              generation_prompt_version = excluded.generation_prompt_version,
              published_at = case
                when excluded.status = 'published' and public.books.published_at is null
                then now()
                else public.books.published_at
              end,
              updated_at = now()
            returning id
            """,
            {
                "slug": meta.slug,
                "title": meta.title,
                "subtitle": meta.subtitle,
                "author": meta.author,
                "author_death_year": meta.author_death_year,
                "source": meta.source,
                "source_url": meta.source_url,
                "license": meta.license,
                "license_text": meta.license_text,
                "content_type": meta.content_type,
                "is_adaptation": meta.is_adaptation,
                "cover_url": cover_url,
                "cefr_level": metrics.inferred_level,
                "word_count": metrics.word_count,
                "unique_lemma_count": metrics.unique_lemma_count,
                "avg_sentence_length": metrics.sentence_length.mean,
                "max_sentence_length": metrics.sentence_length.max,
                "coverage_a1": metrics.cefr_distribution.get("A1", 0.0),
                "coverage_a2": metrics.cefr_distribution.get("A2", 0.0),
                "coverage_b1": metrics.cefr_distribution.get("B1", 0.0),
                "coverage_b2": metrics.cefr_distribution.get("B2", 0.0),
                "coverage_c1": metrics.cefr_distribution.get("C1", 0.0),
                "coverage_c2": metrics.cefr_distribution.get("C2", 0.0),
                "off_list_ratio": metrics.off_list_ratio,
                "dialect_ratio": metrics.dialect_ratio,
                "dialogue_ratio": metrics.dialogue_ratio,
                "archaic_ratio": metrics.archaic_ratio,
                "estimated_minutes": estimated_minutes,
                "status": status,
                "is_original": meta.is_original,
                "target_level": meta.target_level,
                "generation_prompt_version": meta.generation_prompt_version,
            },
        )
        row = cur.fetchone()
        if row is None:
            # INSERT ... ON CONFLICT ... RETURNING id her zaman tam bir
            # satır döner — buraya düşmek Postgres/psycopg tarafında
            # beklenmeyen bir durum demektir, sessizce yutulmamalı.
            raise RuntimeError(
                f"'{meta.slug}' için INSERT ... RETURNING id hiç satır döndürmedi"
            )
        book_id = row[0]
    return str(book_id), status


def publish_book(
    conn: psycopg.Connection,
    book: ExtractedBook,
    metrics: BookMetrics,
    validation: ValidationResult,
    cover_url: str | None,
    force: bool = False,
) -> PublishResult:
    """force=True: lemma tr_gloss kapsam önkoşulunu atlar (geliştirme
    içindir) — validation.passed hâlâ status'u belirler, sadece kapsam
    kontrolü devre dışı kalır."""
    with conn.transaction():
        lemma_gloss_coverage, missing_gloss_count, _total = _check_lemma_gloss_coverage(
            conn, metrics
        )
        gloss_ok = force or lemma_gloss_coverage >= LEMMA_GLOSS_COVERAGE_THRESHOLD
        status = "published" if (validation.passed and gloss_ok) else "needs_review"

        book_id, status = _upsert_book(conn, book.meta, metrics, status, cover_url)
        delete_book_content(conn, book_id)

        section_rows: list[tuple[Any, ...]] = []
        paragraph_rows: list[tuple[Any, ...]] = []
        # Frontmatter (introduction/preface/dedication/epigraph/endnotes)
        # metriklerden zaten hariç tutuluyordu (profiler.py) ama publish
        # hâlâ hepsini yazıyordu — 28 gerçek birim yerine 38 section
        # oluşuyordu. book_paragraphs sadece hikaye içeriğini içermeli.
        story_sections = [s for s in book.sections if not s.is_frontmatter]
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
            label="book_sections",
        )
        copy_rows(
            conn,
            "public.book_paragraphs",
            ["id", "section_id", "order_index", "text"],
            paragraph_rows,
            label="book_paragraphs",
        )

        lemma_rows = [
            (book_id, lemma, count) for lemma, count in sorted(metrics.lemma_counts.items())
        ]
        copy_rows(
            conn,
            "public.book_lemmas",
            ["book_id", "lemma", "count"],
            lemma_rows,
            label="book_lemmas",
        )

    new_series_slug = None
    if book.meta.series:
        new_series_slug = link_book_to_series(conn, book_id, book.meta)

    return PublishResult(
        book_id=book_id,
        status=status,
        section_count=len(section_rows),
        paragraph_count=len(paragraph_rows),
        lemma_count=len(lemma_rows),
        lemma_gloss_coverage=lemma_gloss_coverage,
        missing_gloss_count=missing_gloss_count,
        new_series_slug=new_series_slug,
    )


def link_book_to_series(conn: psycopg.Connection, book_id: str, meta: BookMeta) -> str | None:
    """Task 5: markdown frontmatter'ında `series: <slug>` varsa, o slug'la
    bir public.collections satırı bulur (yoksa placeholder i18n key'leriyle
    OLUŞTURUR) ve public.collection_books'a doğru order_index ile ekler.

    order_index 0-INDEKSLİ — mevcut Oz serisi (l-frank-baum-oz-series)
    canlı veride 0,1,2,3,4 olarak saklı (bkz. görev raporu, execute_sql
    doğrulaması). frontmatter'daki `series_index` 1-indeksli olacak
    şekilde yazılması bekleniyor (insan için daha doğal, "1. kitap");
    bu yüzden burada `series_index - 1` kullanılır. `series_index`
    verilmemişse mevcut satır sayısı (yeni kitap serinin SONUNA eklenir)
    kullanılır.

    Placeholder collection oluşturulursa `collections.{slug}.title` /
    `collections.{slug}.description` i18n key'leri YAZILMAZ (Türkçe metni
    UYDURMAK CLAUDE.md'nin i18n kuralına aykırı olurdu) — sadece bir NOT
    stdout'a basılır (bkz. cli.py ingest markdown dalı), insan
    src/i18n/locales/{tr,en}.json'a gerçek metni eklemeli."""
    series_slug = meta.series
    if not series_slug:
        return None

    with conn.cursor() as cur:
        cur.execute("select id from public.collections where slug = %s", (series_slug,))
        row = cur.fetchone()
        collection_id: str
        created = False
        if row is None:
            cur.execute(
                """
                insert into public.collections
                  (slug, title_key, description_key, order_index, is_active)
                values (%s, %s, %s, 0, true)
                returning id
                """,
                (
                    series_slug,
                    f"collections.{series_slug}.title",
                    f"collections.{series_slug}.description",
                ),
            )
            fetched = cur.fetchone()
            if fetched is None:
                raise RuntimeError(f"collections insert '{series_slug}' için satır döndürmedi")
            collection_id = str(fetched[0])
            created = True
        else:
            collection_id = str(row[0])

        if meta.series_index is not None:
            order_index = meta.series_index - 1
        else:
            cur.execute(
                "select count(*) from public.collection_books where collection_id = %s",
                (collection_id,),
            )
            count_row = cur.fetchone()
            order_index = count_row[0] if count_row else 0

        cur.execute(
            """
            insert into public.collection_books (collection_id, book_id, order_index)
            values (%s, %s, %s)
            on conflict (collection_id, book_id) do update set order_index = excluded.order_index
            """,
            (collection_id, book_id, order_index),
        )

    if created:
        return series_slug
    return None
