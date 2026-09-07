from __future__ import annotations

from src.models import BookMetrics, SentenceLengthStats
from src.validator import load_thresholds, validate_author_death_year, validate_book


def _make_metrics(
    level: str = "B1",
    coverage: float = 96.0,
    avg_sentence: float = 15.0,
    max_sentence: int = 30,
    off_list_ratio: float = 2.0,
    dialect_ratio: float = 1.0,
) -> BookMetrics:
    cumulative = {
        "A1": coverage,
        "A2": coverage,
        "B1": coverage,
        "B2": coverage,
        "C1": coverage,
        "C2": coverage,
    }
    return BookMetrics(
        word_count=10000,
        sentence_count=500,
        paragraph_count=200,
        unique_lemma_count=1500,
        ttr=0.15,
        sentence_length=SentenceLengthStats(
            mean=avg_sentence, median=avg_sentence, p90=avg_sentence * 1.5, max=max_sentence
        ),
        cefr_distribution={lvl: 0.0 for lvl in cumulative},
        cumulative_coverage=cumulative,
        off_list_ratio=off_list_ratio,
        dialect_ratio=dialect_ratio,
        dialogue_ratio=10.0,
        archaic_ratio=0.0,
        inferred_level=level,
        lemma_counts={},
        lemma_pos={},
        lemma_levels={},
    )


def test_passing_b1_book():
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B1", coverage=96.0, avg_sentence=15.0, max_sentence=30)
    result = validate_book(metrics, thresholds, "B1")
    assert result.passed
    assert result.reasons == []


def test_avg_sentence_too_long_for_a2():
    thresholds = load_thresholds()
    metrics = _make_metrics(level="A2", coverage=96.0, avg_sentence=20.0, max_sentence=22)
    result = validate_book(metrics, thresholds, "A2")
    assert not result.passed
    assert any("ortalama cümle" in r for r in result.reasons)


def test_max_sentence_too_long_for_b1():
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B1", coverage=96.0, avg_sentence=15.0, max_sentence=60)
    result = validate_book(metrics, thresholds, "B1")
    assert not result.passed
    assert any("maksimum cümle" in r for r in result.reasons)


def test_coverage_too_low():
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B1", coverage=80.0, avg_sentence=15.0, max_sentence=30)
    result = validate_book(metrics, thresholds, "B1")
    assert not result.passed
    assert any("kapsam" in r for r in result.reasons)


def test_off_list_ratio_too_high():
    thresholds = load_thresholds()
    metrics = _make_metrics(off_list_ratio=7.0)
    result = validate_book(metrics, thresholds, "B1")
    assert not result.passed
    assert any("off_list_ratio" in r for r in result.reasons)


def test_dialect_ratio_soft_reject_between_3_and_8_percent():
    thresholds = load_thresholds()
    metrics = _make_metrics(dialect_ratio=5.0)
    result = validate_book(metrics, thresholds, "B1")
    assert not result.passed
    assert not result.auto_rejected
    assert any("dialect_ratio" in r for r in result.reasons)


def test_dialect_ratio_auto_reject_above_8_percent():
    thresholds = load_thresholds()
    metrics = _make_metrics(dialect_ratio=9.0, avg_sentence=11.0, max_sentence=20, coverage=96.0)
    result = validate_book(metrics, thresholds, "A2")
    assert not result.passed
    assert result.auto_rejected


def test_c1_level_has_no_sentence_length_ceiling():
    thresholds = load_thresholds()
    # C1/C2 threshold entries yok -> sadece ortak eşikler uygulanır.
    metrics = _make_metrics(level="C1", coverage=90.0, avg_sentence=30.0, max_sentence=80)
    result = validate_book(metrics, thresholds, "C1")
    assert result.passed


def test_author_death_year_missing_rejects():
    thresholds = load_thresholds()
    reasons = validate_author_death_year(None, thresholds)
    assert reasons
    assert "belirlenemedi" in reasons[0]


def test_author_death_year_after_1956_rejects():
    thresholds = load_thresholds()
    reasons = validate_author_death_year(1980, thresholds)
    assert reasons
    assert "public domain değil" in reasons[0]


def test_author_death_year_before_1956_passes():
    thresholds = load_thresholds()
    reasons = validate_author_death_year(1900, thresholds)
    assert reasons == []


