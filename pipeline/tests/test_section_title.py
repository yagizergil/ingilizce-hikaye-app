"""extract_section_title'ın birim testleri (bkz. epub/cleaner.py) —
SORUN 3 regresyonu: eski kod remove_headings_and_notes'tan SONRA h1
arıyordu (o fonksiyon h1-h6'yı zaten silmişti), bu yüzden title her
zaman None dönüyordu. Ayrıca Standard Ebooks çoğunlukla <h2> kullanır,
sadece h1 aramak da tek başına yetersizdi."""

from __future__ import annotations

from lxml import etree

from src.epub.cleaner import extract_section_title, remove_headings_and_notes

_NSMAP = {"x": "http://www.w3.org/1999/xhtml"}


def _body(inner_xml: str) -> etree._Element:
    xml = (
        '<body xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops">' + inner_xml + "</body>"
    )
    return etree.fromstring(xml.encode("utf-8"))


def test_h2_with_spans_joined_with_space():
    body = _body(
        '<h2><span epub:type="se:label">Chapter</span> '
        '<span epub:type="z3998:roman">I</span></h2>'
        "<p>Some text.</p>"
    )
    assert extract_section_title(body) == "Chapter I"


def test_h1_plain_text_no_spans():
    body = _body("<h1>The Happy Prince</h1><p>Some text.</p>")
    assert extract_section_title(body) == "The Happy Prince"


def test_prefers_first_heading_level_found_h1_before_h2():
    body = _body("<h1>Main Title</h1><h2>Subtitle</h2><p>Text.</p>")
    assert extract_section_title(body) == "Main Title"


def test_falls_back_to_h2_when_no_h1():
    body = _body("<h2>Letter I</h2><p>Text.</p>")
    assert extract_section_title(body) == "Letter I"


def test_no_heading_returns_none_not_fabricated():
    body = _body("<p>No heading here.</p>")
    assert extract_section_title(body) is None


def test_title_read_before_remove_headings_and_notes_strips_it():
    """Doğru kullanım sırası: extract_section_title ÖNCE, sonra
    remove_headings_and_notes. Ters sırada çağrılırsa (eski bug) None
    döner — bu test doğru sırayı belgeler."""
    body = _body("<h2>Chapter III</h2><p>Text.</p>")
    title = extract_section_title(body)
    remove_headings_and_notes(body)
    assert title == "Chapter III"
    assert body.find(".//x:h2", _NSMAP) is None
