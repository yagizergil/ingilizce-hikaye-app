"""June Moon bug'ının regresyon testleri: bir kitabın BİRDEN FAZLA
opf:role="aut" dc:creator'ı olduğunda (ör. Ring Lardner + George S.
Kaufman), telif (copyright) gate'i TÜM yazarların ölüm yılını dikkate
almalı, sadece ilkini değil. Bu testler AĞSIZ — wikidata.py'ye hiç
dokunmaz, sadece parser.py (all_authors çıkarımı) + wikidata.py
(combine_death_years) + validator.py (validate_author_death_year)
zincirinin uçtan uca doğru gate'lediğini doğrular."""

from __future__ import annotations

from lxml import etree

from src.epub.parser import _parse_metadata
from src.validator import load_thresholds, validate_author_death_year
from src.wikidata import combine_death_years

_OPF_HEADER = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:opf="http://www.idpf.org/2007/opf"
         version="3.0" unique-identifier="uid">
  <metadata>
    <dc:title>June Moon</dc:title>
"""
_OPF_FOOTER = """
  </metadata>
</package>
"""

_JUNE_MOON_LIKE_OPF = (
    '<dc:creator id="author-1">Ring Lardner</dc:creator>'
    '<meta property="role" refines="#author-1" scheme="marc:relators">aut</meta>'
    '<dc:creator id="author-2">George S. Kaufman</dc:creator>'
    '<meta property="role" refines="#author-2" scheme="marc:relators">aut</meta>'
)


def _parse_metadata_from_opf(opf_body: str) -> dict:
    xml = _OPF_HEADER + opf_body + _OPF_FOOTER
    root = etree.fromstring(xml.encode("utf-8"))
    return _parse_metadata(root)


def test_june_moon_like_book_extracts_both_authors():
    metadata = _parse_metadata_from_opf(_JUNE_MOON_LIKE_OPF)
    assert metadata["all_authors"] == ["Ring Lardner", "George S. Kaufman"]


def test_june_moon_like_book_rejected_even_though_primary_author_is_fine():
    """Ring Lardner (öl. 1933) tek başına gate'i geçer (1933 <= 1956),
    ama George S. Kaufman (öl. 1961) geçmez. Sadece ilk yazarı kontrol
    eden eski davranış bu kitabı YANLIŞLIKLA published yapardı. Doğru
    davranış: efektif yıl (en geç ölen) = 1961, kitap needs_review'a
    düşmeli (validate_author_death_year reddetmeli)."""
    thresholds = load_thresholds()

    # Primary author (Lardner) tek başına -> geçerdi (yanlış sonuç).
    primary_only_reasons = validate_author_death_year(1933, thresholds)
    assert primary_only_reasons == []

    # Doğru davranış: TÜM yazarların ölüm yılları çözülüp en yükseği
    # alınır (combine_death_years, wikidata.py) -> 1961 -> reddedilir.
    effective_year = combine_death_years([1933, 1961])
    assert effective_year == 1961
    reasons = validate_author_death_year(effective_year, thresholds)
    assert reasons, "1961'de ölen bir katkıcı olan kitap kabul edilmemeli"
    assert "public domain değil" in reasons[0]


def test_translator_death_year_included_in_gate_when_present():
    """Çevirmen (marc:trl) varsa aynı gate'e dahil edilir — bkz.
    cli.py extract() ve wikidata.combine_death_years. NOT: çevirmenin
    telif süresinin yazarınkiyle AYNI kuralla (ölüm+70) gate'lenmesinin
    hukuki doğruluğu doğrulanmadı, bu ürün sahibi tarafından ayrıca
    gözden geçirilmeli (bkz. görev raporu)."""
    thresholds = load_thresholds()
    author_year = 1924
    translator_year = 1980
    effective_year = combine_death_years([author_year, translator_year])
    assert effective_year == 1980
    reasons = validate_author_death_year(effective_year, thresholds)
    assert reasons


def test_all_resolved_and_within_limit_passes():
    thresholds = load_thresholds()
    effective_year = combine_death_years([1900, 1933, 1940])
    assert effective_year == 1940
    reasons = validate_author_death_year(effective_year, thresholds)
    assert reasons == []


def test_is_original_books_skip_author_death_year_check_entirely():
    """Task 6.4: is_original=True (orijinal/LLM üretimi içerik, bkz.
    src/markdown/parser.py) telif (author_death_year) kontrolünden
    TAMAMEN muaf olmalı — cli.py'nin validate() komutu bu kontrolü hiç
    ÇAĞIRMAZ (bkz. cli.py: `if not extracted.meta.is_original:` guard'ı).
    Burada is_original=True bir BookMeta ile extract_markdown'ın ürettiği
    meta'nın author_death_year'ı hiç set edilmediğini (None kaldığını)
    ve author_death_year=None normalde validate_author_death_year'ı
    reddettirdiğini ama cli.py akışının bu fonksiyonu is_original=True
    için hiç çağırmadığını doğrular."""
    import tempfile

    from src.markdown.parser import extract_markdown
    from src.validator import load_thresholds, validate_author_death_year

    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(
            "---\ntitle: Original Story\nauthor: AI Author\ntarget_level: A2\n---\n\n"
            "# Chapter\n\nThis is a short original story paragraph.\n"
        )
        path = f.name

    book = extract_markdown(path, "original-story")

    assert book.meta.is_original is True
    # author_death_year hiç set edilmedi -> None. EPUB path'inde bu,
    # validate_author_death_year tarafından REDDEDİLİRDİ (aşağıda
    # doğrulanıyor) — ama cli.py validate() komutu is_original=True için
    # bu fonksiyonu hiç çağırmıyor, bu yüzden published bir kitabın
    # author_death_year=None olması is_original=True'da SORUN DEĞİL.
    thresholds = load_thresholds()
    reasons_if_checked = validate_author_death_year(book.meta.author_death_year, thresholds)
    assert reasons_if_checked, (
        "author_death_year=None normalde reddedilir — is_original=True kitaplar için "
        "cli.py bu kontrolü hiç ÇAĞIRMADIĞI için bu red hiç uygulanmaz (bkz. cli.py validate())"
    )


def test_any_unresolved_author_forces_needs_review():
    """Bir katkıcının ölüm yılı hiç çözülemezse (ne Wikidata ne
    override) efektif yıl None olmalı -> validate_author_death_year
    'belirlenemedi' sebebiyle reddeder (needs_review)."""
    thresholds = load_thresholds()
    effective_year = combine_death_years([1933, None])
    assert effective_year is None
    reasons = validate_author_death_year(effective_year, thresholds)
    assert reasons
    assert "belirlenemedi" in reasons[0]
