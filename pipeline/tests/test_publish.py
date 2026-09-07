from __future__ import annotations

from contextlib import contextmanager

from src.models import (
    BookMeta,
    BookMetrics,
    ExtractedBook,
    ParagraphData,
    SectionData,
    SentenceLengthStats,
)
from src.publish import publish_book
from src.validator import ValidationResult


def _metrics() -> BookMetrics:
    return BookMetrics(
        word_count=10,
        sentence_count=2,
        paragraph_count=2,
        unique_lemma_count=5,
        ttr=0.5,
        sentence_length=SentenceLengthStats(mean=5.0, median=5.0, p90=5.0, max=5),
        cefr_distribution={lvl: 0.0 for lvl in ("A1", "A2", "B1", "B2", "C1", "C2")},
        cumulative_coverage={lvl: 0.0 for lvl in ("A1", "A2", "B1", "B2", "C1", "C2")},
        off_list_ratio=0.0,
        dialect_ratio=0.0,
        dialogue_ratio=0.0,
        archaic_ratio=0.0,
        inferred_level="B1",
        lemma_counts={},
        lemma_pos={},
        lemma_levels={},
    )


def _book_with_frontmatter_and_story() -> ExtractedBook:
    frontmatter = SectionData(
        order_index=0,
        title="Introduction",
        kind="part",
        is_frontmatter=True,
        paragraphs=[ParagraphData(order_index=0, text="Frontmatter paragraph.")],
    )
    story = SectionData(
        order_index=1,
        title="Chapter 1",
        kind="chapter",
        is_frontmatter=False,
        paragraphs=[ParagraphData(order_index=0, text="Story paragraph one.")],
    )
    meta = BookMeta(
        slug="test-book",
        title="Test Book",
        subtitle=None,
        author="Test Author",
        author_file_as=None,
        author_death_year=1900,
        source="test",
        source_url=None,
        license=None,
        license_text=None,
        content_type="novel",
        cover_image_bytes=None,
        cover_image_ext=None,
    )
    return ExtractedBook(meta=meta, sections=[frontmatter, story])


class _FakeCopy:
    def __init__(self) -> None:
        self.rows: list[tuple] = []

    def write_row(self, row: tuple) -> None:
        self.rows.append(row)

    def __enter__(self) -> _FakeCopy:
        return self

    def __exit__(self, *exc: object) -> None:
        return None


class _FakeCursor:
    def __init__(self) -> None:
        self.executed: list[str] = []
        self.copies: list[_FakeCopy] = []
        # get_lemmas_with_gloss'un fetchall() çağrısının ne döneceğini
        # test başına ayarlamak için — varsayılan boş (hiç gloss yok).
        self.fetchall_return: list[tuple] = []

    def execute(self, query: str, params: object = None) -> None:
        self.executed.append(query)

    def fetchone(self) -> tuple:
        return ("00000000-0000-0000-0000-000000000000",)

    def fetchall(self) -> list[tuple]:
        return self.fetchall_return

    def copy(self, query: str) -> _FakeCopy:
        fake = _FakeCopy()
        self.copies.append(fake)
        return fake

    def __enter__(self) -> _FakeCursor:
        return self

    def __exit__(self, *exc: object) -> None:
        return None


class _FakeConnection:
    def __init__(self) -> None:
        self.cursor_obj = _FakeCursor()

    def cursor(self) -> _FakeCursor:
        return self.cursor_obj

    def execute(self, query: str) -> None:
        pass

    @contextmanager
    def transaction(self):
        yield None


def test_publish_book_excludes_frontmatter_sections() -> None:
    conn = _FakeConnection()
    book = _book_with_frontmatter_and_story()
    validation = ValidationResult(passed=True, level="B1", reasons=[], auto_rejected=False)

    result = publish_book(  # type: ignore[arg-type]
        conn, book, _metrics(), validation, cover_url=None
    )

    # 2 section verildi (1 frontmatter + 1 story), sadece 1 yazılmalı.
    assert result.section_count == 1
    assert result.paragraph_count == 1

    # book_sections COPY'sine yazılan satırlarda frontmatter yok.
    section_copy = conn.cursor_obj.copies[0]
    assert len(section_copy.rows) == 1
    assert section_copy.rows[0][3] == "Chapter 1"  # title kolonu


def _metrics_with_lemmas() -> BookMetrics:
    metrics = _metrics()
    metrics.lemma_counts = {"apple": 3, "banana": 2}
    metrics.lemma_pos = {"apple": "noun", "banana": "noun"}
    return metrics


def test_publish_marks_needs_review_when_lemma_gloss_coverage_low() -> None:
    """Gerçek olay: lemmas aşaması hiç çalıştırılmadan kitap published
    oldu, uygulamada kelimeye dokunma çalışmadı. Artık lemma tr_gloss
    kapsamı %98'in altındaysa validation.passed=True olsa bile
    status='needs_review' yazılmalı."""
    conn = _FakeConnection()
    conn.cursor_obj.fetchall_return = []  # hiçbir lemma'nın gloss'u yok
    book = _book_with_frontmatter_and_story()
    validation = ValidationResult(passed=True, level="B1", reasons=[], auto_rejected=False)

    result = publish_book(  # type: ignore[arg-type]
        conn, book, _metrics_with_lemmas(), validation, cover_url=None
    )

    assert result.status == "needs_review"
    assert result.lemma_gloss_coverage == 0.0
    assert result.missing_gloss_count == 2


def test_publish_force_skips_lemma_gloss_precondition() -> None:
    """--force ile kapsam kontrolü atlanır (geliştirme için) — ama
    validation.passed hâlâ status'u belirlemeye devam eder."""
    conn = _FakeConnection()
    conn.cursor_obj.fetchall_return = []
    book = _book_with_frontmatter_and_story()
    validation = ValidationResult(passed=True, level="B1", reasons=[], auto_rejected=False)

    result = publish_book(  # type: ignore[arg-type]
        conn, book, _metrics_with_lemmas(), validation, cover_url=None, force=True
    )

    assert result.status == "published"
    assert result.lemma_gloss_coverage == 0.0  # raporlama hâlâ doğru, sadece kısıt atlandı


def test_publish_full_lemma_gloss_coverage_allows_published() -> None:
    conn = _FakeConnection()
    conn.cursor_obj.fetchall_return = [("apple", "noun"), ("banana", "noun")]
    book = _book_with_frontmatter_and_story()
    validation = ValidationResult(passed=True, level="B1", reasons=[], auto_rejected=False)

    result = publish_book(  # type: ignore[arg-type]
        conn, book, _metrics_with_lemmas(), validation, cover_url=None
    )

    assert result.status == "published"
    assert result.lemma_gloss_coverage == 100.0
    assert result.missing_gloss_count == 0
