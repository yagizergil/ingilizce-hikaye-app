from __future__ import annotations

import os
import zipfile
from pathlib import Path

import pytest
from lxml import etree

from src.epub.parser import _parse_metadata, _read_container_opf_path
from src.normalize import load_normalization_maps
from src.profiler import load_cefr_vocabulary, load_spacy_model

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "network: gerçek ağ çağrısı yapar (ör. Wikidata) — RUN_NETWORK_TESTS=1 gerekir",
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if os.environ.get("RUN_NETWORK_TESTS") == "1":
        return
    skip_network = pytest.mark.skip(
        reason="gerçek ağ çağrısı yapar — çalıştırmak için RUN_NETWORK_TESTS=1 pytest"
    )
    for item in items:
        if "network" in item.keywords:
            item.add_marker(skip_network)


@pytest.fixture(scope="session")
def norm_maps():
    return load_normalization_maps()


@pytest.fixture(scope="session")
def cefr_vocab():
    return load_cefr_vocabulary()


@pytest.fixture(scope="session")
def nlp():
    try:
        return load_spacy_model()
    except RuntimeError as exc:
        pytest.skip(str(exc))


def _epub_title(path: Path) -> str:
    with zipfile.ZipFile(path) as zf:
        opf_path = _read_container_opf_path(zf)
        opf_root = etree.fromstring(zf.read(opf_path))
        metadata = _parse_metadata(opf_root)
    return (metadata.get("title") or "").lower()


def _find_fixture_by_title(keyword: str, book_label: str) -> Path:
    """tests/fixtures/*.epub içinden dc:title'ı `keyword` içeren dosyayı
    bulur. Dosya adı SABİT değil — Standard Ebooks kitaba göre farklı
    ayraç/isimlendirme kullanabiliyor (örn.
    mary-shelley_frankenstein.epub, alt çizgili; başka bir kitapta
    tireli olabilir). Bu yüzden isme göre değil, EPUB içindeki gerçek
    dc:title metadata'sına göre eşleştirilir."""
    if not FIXTURES_DIR.exists():
        pytest.skip(f"{FIXTURES_DIR} yok.")

    candidates = sorted(FIXTURES_DIR.glob("*.epub"))
    if not candidates:
        pytest.skip(
            f"pipeline/tests/fixtures/ altında hiç .epub yok. {book_label} EPUB'ını "
            "Standard Ebooks'tan elle indirip oraya koy (bu repo'da içerik "
            "dosyaları tutulmaz, sadece pipeline kodu)."
        )

    for path in candidates:
        try:
            title = _epub_title(path)
        except Exception:  # noqa: BLE001 - bozuk/ilgisiz bir epub varsa atla
            continue
        if keyword in title:
            return path

    pytest.skip(
        f"pipeline/tests/fixtures/ altında {len(candidates)} .epub var "
        f"({', '.join(p.name for p in candidates)}) ama hiçbirinin dc:title'ı "
        f"'{keyword}' içermiyor. {book_label} EPUB'ını ekle."
    )
    raise AssertionError("unreachable")  # pytest.skip zaten burada exception fırlatır


@pytest.fixture
def frankenstein_epub() -> Path:
    return _find_fixture_by_title("frankenstein", "Frankenstein")


@pytest.fixture
def gullibles_travels_epub() -> Path:
    # DİKKAT: "Gullible's Travels" (Ring Lardner) — "Gulliver's Travels"
    # (Jonathan Swift) DEĞİL, farklı bir kitap. Kelime benzerliği
    # yanıltıcı, gerçek dc:title "Gullible's Travels".
    return _find_fixture_by_title("gullible", "Gullible's Travels")
