"""dc:creator seçim mantığının birim testleri (bkz. epub/parser.py
_find_author_creator/_find_file_as) — Wikidata bug'ının kök nedeni:
birden fazla dc:creator varken (yazar + illüstratör/çevirmen) ilkini
körü körüne almak yanlış kişiyi Wikidata'ya sorgulatabiliyordu."""

from __future__ import annotations

from lxml import etree

from src.epub.parser import _parse_metadata

_OPF_HEADER = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:opf="http://www.idpf.org/2007/opf"
         version="3.0" unique-identifier="uid">
  <metadata>
    <dc:title>Test Book</dc:title>
"""
_OPF_FOOTER = """
  </metadata>
</package>
"""


def _parse(opf_body: str) -> dict[str, str | None]:
    xml = _OPF_HEADER + opf_body + _OPF_FOOTER
    root = etree.fromstring(xml.encode("utf-8"))
    return _parse_metadata(root)


def test_single_creator_used_as_is():
    result = _parse('<dc:creator>Jack London</dc:creator>')
    assert result["creator"] == "Jack London"
    assert result["creator_file_as"] is None


def test_epub2_style_role_and_file_as_attributes():
    result = _parse(
        '<dc:creator opf:role="aut" opf:file-as="London, Jack">Jack London</dc:creator>'
    )
    assert result["creator"] == "Jack London"
    assert result["creator_file_as"] == "London, Jack"


def test_multiple_creators_epub2_role_picks_author_not_illustrator():
    result = _parse(
        '<dc:creator opf:role="ill">An Illustrator</dc:creator>'
        '<dc:creator opf:role="aut" opf:file-as="London, Jack">Jack London</dc:creator>'
    )
    assert result["creator"] == "Jack London"
    assert result["creator_file_as"] == "London, Jack"


def test_multiple_creators_epub3_style_role_meta_picks_author():
    result = _parse(
        '<dc:creator id="illustrator">An Illustrator</dc:creator>'
        '<meta property="role" refines="#illustrator" scheme="marc:relators">ill</meta>'
        '<dc:creator id="author">Jack London</dc:creator>'
        '<meta property="role" refines="#author" scheme="marc:relators">aut</meta>'
        '<meta property="file-as" refines="#author">London, Jack</meta>'
    )
    assert result["creator"] == "Jack London"
    assert result["creator_file_as"] == "London, Jack"


def test_multiple_creators_no_role_marker_falls_back_to_first():
    # Hiçbir rol işaretlenmemişse eski davranış: ilk dc:creator (geriye
    # dönük uyumluluk — role bilgisi olmayan eski EPUB'lar için).
    result = _parse(
        "<dc:creator>First Person</dc:creator><dc:creator>Second Person</dc:creator>"
    )
    assert result["creator"] == "First Person"


def test_two_authors_both_marked_aut_appear_in_all_authors():
    """June Moon bug'ı: Ring Lardner VE George S. Kaufman ikisi de
    opf:role="aut" ile ayrı dc:creator elementleri. Eski kod (tek
    _find_author_creator seçimi) ikinci yazarı sessizce düşürüyordu —
    all_authors ikisini de taşımalı."""
    result = _parse(
        '<dc:creator id="author-1">Ring Lardner</dc:creator>'
        '<meta property="role" refines="#author-1" scheme="marc:relators">aut</meta>'
        '<dc:creator id="author-2">George S. Kaufman</dc:creator>'
        '<meta property="role" refines="#author-2" scheme="marc:relators">aut</meta>'
    )
    assert result["creator"] == "Ring Lardner"
    assert result["all_authors"] == ["Ring Lardner", "George S. Kaufman"]


def test_single_creator_all_authors_contains_just_that_one():
    result = _parse('<dc:creator>Jack London</dc:creator>')
    assert result["all_authors"] == ["Jack London"]


def test_epub2_role_multiple_authors_in_all_authors():
    result = _parse(
        '<dc:creator opf:role="aut">Author One</dc:creator>'
        '<dc:creator opf:role="aut">Author Two</dc:creator>'
        '<dc:creator opf:role="ill">An Illustrator</dc:creator>'
    )
    assert result["all_authors"] == ["Author One", "Author Two"]


def test_translators_marked_trl_on_contributor_are_collected():
    """Standard Ebooks'ta çevirmenler dc:creator değil dc:contributor,
    opf:role="trl" ile (bkz. Kafka "The Castle": Willa Muir + Edwin
    Muir). all_authors bunları içermemeli, all_translators içermeli."""
    result = _parse(
        '<dc:creator id="author">Franz Kafka</dc:creator>'
        '<meta property="role" refines="#author" scheme="marc:relators">aut</meta>'
        '<dc:contributor id="translator-1">Willa Muir</dc:contributor>'
        '<meta property="role" refines="#translator-1" scheme="marc:relators">trl</meta>'
        '<dc:contributor id="translator-2">Edwin Muir</dc:contributor>'
        '<meta property="role" refines="#translator-2" scheme="marc:relators">trl</meta>'
        '<dc:contributor id="editor">Max Brod</dc:contributor>'
        '<meta property="role" refines="#editor" scheme="marc:relators">edt</meta>'
    )
    assert result["all_authors"] == ["Franz Kafka"]
    assert result["all_translators"] == ["Willa Muir", "Edwin Muir"]


def test_no_translators_gives_empty_list():
    result = _parse('<dc:creator>Jack London</dc:creator>')
    assert result["all_translators"] == []