def test_adaptation_off_list_ratio_rejects_at_default():
    # is_adaptation=True varsayılan
    thresholds = load_thresholds()
    metrics = _make_metrics(off_list_ratio=7.0)
    result = validate_book(metrics, thresholds, "B1", is_adaptation=True)
    assert not result.passed
    assert any("off_list_ratio" in r for r in result.reasons)
    assert result.warnings == []


def test_raw_text_off_list_ratio_below_warn_band_passes_silently():
    """Frankenstein gibi ham bir klasik: %7.65 off_list ne REDDETMELİ ne
    de uyarmalı — ham metin uyarı bandı %8-12 arası, %7.65 bunun
    altında. countenance/wretch/vengeance/hovel gibi kelimeler doğal
    olarak liste dışıdır, kalite kusuru değildir."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="C1", coverage=90.0, off_list_ratio=7.65)
    result = validate_book(metrics, thresholds, "C1", is_adaptation=False)
    assert result.passed
    assert result.reasons == []
    assert result.warnings == []


def test_raw_text_off_list_ratio_in_warn_band_warns_but_passes():
    """%8-12 arası: "yüksek ama kabul edilebilir" — geçer ama uyarır."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="C1", coverage=90.0, off_list_ratio=9.5)
    result = validate_book(metrics, thresholds, "C1", is_adaptation=False)
    assert result.passed
    assert result.reasons == []
    assert any("off_list_ratio" in w for w in result.warnings)


def test_raw_text_off_list_ratio_still_rejects_above_raw_ceiling():
    """%20 off-list demek her 5 kelimeden biri sözlükte yok demek —
    bozuk parse veya okunamayacak kadar zor bir metin işareti, güvenlik
    ağı devreye girip REDDEDER (sadece uyarmaz)."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="C1", coverage=90.0, off_list_ratio=20.0)
    result = validate_book(metrics, thresholds, "C1", is_adaptation=False)
    assert not result.passed
    assert any("off_list_ratio" in r for r in result.reasons)


def test_raw_text_dialect_ratio_still_rejects_strictly():
    """dialect_ratio kuralı is_adaptation'dan etkilenmemeli — doğruluk
    meselesi, kalite tercihi değil."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="C1", coverage=90.0, dialect_ratio=5.0)
    result = validate_book(metrics, thresholds, "C1", is_adaptation=False)
    assert not result.passed
    assert any("dialect_ratio" in r for r in result.reasons)


def test_raw_text_ignores_coverage_and_sentence_length_entirely():
    """DÖNGÜSEL HATA REGRESYONU: ham metinde (is_adaptation=False) kapsam
    ve cümle uzunluğu KABUL kriteri değildir — sadece seviye tespitinin
    girdisiydi. Call of the Wild gibi bir kitap B2 olarak tespit edilip,
    B2'nin %95 kapsam / 60 kelimelik cümle KABUL eşiklerine göre test
    edilirse yanlışlıkla reddedilirdi (hiçbir ham klasik %95 kapsama
    ulaşmaz). Bu testte kapsam kasıtlı olarak çok düşük (%50) ve maksimum
    cümle kasıtlı olarak çok uzun (105 kelime, B2'nin izin verdiği 60'ın
    üzerinde) — is_adaptation=False'ta bunlar RED SEBEBİ OLMAMALI."""
    thresholds = load_thresholds()
    metrics = _make_metrics(
        level="B2", coverage=50.0, avg_sentence=30.0, max_sentence=105, off_list_ratio=8.11
    )
    result = validate_book(metrics, thresholds, "B2", is_adaptation=False)
    assert result.passed, f"beklenmeyen red sebepleri: {result.reasons}"
    assert not any("kapsam" in r for r in result.reasons)
    assert not any("cümle" in r for r in result.reasons)


