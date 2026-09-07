"""wikidata.py'nin 403/429/cache mantığının AĞSIZ (mock'lu) birim
testleri — her `pytest` çalıştırmasında koşar (network marker YOK)."""

from __future__ import annotations

import json

import httpx
import pytest

from src import wikidata
from src.wikidata import WikidataBlockedError, combine_death_years, lookup_author_death_year


class _FakeResponse:
    def __init__(
        self,
        status_code: int,
        json_data: dict | None = None,
        headers: dict | None = None,
    ):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.headers = headers or {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(  # type: ignore[arg-type]
                "error", request=None, response=self
            )

    def json(self) -> dict:
        return self._json_data


@pytest.fixture(autouse=True)
def _isolated_cache(monkeypatch, tmp_path):
    monkeypatch.setattr(wikidata, "_cache", None)
    monkeypatch.setattr(wikidata, "_CACHE_PATH", tmp_path / "wikidata_cache.json")
    # Testlerde gerçek 1 saniyelik bekleme olmasın.
    monkeypatch.setattr(wikidata, "_MIN_REQUEST_INTERVAL", 0.0)
    monkeypatch.setattr(wikidata.time, "sleep", lambda _seconds: None)


def test_403_raises_blocked_error(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _FakeResponse(403))
    with pytest.raises(WikidataBlockedError, match="403"):
        lookup_author_death_year("Jack London")


def test_429_retries_then_succeeds(monkeypatch):
    responses = [
        _FakeResponse(429, headers={"Retry-After": "0"}),
        _FakeResponse(200, {"search": [{"id": "Q45765"}]}),
        _FakeResponse(
            200,
            {
                "entities": {
                    "Q45765": {
                        "claims": {
                            "P31": [{"mainsnak": {"datavalue": {"value": {"id": "Q5"}}}}]
                        }
                    }
                }
            },
        ),
    ]

    def fake_get(*args, **kwargs):
        return responses.pop(0)

    monkeypatch.setattr(httpx, "get", fake_get)
    result = lookup_author_death_year("Jack London")
    # P570 claim'i bu senaryoda yok -> None döner, ama asıl kontrol ettiğimiz
    # şey 429'un exception fırlatmadan retry edilmesi.
    assert result is None
    assert responses == []


def test_429_gives_up_after_max_retries(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _FakeResponse(429))
    result = lookup_author_death_year("Jack London")
    assert result is None


def test_cache_hit_skips_network(monkeypatch):
    call_count = 0

    def fake_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return _FakeResponse(200, {"search": [{"id": "Q45765"}]})

    monkeypatch.setattr(httpx, "get", fake_get)

    wikidata._load_cache()["Jack London"] = 1916
    result = lookup_author_death_year("Jack London")

    assert result == 1916
    assert call_count == 0


def test_cache_persists_to_disk(monkeypatch, tmp_path):
    def fake_get(*args, **kwargs):
        params = kwargs.get("params", {})
        if params.get("action") == "wbsearchentities":
            return _FakeResponse(200, {"search": [{"id": "Q45765"}]})
        return _FakeResponse(
            200,
            {
                "entities": {
                    "Q45765": {
                        "claims": {
                            "P31": [{"mainsnak": {"datavalue": {"value": {"id": "Q5"}}}}],
                            "P570": [
                                {
                                    "mainsnak": {
                                        "datavalue": {"value": {"time": "+1916-11-22T00:00:00Z"}}
                                    }
                                }
                            ],
                        }
                    }
                }
            },
        )

    monkeypatch.setattr(httpx, "get", fake_get)

    result = lookup_author_death_year("Jack London")
    assert result == 1916

    with open(wikidata._CACHE_PATH, encoding="utf-8") as f:
        saved = json.load(f)
    assert saved == {"Jack London": 1916}


def test_human_verification_rejects_non_human_entity(monkeypatch):
    def fake_get(*args, **kwargs):
        params = kwargs.get("params", {})
        if params.get("action") == "wbsearchentities":
            return _FakeResponse(200, {"search": [{"id": "Q999"}]})
        # P31 hiç Q5 değil (insan değil) -> P570 varsa bile kullanılmamalı.
        return _FakeResponse(
            200,
            {
                "entities": {
                    "Q999": {
                        "claims": {
                            "P31": [
                                {"mainsnak": {"datavalue": {"value": {"id": "Q191067"}}}}
                            ],  # article
                            "P570": [
                                {
                                    "mainsnak": {
                                        "datavalue": {"value": {"time": "+1900-01-01T00:00:00Z"}}
                                    }
                                }
                            ],
                        }
                    }
                }
            },
        )

    monkeypatch.setattr(httpx, "get", fake_get)
    result = lookup_author_death_year("Some Ambiguous Name")
    assert result is None


def test_combine_death_years_takes_latest_when_all_resolved():
    """June Moon senaryosu: Ring Lardner (öl. 1933) + George S. Kaufman
    (öl. 1961) -> efektif yıl en YÜKSEK olan (1961), telif süresi en
    geç ölen katkıcıya göre hesaplanır."""
    assert combine_death_years([1933, 1961]) == 1961


def test_combine_death_years_single_author():
    assert combine_death_years([1916]) == 1916


def test_combine_death_years_any_unresolved_gives_none():
    """Bir katkıcının ölüm yılı bile çözülemezse efektif yıl None'dır
    (needs_review'a düşer) — diğer katkıcıların yılları bilinse bile."""
    assert combine_death_years([1933, None]) is None
    assert combine_death_years([None, None]) is None
    assert combine_death_years([None]) is None


def test_combine_death_years_empty_list_gives_none():
    assert combine_death_years([]) is None
