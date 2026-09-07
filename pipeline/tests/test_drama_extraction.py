"""Oyun (z3998:drama) EPUB extraction testleri — Lady Windermere's Fan
bug'ının regresyonu: eski extract_paragraph_texts sadece <p> aradığı
için Standard Ebooks'un <table> tabanlı oyun diyaloğunun neredeyse
tamamını kaçırıyordu (bkz. epub/cleaner.py extract_drama_paragraph_texts,
epub/parser.py is_drama_body).

pipeline/raw/oscar-wilde-lady-windermeres-fan.epub bu repoda zaten
mevcut (ham içerik önbelleği) — tests/fixtures/ konvansiyonunun aksine
buradaki dosyalar committed DEĞİL ama pipeline/raw/ zaten pipeline'ın
kendi çalışma dizini, testte doğrudan kullanılıyor (fixtures/ altındaki
committed iki kitaptan farklı olarak, mevcutsa çalışır, yoksa skip
eder)."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.epub.parser import extract_epub

RAW_DIR = Path(__file__).parent.parent / "raw"
_LADY_WINDERMERE_PATH = RAW_DIR / "oscar-wilde-lady-windermeres-fan.epub"


@pytest.fixture
def lady_windermere_epub() -> Path:
    if not _LADY_WINDERMERE_PATH.exists():
        pytest.skip(f"{_LADY_WINDERMERE_PATH} yok — pipeline/raw/ önbelleğinde bulunamadı.")
    return _LADY_WINDERMERE_PATH


def test_lady_windermeres_fan_detected_as_play(lady_windermere_epub):
    book = extract_epub(str(lady_windermere_epub), "lady-windermeres-fan")
    assert book.meta.content_type == "play"


def test_lady_windermeres_fan_word_count_reflects_full_dialogue(lady_windermere_epub):
    """Eski <p>-only extraction neredeyse hiçbir diyalog satırı
    yakalamıyordu (act başına tek bir "Scene: ..." paragrafı hariç) —
    bu yüzden kelime sayısı gerçek oyunun (~19-23 bin kelime, dört
    perde) ancak küçük bir kısmı olurdu. Gerçek ölçüm ~19,500 kelime;
    aralık spaCy/normalizasyon farklarına tolerans tanır ama eski
    bug'ın ürettiği (birkaç yüz kelime) değerden KESİNLİKLE çok daha
    yüksek olmalı."""
    book = extract_epub(str(lady_windermere_epub), "lady-windermeres-fan")
    story_sections = [s for s in book.sections if not s.is_frontmatter]
    total_words = sum(len(p.text.split()) for s in story_sections for p in s.paragraphs)
    assert total_words >= 18_000, f"beklenenden çok düşük kelime sayısı: {total_words}"


def test_lady_windermeres_fan_dialogue_rows_formatted_as_speaker_colon_line(
    lady_windermere_epub,
):
    """Diyalog konvansiyonu (bkz. cleaner.py extract_drama_paragraph_texts
    docstring'i): "KONUŞMACI: replik metni" — konuşmacı büyük harf."""
    book = extract_epub(str(lady_windermere_epub), "lady-windermeres-fan")
    story_sections = [s for s in book.sections if not s.is_frontmatter]
    all_paragraphs = [p.text for s in story_sections for p in s.paragraphs]

    assert any(p.startswith("PARKER: ") for p in all_paragraphs)
    assert any(p.startswith("LADY WINDERMERE: ") for p in all_paragraphs)
    # Sahne yönergesi satırları parantez içinde, konuşmacı öneki YOK.
    assert any(p.startswith("(") and p.endswith(")") for p in all_paragraphs)


def test_lady_windermeres_fan_act_titles_extracted(lady_windermere_epub):
    """<h2><span epub:type="se:label">Act</span>
    <span epub:type="z3998:ordinal z3998:roman">I</span></h2> ->
    "Act I" (extract_section_title zaten span birleştirme mantığına
    sahip — burada oyun bölümlerinde de doğru çalıştığı doğrulanıyor)."""
    book = extract_epub(str(lady_windermere_epub), "lady-windermeres-fan")
    titles = [s.title for s in book.sections if s.title]
    assert any((t or "").startswith("Act I") for t in titles)


def test_lady_windermeres_fan_total_xhtml_bytes_tracked(lady_windermere_epub):
    book = extract_epub(str(lady_windermere_epub), "lady-windermeres-fan")
    assert book.total_xhtml_bytes > 0


def test_lady_windermeres_fan_authors(lady_windermere_epub):
    book = extract_epub(str(lady_windermere_epub), "lady-windermeres-fan")
    assert book.meta.all_authors == ["Oscar Wilde"]