def test_adaptation_mode_still_enforces_coverage_and_sentence_length():
    """is_adaptation=True'da yapısal eşikler HÂLÂ uygulanmalı — sadece
    is_adaptation=False'ta devre dışı bırakıldığını doğrulayan karşıt
    test (regresyonun tersini de kontrol eder)."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B2", coverage=50.0, avg_sentence=30.0, max_sentence=105)
    result = validate_book(metrics, thresholds, "B2", is_adaptation=True)
    assert not result.passed
    assert any("kapsam" in r for r in result.reasons)
    assert any("cümle" in r for r in result.reasons)


def test_raw_text_empty_word_count_rejects():
    """Ham metin modunda kapsam/cümle-uzunluğu yerine kontrol edilen tek
    yapısal şey: parse'ın gerçekten bir şey ürettiği (word_count>0,
    paragraph_count>0) — boş/bozuk bir parse'ı sessizce geçirmemek için."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B2", coverage=90.0)
    metrics.word_count = 0
    result = validate_book(metrics, thresholds, "B2", is_adaptation=False)
    assert not result.passed
    assert any("word_count" in r for r in result.reasons)


def test_raw_text_empty_paragraph_count_rejects():
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B2", coverage=90.0)
    metrics.paragraph_count = 0
    result = validate_book(metrics, thresholds, "B2", is_adaptation=False)
    assert not result.passed
    assert any("paragraph_count" in r for r in result.reasons)


def test_min_total_word_count_floor_rejects_regardless_of_ratio():
    """Mutlak taban (thresholds.yaml common.min_total_word_count): oran
    kontrolünden bağımsız bir güvenlik ağı. word_count 3000'in altındaysa
    XHTML boyutu ne olursa olsun reddedilir."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B1", coverage=96.0)
    metrics.word_count = 2000
    result = validate_book(metrics, thresholds, "B1", is_adaptation=False, total_xhtml_bytes=1)
    assert not result.passed
    assert any("mutlak taban" in r for r in result.reasons)


def test_word_count_far_below_xhtml_size_rejects():
    """Sağlık kontrolü: kelime sayısı EPUB'ın sıkıştırılmamış XHTML
    boyutuna göre çok düşükse (bkz. Lady Windermere's Fan bug'ı —
    <table> tabanlı oyun diyaloğu <p>-only selector'ünce atlanıyordu)
    reddedilmeli, "oran" kelimesini içeren bir sebep dönmeli."""
    thresholds = load_thresholds()
    # 500,000 byte XHTML ~ 50,000 kelime beklenir (1000 kelime / 10KB
    # kuralı) ama sadece 4000 kelime çıkarılmış -> oransal red.
    metrics = _make_metrics(level="B1", coverage=96.0)
    metrics.word_count = 4000
    result = validate_book(
        metrics, thresholds, "B1", is_adaptation=False, total_xhtml_bytes=500_000
    )
    assert not result.passed
    assert any("XHTML boyutuna göre" in r for r in result.reasons)


def test_word_count_matching_xhtml_size_passes_ratio_check():
    """Kelime sayısı dosya boyutuyla makul oranda ise oran kontrolü
    reddetmemeli."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B1", coverage=96.0)
    metrics.word_count = 10000
    result = validate_book(
        metrics, thresholds, "B1", is_adaptation=False, total_xhtml_bytes=50_000
    )
    assert not any("XHTML boyutuna göre" in r for r in result.reasons)


def test_total_xhtml_bytes_none_skips_ratio_check():
    """total_xhtml_bytes verilmezse (ör. eski cache'lenmiş ExtractedBook)
    oran kontrolü sessizce atlanır — sadece mutlak taban uygulanır."""
    thresholds = load_thresholds()
    metrics = _make_metrics(level="B1", coverage=96.0)
    metrics.word_count = 5000
    result = validate_book(metrics, thresholds, "B1", is_adaptation=False)
    assert not any("XHTML boyutuna göre" in r for r in result.reasons)


def test_call_of_the_wild_like_raw_book_passes():
    """Call of the Wild referans senaryosu: B2 tespit edilmiş, off_list
    %8.11 (raw ceiling %12'nin altında, warn bandı %8-12 içinde bir
    uyarı üretir ama reddetmez), kapsam/cümle uzunluğu B2 kabul
    eşiklerinin dışında olsa bile (ham metin, adapte değil) GEÇMELİ."""
    thresholds = load_thresholds()
    metrics = _make_metrics(
        level="B2", coverage=90.72, avg_sentence=24.0, max_sentence=105, off_list_ratio=8.11,
        dialect_ratio=0.5,
    )
    result = validate_book(metrics, thresholds, "B2", is_adaptation=False)
    assert result.passed, f"beklenmeyen red sebepleri: {result.reasons}"
