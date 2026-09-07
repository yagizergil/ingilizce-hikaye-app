"""Task 3 (STRICT doğrulama modu, is_original=True) + Task 6.1/6.2
testleri.

6.1: parse -> extract -> profile -> validate -> publish uçtan uca,
gerçek bir A2 fixture'ıyla (sample_story_a2.md) BAŞARILI olmalı.

6.2: hedef seviye A2 ama kelime dağarcığı açıkça B1+ olan bir kitap
validate_book tarafından REDDEDİLMELİ, top_overlevel_words dolu ve
sıklığa göre azalan sırada olmalı. Burada gerçek bir spaCy/CEFR sözlük
çalıştırması yerine (yavaş, ve "açıkça B1+" durumunu güvenilir şekilde
üretmek fixture metniyle kırılgan olurdu) doğrudan BookMetrics mock'lanıyor
— profiler.py'nin kendi doğruluğu zaten test_profiler.py'de ayrıca test
ediliyor, burada sadece validator.py'nin STRICT dalının reddetme +
raporlama mantığı test ediliyor."""

from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from src.markdown.parser import extract_markdown
from src.models import BookMetrics, SentenceLengthStats
from src.profiler import compute_metrics
from src.publish import publish_book
from src.validator import load_thresholds, validate_book

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_sample_story_a2_end_to_end_extract_profile_validate_publish(
    cefr_vocab, norm_maps, nlp
):
    """6.1: gerçek fixture, gerçek spaCy/CEFR pipeline'ı, gerçek (fake DB
    ile) publish çağrısı — status='published' ile bitmeli."""
    book = extract_markdown(str(FIXTURES_DIR / "sample_story_a2.md"), "sample-story-a2")
    thresholds = load_thresholds()

    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp, thresholds)

    result = validate_book(
        metrics,
        thresholds,
        book.meta.target_level,
        is_adaptation=book.meta.is_adaptation,
        total_xhtml_bytes=book.total_xhtml_bytes,
        content_type=book.meta.content_type,
        is_original=True,
    )
    assert result.passed, f"beklenmeyen red sebepleri: {result.reasons}"

    # publish_book'a gerçek DB gerekmiyor — test_publish.py'deki fake
    # connection deseniyle aynı (COPY/execute/transaction no-op'ları).
    conn = _FakeConnection()
    conn.cursor_obj.fetchall_return = []  # hiç lemma gloss'u yok -> needs_review olabilir
    publish_result = publish_book(  # type: ignore[arg-type]
        conn, book, metrics, result, cover_url=None, force=True
    )
    # force=True: lemma tr_gloss önkoşulu atlanır, sadece validation.passed
    # status'u belirler -> published.
    assert publish_result.status == "published"
    assert publish_result.section_count == 2
    assert publish_result.paragraph_count == 4


def _overlevel_metrics() -> BookMetrics:
    """A2 hedefiyle ama açıkça B1/B2 kelime dağarcığıyla bir kitabı
    simüle eder: kapsam A2'de %95'in altında, ort./max cümle A2 tavanının
    üzerinde, birkaç B1/B2 lemma sık geçiyor."""
    cumulative = {"A1": 40.0, "A2": 60.0, "B1": 85.0, "B2": 96.0, "C1": 99.0, "C2": 100.0}
    lemma_counts = {
        "cat": 20,
        "dog": 15,
        "philosophical": 12,  # B2
        "endeavor": 9,  # B2
        "melancholy": 7,  # C1
        "ubiquitous": 3,  # C1
        "run": 30,
    }
    lemma_levels: dict[str, str | None] = {
        "cat": "A1",
        "dog": "A1",
        "philosophical": "B2",
        "endeavor": "B2",
        "melancholy": "C1",
        "ubiquitous": "C1",
        "run": "A1",
    }
    return BookMetrics(
        word_count=500,
        sentence_count=40,
        paragraph_count=15,
        unique_lemma_count=len(lemma_counts),
        ttr=0.3,
        sentence_length=SentenceLengthStats(mean=18.0, median=17.0, p90=24.0, max=30),
        cefr_distribution={lvl: 0.0 for lvl in cumulative},
        cumulative_coverage=cumulative,
        off_list_ratio=1.0,
        dialect_ratio=0.0,
        dialogue_ratio=0.0,
        archaic_ratio=0.0,
        inferred_level="B1",
        lemma_counts=lemma_counts,
        lemma_pos={},
        lemma_levels=lemma_levels,
    )


def test_a2_target_with_b1_plus_vocabulary_is_rejected():
    thresholds = load_thresholds()
    metrics = _overlevel_metrics()

    result = validate_book(
        metrics, thresholds, "A2", is_adaptation=False, is_original=True
    )

    assert not result.passed
    assert any("kapsam" in r for r in result.reasons)
    assert any("ortalama cümle" in r for r in result.reasons)


def test_top_overlevel_words_populated_and_sorted_by_frequency():
    thresholds = load_thresholds()
    metrics = _overlevel_metrics()

    result = validate_book(
        metrics, thresholds, "A2", is_adaptation=False, is_original=True
    )

    words = result.top_overlevel_words
    assert words, "A2 hedefinin üzerindeki kelimeler listesi boş olmamalı"
    # Sadece A2'nin ÜZERİNDEKİ (B2/C1) kelimeler olmalı — A1 kelimeler
    # (cat/dog/run) burada YOK.
    lemmas = [w[0] for w in words]
    assert "cat" not in lemmas and "dog" not in lemmas and "run" not in lemmas
    assert "philosophical" in lemmas and "melancholy" in lemmas

    counts = [w[2] for w in words]
    assert counts == sorted(counts, reverse=True)
    # En sık over-level kelime philosophical (12x) en başta olmalı.
    assert words[0][0] == "philosophical"
    assert words[0][1] == "B2"
    assert words[0][2] == 12


class _FakeCopy:
    def write_row(self, row: tuple) -> None:
        pass

    def __enter__(self) -> _FakeCopy:
        return self

    def __exit__(self, *exc: object) -> None:
        return None


class _FakeCursor:
    def __init__(self) -> None:
        self.copies: list[_FakeCopy] = []
        self.fetchall_return: list[tuple] = []

    def execute(self, query: str, params: object = None) -> None:
        pass

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
