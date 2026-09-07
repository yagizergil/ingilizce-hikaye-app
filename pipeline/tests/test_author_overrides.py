from __future__ import annotations

from src.author_overrides import find_author_override, load_author_overrides
from src.validator import load_thresholds, validate_author_death_year


def test_mary_shelley_matches_full_epub_name():
    overrides = load_author_overrides()
    year = find_author_override("Mary Wollstonecraft Shelley", overrides)
    assert year == 1851


def test_ring_lardner():
    overrides = load_author_overrides()
    assert find_author_override("Ring Lardner", overrides) == 1933


def test_jane_austen():
    overrides = load_author_overrides()
    assert find_author_override("Jane Austen", overrides) == 1817


def test_alexandre_dumas():
    overrides = load_author_overrides()
    assert find_author_override("Alexandre Dumas", overrides) == 1870


def test_marcus_aurelius():
    overrides = load_author_overrides()
    assert find_author_override("Marcus Aurelius", overrides) == 180


def test_homer_ancient_author_treated_as_pre_1956():
    overrides = load_author_overrides()
    year = find_author_override("Homer", overrides)
    assert year is not None
    assert year < 1956

    thresholds = load_thresholds()
    reasons = validate_author_death_year(year, thresholds)
    assert reasons == []


def test_unknown_author_returns_none():
    overrides = load_author_overrides()
    assert find_author_override("Some Unknown Modern Author", overrides) is None
